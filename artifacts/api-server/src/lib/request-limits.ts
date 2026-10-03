import { createHmac } from "node:crypto";
import { db, usageCounters } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export function anonymousKey(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for anonymous limits");
  return createHmac("sha256", secret).update(value).digest("hex");
}
// Atomic UPSERT in PostgreSQL: survives restarts and is shared across replicas.
export function requestLimit(limit: number, windowMs = 60_000, scope = `rate-${limit}`) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = Date.now(), bucket = Math.floor(now / windowMs);
      const expiresAt = new Date((bucket + 1) * windowMs);
      const key = `${scope}:${bucket}:${anonymousKey(req.ip ?? req.socket.remoteAddress ?? "unknown")}`;
      const result = await db.execute(sql`
        insert into usage_counters(key, count, expires_at) values (${key}, 1, ${expiresAt})
        on conflict(key) do update set count = usage_counters.count + 1
        where usage_counters.count < ${limit} returning count`);
      if (!result.rows.length) {
        res.setHeader("Retry-After", Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)));
        res.status(429).json({ error: "Too many requests. Please wait a minute and try again." }); return;
      }
      // Small bounded cleanup; no visitor content or raw IPs are stored.
      if (bucket % 5 === 0) await db.execute(sql`delete from usage_counters where key in (select key from usage_counters where expires_at < now() limit 100)`);
      next();
    } catch {
      req.log.error("Rate limiter unavailable; no visitor identifiers logged");
      res.status(503).json({ error: "The service is temporarily unavailable. Please try again shortly." });
    }
  };
}