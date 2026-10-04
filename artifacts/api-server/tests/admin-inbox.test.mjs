import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { build } from "esbuild";

// Isolated credentials; never read the owner's token or session secret.
process.env.ANALYTICS_ADMIN_TOKEN = `inbox-fixture-${randomUUID()}`;
process.env.SESSION_SECRET = `inbox-session-${randomUUID()}`;
process.env.NODE_ENV = "production";
process.env.LOG_LEVEL = "silent";
const token = process.env.ANALYTICS_ADMIN_TOKEN;
const temp = await mkdtemp("/tmp/inbox-api-");
const bundle = await build({ stdin: {
  contents: 'export { default as app } from "./src/app"; export {pool} from "@workspace/db"; export {anonymousKey} from "./src/lib/request-limits";',
  resolveDir: new URL("../", import.meta.url).pathname, loader: "ts",
}, bundle: true, platform: "node", format: "cjs", write: false, external: ["pg-native"] });
await writeFile(`${temp}/fixture.cjs`, bundle.outputFiles[0].contents);
const { app, pool, anonymousKey } = createRequire(import.meta.url)(`${temp}/fixture.cjs`);
const server = app.listen(0, "127.0.0.1");
await new Promise(r => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/api/admin`;
const emails = Array.from({ length: 3 }, () => `${randomUUID()}@example.invalid`);
after(async () => {
  await pool.query("DELETE FROM subscribers WHERE email=ANY($1::text[])", [emails]);
  await pool.query("DELETE FROM answer_reports WHERE email=ANY($1::text[])", [emails]);
  await pool.query("DELETE FROM usage_counters WHERE key LIKE $1", [`inbox-admin:%:${anonymousKey("127.0.0.1")}`]);
  await new Promise(r => server.close(r)); await pool.end(); await rm(temp, { recursive: true });
});
const get = (path, value = token) => fetch(base + path, { headers: value === null ? {} : { "x-admin-token": value } });
function privateHeaders(r) {
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow");
}
test("admin inbox protects records and totals, filters consent source, and paginates stably", async () => {
  for (const path of ["/waitlist", "/answer-reports"]) {
    for (const value of [null, "wrong", "x".repeat(token.length)]) {
      const r = await get(path, value); assert.equal(r.status, 401); privateHeaders(r);
      assert.deepEqual(Object.keys(await r.json()), ["error"]);
    }
    delete process.env.ANALYTICS_ADMIN_TOKEN;
    const unavailable = await get(path); assert.equal(unavailable.status, 503);
    assert.deepEqual(Object.keys(await unavailable.json()), ["error"]);
    process.env.ANALYTICS_ADMIN_TOKEN = token;
  }
  const before = await (await get("/waitlist")).json();
  const reportsBefore = await (await get("/answer-reports")).json();
  await pool.query("INSERT INTO subscribers(email,source,created_at) VALUES ($1,'plus-waitlist','2099-01-01'),($2,'plus-waitlist','2099-01-01'),($3,'pdf','2099-01-02')", emails);
  await pool.query("INSERT INTO answer_reports(email,message,created_at) VALUES ($1,$2,'2099-01-01')", [emails[0], "<script>fixture</script>\nReview only."]);
  const firstResponse = await get("/waitlist?limit=1"); privateHeaders(firstResponse);
  const first = await firstResponse.json(), second = await (await get("/waitlist?limit=1&offset=1")).json();
  assert.equal(first.total, before.total + 2);
  assert.equal(first.records.length, 1); assert.equal(first.limit, 1); assert.equal(first.offset, 0);
  assert.equal(first.records[0].email, emails[1]); assert.equal(second.records[0].email, emails[0]);
  assert.ok(Date.parse(first.records[0].createdAt));
  assert.deepEqual(Object.keys(first.records[0]).sort(), ["createdAt", "email", "id"]);
  const reports = await (await get("/answer-reports?limit=1")).json();
  assert.equal(reports.total, reportsBefore.total + 1);
  assert.equal(reports.records[0].email, emails[0]);
  assert.equal(reports.records[0].message, "<script>fixture</script>\nReview only.");
  assert.equal((await (await get("/waitlist?offset=1000000")).json()).records.length, 0);
  for (const path of ["/waitlist", "/answer-reports"]) {
    for (const query of ["limit=0", "limit=101", "offset=-1", "offset=1.5", "offset=1000001", "limit=1&limit=2", "offset=x"]) {
      const r = await get(`${path}?${query}`); assert.equal(r.status, 400); privateHeaders(r);
      assert.deepEqual(Object.keys(await r.json()), ["error"]);
    }
  }
});
test("persistent limiter denies excess attempts without leaking data", async () => {
  const key = `inbox-admin:${Math.floor(Date.now() / 60000)}:${anonymousKey("127.0.0.1")}`;
  await pool.query("INSERT INTO usage_counters(key,count,expires_at) VALUES ($1,60,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET count=60", [key]);
  const r = await get("/waitlist"); assert.equal(r.status, 429); privateHeaders(r);
  assert.ok(Number(r.headers.get("retry-after")) > 0);
  assert.deepEqual(Object.keys(await r.json()), ["error"]);
});