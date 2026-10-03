// Live UI smoke checks. Requires the disposable Chromium used by browser-phase4.mjs.
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const tab = await (await fetch("http://127.0.0.1:9225/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", event => {
  const m = JSON.parse(event.data); if (!m.id) return;
  const p = pending.get(m.id); pending.delete(m.id);
  m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
});
const cmd = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
async function evaluate(expression) {
  const r = await cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description);
  return r.result.value;
}
const delay = ms => new Promise(r => setTimeout(r, ms));
async function wait(expr, ms = 20_000) {
  const start = Date.now();
  while (Date.now() - start < ms) { if (await evaluate(`Boolean(${expr})`)) return; await delay(300); }
  throw new Error(`Timed out: ${expr}`);
}
const temporary = await mkdtemp("/tmp/paw-phase4-promotion-qa-");
const bundle = await build({ stdin: { contents: 'export {pool} from "@workspace/db"', resolveDir: new URL("../", import.meta.url).pathname, loader: "ts" }, bundle: true, platform: "node", format: "cjs", write: false, external: ["pg-native"] });
await writeFile(`${temporary}/db.cjs`, bundle.outputFiles[0].contents);
const { pool } = createRequire(import.meta.url)(`${temporary}/db.cjs`);
const owned = [];
const audit = [];
await cmd("Page.enable"); await cmd("Runtime.enable");
try {
  for (const [path, table, field] of [["/for-vets", "clinic_applications", "clinicName"], ["/advertise", "advertiser_inquiries", "brandName"]]) {
    await cmd("Page.navigate", { url: origin + path });
    await wait(`document.querySelector('input[name=${field}]') && Object.keys(document.querySelector('form')).some(k=>k.startsWith('__react'))`);
    await evaluate(`(()=>{const f=document.querySelector('form.pw-form');for(const [name,value]of Object.entries({${field}:'Phase4 UI QA ${Date.now()}',contactEmail:'qa@phase4.invalid',city:'QA fixture town',message:'An automated UI submission test. Remove after verification.'})){const e=f.elements.namedItem(name);if(e)e.value=value;}f.elements.namedItem('consent').checked=true;f.requestSubmit();})()`);
    await wait("document.querySelector('[data-testid^=receipt-]')");
    const receipt = await evaluate("document.querySelector('[data-testid^=receipt-]').innerText");
    const reference = Number(receipt.match(/Reference (\d+)/)?.[1]);
    assert.ok(reference > 0); owned.push([table, reference]);
    assert.ok(receipt.includes("No email was sent") && receipt.includes("no placement was booked"));
    const db = await pool.query(`select id from ${table} where id=$1`, [reference]);
    assert.equal(db.rowCount, 1);
    console.log("Real form receipt and database persistence passed", path);
  }
  const axeResponse = await fetch("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js");
  assert.ok(axeResponse.ok);
  const axeSource = await axeResponse.text();
  for (const path of ["/for-vets", "/advertise", "/find-a-vet", "/sponsorship-policy", "/about", "/admin/promotions"]) {
    for (const mode of ["light", "dark"]) {
      await cmd("Page.navigate", { url: origin + path });
      await wait("document.querySelector('main h1') && document.querySelector('footer')");
      await delay(1200);
      await evaluate(`localStorage.setItem('paw-and-whisker-theme',${JSON.stringify(mode)}); document.documentElement.classList.toggle('dark',${mode === "dark"})`);
      await delay(500);
      await evaluate(axeSource + "; undefined");
      const violations = await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))");
      audit.push({ path, mode, violations });
    }
  }
  await writeFile(new URL("../../../.local/reports/phase4-accessibility.json", import.meta.url), JSON.stringify(audit, null, 2));
  console.log("Accessibility audits", JSON.stringify(audit.filter(a => a.violations.length)));
  await cmd("Page.navigate", { url: origin + "/find-a-vet?urgent=1" });
  await wait("document.querySelector('[data-testid=button-vet-search]')");
  await delay(1000);
  await cmd("Browser.setPermission", { permission: { name: "geolocation" }, setting: "denied", origin });
  await evaluate("document.querySelector('[data-testid=button-vet-locate]').click()");
  await wait("document.querySelector('[role=alert]')?.textContent.includes('denied')");
  console.log("Location denied UI offers city/postcode search, without an automatic permission request.");
  await evaluate("(()=>{const e=document.querySelector('[data-testid=input-vet-query]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Leeds, UK');e.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await evaluate("document.querySelector('[data-testid=button-vet-search]').click()");
  await wait("document.querySelector('.leaflet-overlay-pane canvas')", 45_000);
  await evaluate("document.querySelector('.pw-results').scrollIntoView({block:'start'})");
  await delay(800);
  const { data } = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 85 });
  await writeFile(new URL("../../../.local/reports/phase4-map-evidence-desktop.jpg", import.meta.url), Buffer.from(data, "base64"));
  console.log("Map/list screenshot captured after real search.");
} finally {
  for (const [table, reference] of owned) await pool.query(`delete from ${table} where id=$1`, [reference]);
  await pool.end(); await rm(temporary, { recursive: true }); ws.close();
}