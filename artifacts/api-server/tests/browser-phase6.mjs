// Production-built UI checks in an owned disposable Chrome profile; no live secrets.
import assert from "node:assert/strict";
import express from "express";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
process.env.NODE_ENV = "production";
process.env.LOG_LEVEL = "silent";
process.env.SESSION_SECRET = "phase6-browser-fixture";
process.env.PORT = "23176";
process.env.BASE_PATH = "/";
const temporary = await mkdtemp("/tmp/paw-phase6-browser-");
const output = new URL("../../../.local/reports/", import.meta.url);
await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: 'export {default as app} from "./src/app"; export {pool} from "@workspace/db"; export {anonymousKey} from "./src/lib/request-limits";', resolveDir: new URL("../", import.meta.url).pathname, loader: "ts" }, bundle: true, platform: "node", format: "cjs", write: false, external: ["pg-native"] });
await writeFile(`${temporary}/fixture.cjs`, bundle.outputFiles[0].contents);
const { app, pool, anonymousKey } = createRequire(import.meta.url)(`${temporary}/fixture.cjs`);
const { handleRequest } = await import("../../paw-and-whisker/server.mjs");
const wrapper = express();
wrapper.use((req, res, next) => req.path.startsWith("/api/") ? app(req, res, next) : handleRequest(req, res));
const server = wrapper.listen(23176, "127.0.0.1");
await new Promise(r => server.once("listening", r));
const origin = "http://127.0.0.1:23176";
const email = `phase6-browser-${Date.now()}@example.invalid`;
const tab = await (await fetch("http://127.0.0.1:9226/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map(), exceptions = [], badResources = [], checks = [], audits = [];
ws.addEventListener("message", e => {
  const m = JSON.parse(e.data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  else if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails.text);
  else if (m.method === "Network.responseReceived" && m.params.response.status >= 400) badResources.push(m.params.response.url);
});
const cmd = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const delay = ms => new Promise(r => setTimeout(r, ms));
async function evaluate(expression) {
  const r = await cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(200); }
  throw new Error(`Timed out: ${expression}`);
}
async function go(path, width) {
  await cmd("Emulation.setDeviceMetricsOverride", { width, height: 1050, deviceScaleFactor: 1, mobile: width === 390 });
  await cmd("Page.navigate", { url: origin + path });
  await wait(`location.pathname===${JSON.stringify(path)} && document.querySelector('h1') && !document.querySelector('[aria-busy=true]')`);
  await delay(700);
}
async function screenshot(name) {
  await delay(300);
  const { data } = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 85 });
  await writeFile(new URL(`phase6-${name}.jpg`, output), Buffer.from(data, "base64"));
}
async function fill(selector, value) {
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
await cmd("Page.enable"); await cmd("Runtime.enable"); await cmd("Network.enable");
try {
  const axe = await (await fetch("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js")).text();
  const routes = [["/", "home"], ["/guides", "guides"], ["/tools/toxic-food-checker", "food"], ["/find-a-vet", "vet"], ["/vet-reviewers", "reviewers"], ["/pricing", "pricing"]];
  for (const [path, name] of routes) {
    for (const width of [1440, 390]) {
      await go(path, width);
      assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+1"), false, `${path} at ${width} overflow`);
      if (["home", "guides", "food", "vet"].includes(name)) {
        await evaluate(`document.querySelector('[data-testid=figure-scene-${name}]').scrollIntoView({block:'center'})`);
        await wait(`document.querySelector('[data-testid=figure-scene-${name}] img').naturalWidth>0`);
        await screenshot(`${name}-scene-${width}`);
      } else await screenshot(`${name}-${width}`);
    }
    for (const dark of [false, true]) {
      await evaluate(`document.documentElement.classList.toggle('dark',${dark})`); await delay(700);
      await evaluate(axe + ";undefined");
      const violations = await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))");
      audits.push({ path, dark, violations });
    }
  }
  await writeFile(new URL("phase6-accessibility.json", output), JSON.stringify(audits, null, 2));
  assert.ok(audits.every(a => !a.violations.length), JSON.stringify(audits.filter(a => a.violations.length)));
  checks.push("12 desktop/mobile layouts and scene placements; 12 light/dark AA audits");
  await go("/vet-reviewers", 390);
  await fill("[data-testid=input-reviewer-name]", "QA Reviewer");
  await fill("[data-testid=input-reviewer-email]", email);
  await fill("[data-testid=input-reviewer-credentials]", "Fixture credentials");
  await fill("[data-testid=input-reviewer-registration-body]", "Fictional board");
  await fill("[data-testid=input-reviewer-registration-number]", "NOT-A-REAL-LICENCE");
  await fill("[data-testid=input-reviewer-clinic]", "Fictional clinic");
  await fill("[data-testid=input-reviewer-website]", "https://example.invalid");
  await fill("[data-testid=input-reviewer-message]", "Fictional browser test application for reviewing guides.");
  await evaluate("document.querySelector('[data-testid=checkbox-reviewer-consent]').click()");
  await evaluate("document.querySelector('[data-testid=button-reviewer-apply]').click()");
  await wait("document.querySelector('[data-testid=status-reviewer-application]')");
  const saved = await pool.query("select consent, registration_number from vet_reviewer_applications where email=$1", [email]);
  assert.equal(saved.rowCount, 1); assert.equal(saved.rows[0].consent, true);
  assert.equal(saved.rows[0].registration_number, "NOT-A-REAL-LICENCE");
  assert.equal(await evaluate("document.querySelector('[data-testid=input-reviewer-email]')?.value ?? ''"), "", "Successful form must clear contact details");
  await evaluate("document.querySelector('[data-testid=status-reviewer-application]').scrollIntoView({block:'center'})");
  await screenshot("application-success-390");
  await cmd("Page.reload"); await delay(700); await wait("document.querySelector('[data-testid=form-vet-reviewer]')");
  assert.equal(await evaluate("document.querySelector('[data-testid=input-reviewer-email]').value"), "");
  checks.push("Reviewer form saved real DB record with consent, reset/confirmation and reload; no email sent or review credit published");
  assert.equal(exceptions.length, 0);
  assert.equal(badResources.length, 0);
  await writeFile(new URL("phase6-browser-checks.json", output), JSON.stringify({ checks, exceptions, badResources }, null, 2));
  console.log("Verified", checks);
} finally {
  await pool.query("delete from vet_reviewer_applications where email=$1", [email]);
  await pool.query("delete from usage_counters where key like $1", [`%:${anonymousKey("127.0.0.1")}`]);
  await new Promise(r => server.close(r)); await pool.end(); ws.close(); await rm(temporary, { recursive: true });
}