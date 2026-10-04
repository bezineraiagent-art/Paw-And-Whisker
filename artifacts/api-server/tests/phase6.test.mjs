import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
process.env.NODE_ENV = "production";
process.env.LOG_LEVEL = "silent";
process.env.SESSION_SECRET = "phase6-application-test-fixture";
const tmp = await mkdtemp("/tmp/paw-phase6-tests-");
const result = await build({ stdin: {
  contents: 'export {default as app} from "./src/app"; export {pool} from "@workspace/db"; export {anonymousKey} from "./src/lib/request-limits";',
  resolveDir: new URL("../", import.meta.url).pathname, loader: "ts",
}, platform: "node", format: "cjs", bundle: true, write: false, external: ["pg-native"] });
await writeFile(`${tmp}/fixture.cjs`, result.outputFiles[0].contents);
const { app, pool, anonymousKey } = createRequire(import.meta.url)(`${tmp}/fixture.cjs`);
const server = app.listen(0, "127.0.0.1");
await new Promise(r => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;
const email = `phase6-${Date.now()}@example.invalid`;
const valid = { name: "Test reviewer", email, credentials: "Fixture only", registrationBody: "Fixture board", registrationNumber: "NOT-A-REAL-LICENCE", clinic: "Test clinic", clinicWebsite: "https://example.invalid", message: "Fictional fixture for application testing.", consent: true, fax: "" };
const post = body => fetch(base + "/api/vet-reviewer-applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const resetLimit = () => pool.query("delete from usage_counters where key like $1", [`vet-reviewer-application:%:${anonymousKey("127.0.0.1")}`]);
after(async () => {
  await pool.query("delete from vet_reviewer_applications where email=$1", [email]);
  await resetLimit(); await new Promise(r => server.close(r)); await pool.end(); await rm(tmp, { recursive: true });
});
test("reviewer application validates consent, honeypot, whitespace, email and clinic URL", async () => {
  await resetLimit();
  for (const patch of [{ consent: false }, { fax: "bot" }, { name: "  " }, { email: "invalid" }, { clinicWebsite: "javascript:alert(1)" }]) {
    const r = await post({ ...valid, ...patch }); assert.equal(r.status, 400);
  }
  const rows = await pool.query("select id from vet_reviewer_applications where email=$1", [email]);
  assert.equal(rows.rowCount, 0);
});
test("reviewer application is persisted privately, normalized and has no automatic reviewer credit", async () => {
  await resetLimit();
  const r = await post({ ...valid, name: "  Test reviewer  ", email: email.toUpperCase() });
  assert.equal(r.status, 201);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const body = await r.json(); assert.equal(body.success, true); assert.ok(body.message.includes("No email was sent"));
  assert.ok(!("email" in body) && !("id" in body));
  const rows = await pool.query("select name, consent, clinic_website, registration_number from vet_reviewer_applications where email=$1", [email]);
  assert.equal(rows.rowCount, 1); assert.equal(rows.rows[0].name, "Test reviewer"); assert.equal(rows.rows[0].consent, true);
  assert.equal(rows.rows[0].registration_number, valid.registrationNumber);
  assert.equal((await fetch(base + "/api/vet-reviewer-applications")).status, 404);
});
test("reviewer applications enforce persistent five-per-minute limit", async () => {
  await resetLimit();
  // Invalid attempts still count, without adding private database records.
  for (let i = 0; i < 5; i++) assert.equal((await post({})).status, 400);
  const r = await post(valid); assert.equal(r.status, 429);
  assert.ok(r.headers.get("retry-after"));
});