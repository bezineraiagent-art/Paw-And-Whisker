import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { build } from "esbuild";
import express from "express";

process.env.SESSION_SECRET = "phase5-isolated-session-fixture";
process.env.ANALYTICS_ADMIN_TOKEN = "phase5-isolated-admin-fixture";
process.env.NODE_ENV = "production";
process.env.LOG_LEVEL = "silent";
const prefix = `qa-phase5-${Date.now()}`;
const temporary = await mkdtemp("/tmp/paw-phase5-tests-");
const bundled = await build({ stdin: { contents: `
  export * from "./src/lib/ai-budget";
  export * from "./src/lib/request-limits";
  export * from "./src/lib/client-ip";
  export * from "./src/lib/urgency";
  export {createCompanionRouter} from "./src/routes/companion";
  export {default as subscribersRouter} from "./src/routes/subscribers";
  export {default as app} from "./src/app";
  export {db,pool,subscribers,answerReports} from "@workspace/db";
`, resolveDir: new URL("../", import.meta.url).pathname, loader: "ts" }, bundle: true, platform: "node", format: "cjs", write: false, external: ["pg-native"] });
await writeFile(`${temporary}/fixture.cjs`, bundled.outputFiles[0].contents);
const api = createRequire(import.meta.url)(`${temporary}/fixture.cjs`);
const servers = [];
const savedEmails = [];
async function serve(app) {
  const server = app.listen(0, "127.0.0.1"); servers.push(server);
  await new Promise(r => server.once("listening", r));
  return `http://127.0.0.1:${server.address().port}`;
}
const post = (base, path, body, cookie) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
const log = { info() {}, warn() {}, error() {} };
function fixture() { const app = express(); app.use(express.json({ limit: "4mb" })); app.use((req, _res, next) => { req.log = log; next(); }); return app; }
const ns = tag => `${prefix}-${tag}`;
after(async () => {
  await api.pool.query("DELETE FROM usage_counters WHERE key LIKE $1", [`${prefix}%`]);
  // Middleware's hashed fixture-IP rows contain no real user keys.
  for (const scope of ["subscriber", "waitlist", "answer-report"]) {
    await api.pool.query("DELETE FROM usage_counters WHERE key LIKE $1 AND key LIKE $2", [`${scope}:%`, `%:${api.anonymousKey("127.0.0.1")}`]);
  }
  for (const email of savedEmails) {
    await api.pool.query("DELETE FROM subscribers WHERE email=$1", [email]);
    await api.pool.query("DELETE FROM answer_reports WHERE email=$1", [email]);
  }
  for (const server of servers) await new Promise(r => server.close(r));
  await api.pool.end(); await rm(temporary, { recursive: true });
});

