import { db, usageCounters } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";
import { anonymousKey } from "./request-limits";

export const COOKIE_LIMIT = 2;
export function dailyLimit(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error(`${name} must be a nonnegative integer`);
  return Number(raw);
}
export function budgetKeys(session: string, ip: string, now = new Date(), namespace = "ai") {
  const day = now.toISOString().slice(0, 10);
  return {
    global: `${namespace}:global:${day}`,
    cookie: `${namespace}:cookie:${day}:${anonymousKey(session)}`,
    ip: `${namespace}:ip:${day}:${anonymousKey(ip)}`,
    resetsAt: new Date(`${day}T00:00:00Z`).getTime() + 86400000,
  };
}
export async function reserveAI(session: string, ip: string, photo: boolean, now = new Date(), namespace = "ai") {
  const keys = budgetKeys(session, ip, now, namespace), weight = photo ? 3 : 1;
  return db.transaction(async tx => {
    // One daily lock covers all three counters, even on multiple API instances.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${keys.global}))`);
    const rows = await tx.select().from(usageCounters).where(inArray(usageCounters.key, [keys.global, keys.ip, keys.cookie]));
    const count = (key: string) => rows.find(r => r.key === key)?.count ?? 0;
    if (count(keys.global) + weight > dailyLimit("AI_DAILY_REQUEST_CAP", 400)) return { ok: false as const, reason: "global" as const };
    if (count(keys.ip) >= dailyLimit("AI_PER_IP_DAILY_LIMIT", 6)) return { ok: false as const, reason: "ip" as const };
    if (count(keys.cookie) >= COOKIE_LIMIT) return { ok: false as const, reason: "cookie" as const };
    for (const [key, amount] of [[keys.global, weight], [keys.ip, 1], [keys.cookie, 1]] as const) {
      await tx.execute(sql`insert into usage_counters(key,count,expires_at) values (${key},${amount},${new Date(keys.resetsAt)})
        on conflict(key) do update set count=usage_counters.count+${amount}`);
    }
    return { ok: true as const, keys };
  });
}
export async function refundVisitor(keys: ReturnType<typeof budgetKeys>) {
  // Retain global units: a failed upstream call may still have incurred cost.
  await db.execute(sql`update usage_counters set count=greatest(0,count-1) where key in (${keys.cookie},${keys.ip})`);
}
export async function getAIUsage(session: string, ip: string, namespace = "ai") {
  const keys = budgetKeys(session, ip, new Date(), namespace);
  const rows = await db.select().from(usageCounters).where(inArray(usageCounters.key, [keys.cookie, keys.ip]));
  const count = (key: string) => rows.find(r => r.key === key)?.count ?? 0;
  return { limit: COOKIE_LIMIT, remaining: Math.max(0, Math.min(COOKIE_LIMIT - count(keys.cookie), dailyLimit("AI_PER_IP_DAILY_LIMIT", 6) - count(keys.ip))), resetsAt: new Date(keys.resetsAt).toISOString() };
}