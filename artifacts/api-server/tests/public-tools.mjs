import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

// Run explicitly against development. Only this run's test records are removed.
if (!process.env.REPLIT_DEV_DOMAIN) throw new Error("Development domain is required.");
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const require = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const email = `pw-phase2-${randomUUID()}@example.com`;
let conversationId;
async function post(route, body, cookie) {
  return fetch(base + route, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
}
try {
  assert.equal((await post("/api/subscribers", { email: "not-an-email" })).status, 400);
  const subscribed = await post("/api/subscribers", { email });
  assert.equal(subscribed.status, 201);
  const access = await subscribed.json();
  assert.equal(access.success, true);
  assert.equal(access.downloadUrl, "/downloads/10-pet-symptoms.pdf");
  const persisted = await pool.query("select count(*)::int as count from subscribers where email=$1", [email]);
  assert.equal(persisted.rows[0].count, 1);
  const pdf = await fetch(base + access.downloadUrl);
  assert.equal(pdf.status, 200);
  assert.ok(pdf.headers.get("content-type").startsWith("application/pdf"));
  assert.ok((await pdf.text()).startsWith("%PDF-1.4"));
  console.log("PASS: invalid email rejected; valid capture persisted; genuine PDF downloads.");

  const usage = await fetch(base + "/api/companion/usage");
  assert.equal(usage.status, 200);
  assert.equal((await usage.json()).remaining, 2);
  const cookie = usage.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie && usage.headers.get("set-cookie").includes("HttpOnly"));
  const id = cookie.slice(cookie.indexOf("=") + 1).split(".")[0];
  const sessionId = "free-" + id;
  const inserted = await pool.query("insert into conversations (session_id,title) values ($1,$2) returning id", [sessionId, "Phase 2 isolated allowance test"]);
  conversationId = inserted.rows[0].id;
  await pool.query("insert into messages (conversation_id,role,content) values ($1,'user',$2)", [conversationId, "This is an isolated routine puppy-training test."]);
  assert.equal((await (await fetch(base + "/api/companion/usage", { headers: { Cookie: cookie } })).json()).remaining, 1);
  assert.equal((await post("/api/companion/message", { question: " " }, cookie)).status, 400);

  const responses = await Promise.all(Array.from({ length: 3 }, () => post("/api/companion/message", {
    question: "Give two short, gentle tips for helping a healthy puppy settle on its first night. This is a routine training question, not a medical concern.",
    petName: "Test puppy", species: "puppy", age: "12 weeks",
  }, cookie)));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 429, 429]);
  const answered = await responses.find(r => r.status === 200).json();
  assert.ok(answered.answer.length > 20);
  assert.equal(answered.remaining, 0);
  const records = await pool.query("select role,count(*)::int as count from messages where conversation_id=$1 group by role", [conversationId]);
  assert.equal(records.rows.find(row => row.role === "user").count, 2);
  assert.equal(records.rows.find(row => row.role === "assistant").count, 1);
  const exhausted = await post("/api/companion/message", { question: "Another routine question." }, cookie);
  assert.equal(exhausted.status, 429);
  assert.equal((await exhausted.json()).remaining, 0);
  console.log("PASS: actual AI answer persisted; concurrent daily cap and subsequent rejection enforced.");
} finally {
  await pool.query("delete from subscribers where email=$1", [email]);
  if (conversationId) await pool.query("delete from conversations where id=$1", [conversationId]);
  await pool.end();
  console.log("Cleaned up only this run's isolated test records.");
}