test("daily global cap is atomic across visitors and counts photos at 3x", async () => {
  process.env.AI_DAILY_REQUEST_CAP = "7"; process.env.AI_PER_IP_DAILY_LIMIT = "99";
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => api.reserveAI(`visitor-${i}`, `fixture-${i}`, true, new Date(), ns("weighted"))));
  assert.equal(results.filter(r => r.ok).length, 2);
  assert.equal((await api.reserveAI("final", "final", false, new Date(), ns("weighted"))).ok, true);
  assert.equal((await api.reserveAI("over", "over", false, new Date(), ns("weighted"))).reason, "global");
  const { rows } = await api.pool.query("SELECT count FROM usage_counters WHERE key=$1", [api.budgetKeys("", "", new Date(), ns("weighted")).global]);
  assert.equal(rows[0].count, 7);
  delete process.env.AI_DAILY_REQUEST_CAP;
  assert.equal(api.dailyLimit("AI_DAILY_REQUEST_CAP", 400), 400);
});
test("cookie resets cannot bypass persisted per-IP daily cap", async () => {
  process.env.AI_DAILY_REQUEST_CAP = "400"; process.env.AI_PER_IP_DAILY_LIMIT = "3";
  for (let i = 0; i < 3; i++) assert.equal((await api.reserveAI(`new-cookie-${i}`, "same-fixture-ip", false, new Date(), ns("ip"))).ok, true);
  const denied = await api.reserveAI("fresh-cookie", "same-fixture-ip", false, new Date(), ns("ip"));
  assert.equal(denied.reason, "ip");
  assert.equal((await api.reserveAI("other", "different-fixture-ip", false, new Date(), ns("ip"))).ok, true);
});
test("cookie allowance remains two, UTC day rollover restores allowances", async () => {
  process.env.AI_PER_IP_DAILY_LIMIT = "6";
  const now = new Date("2040-01-01T23:59:00Z");
  for (let i = 0; i < 2; i++) assert.equal((await api.reserveAI("same", "same", false, now, ns("cookie"))).ok, true);
  assert.equal((await api.reserveAI("same", "same", false, now, ns("cookie"))).reason, "cookie");
  assert.equal((await api.reserveAI("same", "same", false, new Date("2040-01-02T00:00:00Z"), ns("cookie"))).ok, true);
});
test("upstream failures refund visitor quotas but retain global cost units", async () => {
  const r = await api.reserveAI("visitor", "ip", true, new Date(), ns("refund"));
  await api.refundVisitor(r.keys);
  const { rows } = await api.pool.query("SELECT key,count FROM usage_counters WHERE key=ANY($1::text[])", [[r.keys.global, r.keys.cookie, r.keys.ip]]);
  assert.equal(rows.find(x => x.key === r.keys.global).count, 3);
  assert.equal(rows.find(x => x.key === r.keys.ip).count, 0);
});
test("rate limits are shared by independent middleware instances, not memory", async () => {
  const app = fixture();
  app.get("/first", api.requestLimit(1, 60000, ns("restart")), (_r, res) => res.json({ ok: true }));
  app.get("/second", api.requestLimit(1, 60000, ns("restart")), (_r, res) => res.json({ ok: true }));
  const base = await serve(app);
  assert.equal((await fetch(base + "/first")).status, 200);
  assert.equal((await fetch(base + "/second")).status, 429);
  const { rows } = await api.pool.query("SELECT key FROM usage_counters WHERE key LIKE $1", [`${ns("restart")}%`]);
  assert.ok(!JSON.stringify(rows).includes("127.0.0.1"));
});
test("trusted proxy traversal ignores forged Cloudflare headers and untrusted XFF prefixes", async () => {
  const app = fixture(); app.set("trust proxy", api.createProxyTrust());
  app.use((req, _res, next) => {
    Object.defineProperty(req.socket, "remoteAddress", { configurable: true, value: req.headers["x-fixture-peer"] }); next();
  });
  app.get("/ip", (req, res) => res.json({ ip: req.ip }));
  const base = await serve(app);
  const get = headers => fetch(base + "/ip", { headers }).then(r => r.json());
  assert.equal((await get({ "x-fixture-peer": "203.0.113.9", "x-forwarded-for": "1.1.1.1", "cf-connecting-ip": "1.1.1.1" })).ip, "203.0.113.9");
  assert.equal((await get({ "x-fixture-peer": "172.24.0.1", "x-forwarded-for": "1.1.1.1, 203.0.113.8, 104.16.0.1", "cf-connecting-ip": "1.1.1.1" })).ip, "203.0.113.8");
});
test("structured urgency is conservative when missing, malformed, or emergency signs are present", () => {
  assert.equal(api.normalizeAnswer('{"answer":"Ask a vet"}', "unclear").urgency, "today");
  assert.equal(api.normalizeAnswer('{"answer":"Rest","urgency":"monitor"}', "My cat cannot urinate").urgency, "emergency");
  assert.equal(api.normalizeAnswer('{"answer":"Rest"}', "My kitten cannot pee").urgency, "emergency");
  assert.equal(api.normalizeAnswer('{"answer":"Rest","urgency":"monitor"}', "My dog is struggling to breathe").urgency, "emergency");
  assert.equal(api.normalizeAnswer('{"urgency":"monitor"}', "unclear").urgency, "today");
  assert.equal(api.normalizeAnswer("Call a vet", "unclear").urgency, "today");
});
test("companion validates profile, returns urgency, persists no question/profile, and caps before AI", async () => {
  process.env.AI_PER_IP_DAILY_LIMIT = "6"; process.env.AI_DAILY_REQUEST_CAP = "1";
  const calls = [];
  const app = fixture(); app.use(api.createCompanionRouter(async input => { calls.push(input); return JSON.stringify({ answer: "Milo is 3 years old. AI cannot diagnose.", urgency: "monitor" }); }, ns("http")));
  const base = await serve(app), question = `Test ${prefix} question`;
  const pet = { name: "Milo", species: "cat", age: "3 years", weight: "4 kg", breed: "Tabby", allergies: "none known", conditions: "none known" };
  assert.equal((await post(base, "/companion/message", { question, pet: { ...pet, allergies: "x".repeat(301) } })).status, 400);
  const good = await post(base, "/companion/message", { question, pet });
  assert.equal(good.status, 200); assert.equal((await good.json()).urgency, "monitor");
  assert.deepEqual(calls[0].pet, pet);
  const capped = await post(base, "/companion/message", { question, pet });
  assert.equal(capped.status, 429); assert.match((await capped.json()).error, /reached today's free limit/);
  assert.equal(calls.length, 1);
  assert.equal((await api.pool.query("SELECT id FROM messages WHERE content=$1", [question])).rowCount, 0);
  process.env.AI_DAILY_REQUEST_CAP = "400";
});
test("waitlist validates consent/honeypot and saves idempotently in existing subscribers", async () => {
  const app = fixture(); app.use(api.subscribersRouter); const base = await serve(app);
  const email = `${prefix}@example.invalid`; savedEmails.push(email);
  const input = { email, consent: true, fax: "" };
  assert.equal((await post(base, "/waitlist", { ...input, consent: false })).status, 400);
  assert.equal((await post(base, "/waitlist", { ...input, fax: "spam" })).status, 400);
  assert.equal((await post(base, "/waitlist", input)).status, 201);
  assert.equal((await post(base, "/waitlist", input)).status, 201);
  const { rows } = await api.pool.query("SELECT source FROM subscribers WHERE email=$1", [email]);
  assert.deepEqual(rows, [{ source: "plus-waitlist" }]);
});
test("wrong-answer reports store email/message for manual review only", async () => {
  const app = fixture(); app.use(api.subscribersRouter); const base = await serve(app);
  const email = `${prefix}-report@example.invalid`; savedEmails.push(email);
  const r = await post(base, "/answer-reports", { email, message: "Please review this incorrect answer.", consent: true });
  assert.equal(r.status, 201); assert.match((await r.json()).message, /No email was sent/);
  assert.equal((await api.pool.query("SELECT id FROM answer_reports WHERE email=$1", [email])).rowCount, 1);
});
test("legacy API methods return 410, security headers exist and body limits reject oversized submissions", async () => {
  const base = await serve(api.app);
  for (const [path, method] of [["/api/openai/conversations", "POST"], ["/api/openai/conversations/1", "DELETE"], ["/api/openai/conversations/1/messages", "GET"], ["/api/openai/conversations/1/messages", "POST"]]) {
    const r = await fetch(base + path, { method }); assert.equal(r.status, 410);
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(r.headers.get("permissions-policy"), "geolocation=(self), camera=(), microphone=(), payment=()");
  }
  assert.equal((await post(base, "/api/companion/message", { question: "Photo", imageDataUrl: "x".repeat(4_194_305) })).status, 413);
  assert.equal((await post(base, "/api/waitlist", { email: "x".repeat(25_000) })).status, 413);
  // Local tools and vet search have no AI-budget middleware; public health stays up.
  process.env.AI_DAILY_REQUEST_CAP = "0";
  assert.equal((await fetch(base + "/api/healthz")).status, 200);
});