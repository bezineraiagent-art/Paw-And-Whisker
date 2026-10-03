// Disposable-browser, real UI verification. No live admin credentials are read.
import assert from "node:assert/strict";
import express from "express";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";

process.env.NODE_ENV = "production";
process.env.LOG_LEVEL = "silent";
process.env.PORT = "23175";
process.env.ANALYTICS_ADMIN_TOKEN = "phase5-browser-admin-fixture";
process.env.SESSION_SECRET = "phase5-browser-session-fixture";
const out = new URL("../../../.local/reports/", import.meta.url);
await mkdir(out, { recursive: true });
const temporary = await mkdtemp("/tmp/paw-phase5-browser-");
const bundled = await build({ stdin: { contents: 'export {default as app} from "./src/app"; export {pool} from "@workspace/db"; export {anonymousKey} from "./src/lib/request-limits";', resolveDir: new URL("../", import.meta.url).pathname, loader: "ts" }, bundle: true, platform: "node", format: "cjs", write: false, external: ["pg-native"] });
await writeFile(`${temporary}/fixture.cjs`, bundled.outputFiles[0].contents);
const { app, pool, anonymousKey } = createRequire(import.meta.url)(`${temporary}/fixture.cjs`);
const { handleRequest } = await import("../../paw-and-whisker/server.mjs");
const wrapper = express();
wrapper.use((req, res, next) => req.path.startsWith("/api/") ? app(req, res, next) : handleRequest(req, res));
const server = wrapper.listen(23175, "127.0.0.1");
await new Promise(r => server.once("listening", r));
const fixtureOrigin = "http://127.0.0.1:23175", liveOrigin = "http://127.0.0.1:80";
let origin = fixtureOrigin;
const tag = `phase5-browser-${Date.now()}`, email = `${tag}@example.invalid`;
const tab = await (await fetch("http://127.0.0.1:9225/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map(), exceptions = [], badResources = [];
ws.addEventListener("message", e => {
  const m = JSON.parse(e.data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  else if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails.text);
  else if (m.method === "Network.responseReceived" && m.params.response.status >= 400 && !m.params.response.url.includes("/api/")) badResources.push(m.params.response.url);
});
const cmd = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
const delay = ms => new Promise(r => setTimeout(r, ms));
async function evaluate(expression) {
  const r = await cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
async function wait(expr, ms = 20_000) {
  const start = Date.now();
  while (Date.now() - start < ms) { if (await evaluate(`Boolean(${expr})`)) return; await delay(200); }
  throw new Error(`Timed out: ${expr}`);
}
async function go(path, width = 1440) {
  await cmd("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
  await cmd("Page.navigate", { url: origin + path });
  const target = new URL(origin + path);
  await wait(`location.origin===${JSON.stringify(target.origin)} && location.pathname===${JSON.stringify(target.pathname)} && document.querySelector('main') && document.querySelector('h1') && !document.querySelector('.pw-skeleton')`);
  await delay(600);
}
async function fill(selector, value) {
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const p=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e instanceof HTMLSelectElement?'change':'input',{bubbles:true}));})()`);
}
const click = async selector => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await delay(200); };
async function shot(name) {
  const { data } = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 80 });
  await writeFile(new URL(name, out), Buffer.from(data, "base64"));
}
const checks = [];
await cmd("Page.enable"); await cmd("Runtime.enable"); await cmd("Network.enable");
try {
  // Production-built pages: inspect whole app, not just development rendering.
  const axe = await (await fetch("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js")).text();
  const audits = [];
  for (const path of (process.argv.includes("--journeys-only") ? [] : ["/", "/pricing", "/how-it-works", "/tools/symptom-check", "/tools/toxic-food-checker", "/guides", "/find-a-vet"])) {
    for (const width of [1440, 390]) {
      await go(path, width);
      assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+1"), false, `${path} at ${width} overflow`);
      await shot(`phase5-${path.replaceAll("/", "-") || "home"}-${width}.jpg`);
    }
    for (const dark of [false, true]) {
      await evaluate(`document.documentElement.classList.toggle('dark',${dark})`);
      await delay(600); // Audit settled colors, not the theme transition midpoint.
      await evaluate(axe + "; undefined");
      const violations = await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))");
      audits.push({ path, dark, violations });
    }
  }
  if (audits.length) await writeFile(new URL("phase5-accessibility.json", out), JSON.stringify(audits, null, 2));
  console.log("Accessibility issues", JSON.stringify(audits.filter(a => a.violations.length)));
  assert.ok(audits.every(a => !a.violations.length), "Accessibility audit failed");
  if (audits.length) checks.push("14 AA accessibility audits; 14 desktop/mobile page layouts");
  await go("/", 1440);
  await evaluate("document.querySelector('.pw-bento').scrollIntoView({block:'center'})"); await shot("phase5-bento-desktop.jpg");
  await go("/", 390); await evaluate("document.querySelector('.pw-bento').scrollIntoView({block:'start'})"); await shot("phase5-bento-mobile.jpg");
  await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await cmd("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await evaluate("document.querySelector('.pw-fs-field input').focus()");
  const spacing = await evaluate("(()=>{const e=document.querySelector('.pw-fs-field input');return {pad:parseFloat(getComputedStyle(e).paddingLeft),outline:getComputedStyle(e).outlineStyle}})()");
  assert.ok(spacing.pad >= 45); assert.notEqual(spacing.outline, "none"); checks.push("Food icon spacing and visible keyboard focus");
  await go("/pricing", 390);
  assert.equal(await evaluate("document.querySelector('[data-testid=button-waitlist]').disabled"), true);
  await fill("[data-testid=input-waitlist-email]", email);
  await click("[data-testid=checkbox-waitlist-consent]"); await click("[data-testid=button-waitlist]");
  await wait("document.querySelector('[data-testid=status-waitlist]')");
  assert.equal((await pool.query("select id from subscribers where email=$1 and source='plus-waitlist'", [email])).rowCount, 1);
  await go("/how-it-works", 390);
  await fill("[data-testid=input-report-email]", email); await fill("[data-testid=input-report-message]", "Please review this fictional browser test answer.");
  await click("[data-testid=checkbox-report-consent]"); await click("[data-testid=button-report]");
  await wait("document.querySelector('[data-testid=status-report]')");
  assert.equal((await pool.query("select id from answer_reports where email=$1", [email])).rowCount, 1);
  checks.push("Waitlist and wrong-answer UI save consented records; no email sent");
  // Real guard and real DB under isolated fixture credentials; never live token.
  const post = (path, data) => fetch(origin + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  assert.equal((await post("/api/promotion/clinic-applications", { clinicName: tag, contactName: "QA", contactEmail: email, city: "Test", country: "UK", website: "", message: "Isolated admin fixture", consent: true, featured: false, fax: "" })).status, 201);
  assert.equal((await post("/api/promotion/advertiser-inquiries", { brandName: tag, contactName: "QA", contactEmail: email, website: "", message: "Isolated admin fixture", placements: ["newsletter"], consent: true, fax: "" })).status, 201);
  const unauth = await fetch(origin + "/api/promotion/leads");
  assert.equal(unauth.status, 401); assert.ok(!(await unauth.text()).includes(tag));
  await go("/admin/promotions");
  assert.equal(await evaluate("!!document.querySelector('.pw-leads')"), false);
  await fill("[data-testid=input-leads-token]", "wrong-fixture"); await click("[data-testid=form-admin-leads] button");
  await wait("document.querySelector('[role=alert]')"); assert.equal(await evaluate("!!document.querySelector('.pw-leads')"), false);
  await fill("[data-testid=input-leads-token]", "phase5-browser-admin-fixture"); await click("[data-testid=form-admin-leads] button");
  await wait("document.querySelectorAll('.pw-leads').length===2"); assert.ok(await evaluate(`document.querySelector('main').innerText.includes(${JSON.stringify(tag)})`));
  await click("[data-testid=button-refresh-leads]"); await click("[data-testid=button-lock-leads]"); await delay(300);
  assert.equal(await evaluate("!!document.querySelector('.pw-leads')"), false);
  await cmd("Page.reload"); await delay(700); await wait("document.querySelector('[data-testid=input-leads-token]')");
  assert.equal(await evaluate("!!document.querySelector('.pw-leads')"), false);
  checks.push("Admin empty/401 unauthenticated, wrong-token rejection, correct-token leads, refresh/lock/reload");
  // Actual proxy and actual AI integration; two questions with one photo.
  await cmd("Network.clearBrowserCookies"); // Only this disposable QA profile.
  origin = liveOrigin;
  await go("/#free-chat", 390);
  await evaluate("localStorage.removeItem('pw-free-pet');sessionStorage.removeItem('pw-free-history')");
  await cmd("Page.reload"); await delay(700); await wait("document.querySelector('[data-testid=input-pet-name]')");
  await fill("[data-testid=input-pet-name]", "Lucky"); await fill("[data-testid=select-pet-species]", "cat");
  await fill(".pet-profile-form label:nth-of-type(3) input", "1 year"); await fill(".pet-profile-form label:nth-of-type(4) input", "4 kg");
  await fill(".pet-profile-form label:nth-of-type(6) textarea", "None known"); await fill(".pet-profile-form label:nth-of-type(7) textarea", "None known");
  await click("[data-testid=button-save-pet]"); await cmd("Page.reload"); await delay(700); await wait("document.querySelector('[data-testid=text-pet-name]')");
  assert.equal(await evaluate("document.querySelector('[data-testid=text-pet-name]').innerText"), "Lucky");
  await click("[data-testid=button-edit-pet]"); await fill(".pet-profile-form label:nth-of-type(4) input", "4.2 kg"); await click("[data-testid=button-save-pet]");
  await fill("#free-question", "My pet has no symptoms. Confirm the name and age in my pet card, then give one gentle reward-based handling tip. AI cannot diagnose.");
  await click("[data-testid=button-ask]"); await wait("document.querySelectorAll('.chat-answer').length===1 || document.querySelector('.free-companion [role=alert]')", 60_000);
  assert.equal(await evaluate("document.querySelectorAll('.chat-answer').length"), 1, await evaluate("document.querySelector('.free-companion [role=alert]')?.innerText"));
  assert.ok(await evaluate("document.querySelector('.chat-answer').innerText.includes('Lucky')"));
  assert.ok(await evaluate("!!document.querySelector('.chat-answer .pw-urgency')"));
  const { root } = await cmd("DOM.getDocument");
  const { nodeId } = await cmd("DOM.querySelector", { nodeId: root.nodeId, selector: "[data-testid=input-free-photo]" });
  await cmd("DOM.setFileInputFiles", { nodeId, files: [new URL("../../paw-and-whisker/public/cats.jpg", import.meta.url).pathname] });
  await wait("document.querySelector('.pw-photo-preview img')");
  await fill("#free-question", "Describe one visible detail in this routine cat photo. This is not a diagnosis; remind me to call a vet if worried.");
  await click("[data-testid=button-ask]"); await wait("document.querySelectorAll('.chat-answer').length===2 || document.querySelector('.free-companion [role=alert]')", 60_000);
  assert.equal(await evaluate("document.querySelectorAll('.chat-answer').length"), 2, await evaluate("document.querySelector('.free-companion [role=alert]')?.innerText"));
  assert.equal(await evaluate("document.querySelectorAll('.chat-answer .pw-urgency').length"), 2);
  await evaluate("document.querySelectorAll('.chat-answer')[1].scrollIntoView({block:'center'})"); await delay(700); await shot("phase5-real-photo-urgency-mobile.jpg");
  assert.ok(await evaluate("document.querySelector('.free-companion').innerText.includes('0 of 2 free questions left today')"));
  await click("[data-testid=button-clear-pet]");
  assert.equal(await evaluate("localStorage.getItem('pw-free-pet')"), null);
  assert.equal(await evaluate("!!document.querySelector('[data-testid=input-pet-name]')"), true);
  checks.push("Browser profile save/edit/reload/clear and actual text+photo AI answers with urgency and shared two/day allowance");
  assert.equal(exceptions.length, 0); assert.equal(badResources.length, 0);
  await writeFile(new URL("phase5-browser-checks.json", out), JSON.stringify({ checks, uncaughtExceptions: exceptions.length, failedPublicResources: badResources.length }, null, 2));
  console.log("Verified", checks);
} finally {
  for (const table of ["clinic_applications", "advertiser_inquiries"]) await pool.query(`delete from ${table} where contact_email=$1`, [email]);
  for (const table of ["subscribers", "answer_reports"]) await pool.query(`delete from ${table} where email=$1`, [email]);
  await pool.query("delete from usage_counters where key like $1", [`%:${anonymousKey("127.0.0.1")}`]);
  await new Promise(r => server.close(r)); await pool.end(); ws.close(); await rm(temporary, { recursive: true });
}