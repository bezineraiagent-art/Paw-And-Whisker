// Disposable local server for browser-inbox.mjs. Never uses the owner's credentials.
import express from "express";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";

process.env.NODE_ENV = "production";
process.env.PORT = "23178";
process.env.LOG_LEVEL = "silent";
process.env.ANALYTICS_ADMIN_TOKEN = "inbox-browser-isolated-fixture";
process.env.SESSION_SECRET = randomUUID();
const temporary = await mkdtemp("/tmp/inbox-browser-");
const bundled = await build({ stdin: {
  contents: 'export {default as app} from "./src/app"; export {pool} from "@workspace/db"; export {anonymousKey} from "./src/lib/request-limits";',
  resolveDir: new URL("../", import.meta.url).pathname, loader: "ts",
}, bundle: true, platform: "node", format: "cjs", write: false, external: ["pg-native"] });
await writeFile(`${temporary}/fixture.cjs`, bundled.outputFiles[0].contents);
const { app, pool, anonymousKey } = createRequire(import.meta.url)(`${temporary}/fixture.cjs`);
const tag = randomUUID();
const emails = [`inbox-waitlist-${tag}@example.invalid`, `inbox-report-${tag}@example.invalid`, `inbox-pdf-${tag}@example.invalid`];
const subscriberIds = [], reportIds = [], vetIds = [];
for (let i = 0; i < 26; i++) {
  const { rows } = await pool.query(`INSERT INTO vet_reviewer_applications
    (name,email,credentials,registration_body,registration_number,clinic,clinic_website,message,consent,created_at)
    VALUES ($1,$2,'Fixture DVM','Fixture Board',$3,$4,$5,$6,true,'2099-01-01') RETURNING id`,
    [`Fixture Vet ${i}`, `vet-${tag}@example.invalid`, `TEST-${i}`, i % 2 ? null : "Fixture Clinic",
      i % 2 ? null : "javascript:alert('unsafe')", "<script>alert('unsafe')</script>\n" + "Long application message ".repeat(100)]);
  vetIds.push(rows[0].id);
}
for (let i = 0; i < 26; i++) {
  const { rows } = await pool.query("INSERT INTO subscribers(email,source,created_at) VALUES ($1,'plus-waitlist','2099-01-01') RETURNING id", [emails[0]]);
  subscriberIds.push(rows[0].id);
}
subscriberIds.push((await pool.query("INSERT INTO subscribers(email,source,created_at) VALUES ($1,'pdf','2099-01-02') RETURNING id", [emails[2]])).rows[0].id);
reportIds.push((await pool.query("INSERT INTO answer_reports(email,message,created_at) VALUES ($1,$2,'2099-01-01') RETURNING id", [emails[1], "<script>alert('unsafe')</script>\nFixture report: " + "Long-report-text ".repeat(60)])).rows[0].id);
const { handleRequest } = await import("../../paw-and-whisker/server.mjs");
const wrapper = express();
wrapper.use((req, res, next) => req.path.startsWith("/api/") ? app(req, res, next) : handleRequest(req, res));
const server = wrapper.listen(23178, "127.0.0.1", () => console.log("Inbox fixture ready at http://127.0.0.1:23178"));
let closing = false;
async function cleanup() {
  if (closing) return; closing = true;
  server.close();
  await pool.query("DELETE FROM subscribers WHERE id=ANY($1::int[])", [subscriberIds]);
  await pool.query("DELETE FROM answer_reports WHERE id=ANY($1::int[])", [reportIds]);
  await pool.query("DELETE FROM vet_reviewer_applications WHERE id=ANY($1::int[])", [vetIds]);
  await pool.query("DELETE FROM usage_counters WHERE key LIKE $1", [`inbox-admin:%:${anonymousKey("127.0.0.1")}`]);
  await pool.end(); await rm(temporary, { recursive: true }); process.exit(0);
}
process.on("SIGINT", cleanup); process.on("SIGTERM", cleanup);