// Optional live-preview browser verification with Chromium's CDP and Node's WebSocket.
// Start a disposable Chromium on port9225. Never log cookies, auth headers or photo payloads.
import { mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { build } from "esbuild";
import assert from "node:assert/strict";
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const out = new URL("../../../.local/reports/", import.meta.url);
await mkdir(out, { recursive: true });
const tab = await (await fetch("http://127.0.0.1:9225/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));
let seq = 0;
const pending = new Map();
const exceptions = [];
ws.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const callbacks = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callbacks?.reject(new Error(message.error.message));
    else callbacks?.resolve(message.result);
  } else if (message.method === "Runtime.exceptionThrown") {
    exceptions.push(message.params.exceptionDetails.text);
  }
});
function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cmd("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression, timeout = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    // DOM nodes may carry cyclic React/Leaflet internals; CDP should serialize a boolean.
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`Browser check timed out: ${expression}`);
}
async function go(path, width = 1440) {
  await cmd("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
  await cmd("Page.navigate", { url: origin + path });
  await wait("document.querySelector('main') && document.querySelector('h1') && !document.querySelector('.pw-skeleton')");
  await new Promise(resolve => setTimeout(resolve, 1000));
}
async function fill(selector, value) {
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const p=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await new Promise(resolve => setTimeout(resolve, 300));
}
async function shot(name) {
  const { data } = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 80, captureBeyondViewport: false });
  await writeFile(new URL(name, out), Buffer.from(data, "base64"));
}
await cmd("Page.enable"); await cmd("Runtime.enable"); await cmd("Network.enable");
try {
  const layout = [];
  for (const path of (process.argv.includes("--journeys-only") ? [] : ["/find-a-vet", "/for-vets", "/advertise", "/sponsorship-policy", "/about", "/admin/promotions"])) {
    for (const width of [1440, 390]) {
      await go(path, width);
      const state = await evaluate("({h1:document.querySelector('h1').innerText,overflow:document.documentElement.scrollWidth>innerWidth+1})");
      assert.equal(state.overflow, false, `${path} at ${width}: horizontal overflow`);
      layout.push({ path, width, ...state });
      await shot(`phase4-${path.split("/").pop()}-${width}.jpg`);
    }
  }
  console.log("Layout checks", JSON.stringify(layout));
  if (layout.length) await writeFile(new URL("phase4-browser-layouts.json", out), JSON.stringify(layout, null, 2));
  await go("/find-a-vet?urgent=1");
  assert.equal(await evaluate("document.querySelector('[data-testid=check-urgent]').checked"), true);
  await fill("[data-testid=input-vet-query]", "Leeds, UK");
  await click("[data-testid=button-vet-search]");
  await wait("document.querySelector('[data-testid=map-vets]') || document.querySelector('[role=alert]')", 50_000);
  assert.ok(await evaluate("!!document.querySelector('[data-testid=map-vets]')"), await evaluate("document.querySelector('[role=alert]')?.innerText ?? 'No map/results'"));
  await wait("!!document.querySelector('.leaflet-container')", 15_000);
  assert.ok(await evaluate("!!document.querySelector('.leaflet-overlay-pane canvas')"), "Clinic markers use Leaflet's canvas renderer");
  await shot("phase4-real-vet-results-desktop.jpg");
  const clinicCount = await evaluate("document.querySelectorAll('[data-testid^=card-clinic-]').length");
  // Real filter changes submit another POST without asking for location again.
  await evaluate("Array.from(document.querySelectorAll('.pw-checks label')).find(x=>x.textContent.includes('Open now')).querySelector('input').click()");
  await wait("!document.querySelector('[data-testid=button-vet-search]').disabled", 50_000);
  assert.equal(await evaluate("!document.querySelector('.pw-results')?.innerText.includes('Closed (from listed hours)')"), true);
  console.log("Real vet search/map and filter passed", { clinicCount });
  await go("/#free-chat", 390);
  await wait("document.querySelector('.free-companion .content-button') && !document.querySelector('.free-companion .content-button').disabled");
  const { root } = await cmd("DOM.getDocument");
  const { nodeId } = await cmd("DOM.querySelector", { nodeId: root.nodeId, selector: "[data-testid=input-free-photo]" });
  await cmd("DOM.setFileInputFiles", { nodeId, files: [new URL("../../paw-and-whisker/public/cats.jpg", import.meta.url).pathname] });
  await wait("!!document.querySelector('.pw-photo-preview img')");
  await click("[data-testid=button-remove-photo]");
  assert.equal(await evaluate("!!document.querySelector('.pw-photo-preview')"), false);
  await cmd("DOM.setFileInputFiles", { nodeId, files: [new URL("../../paw-and-whisker/public/cats.jpg", import.meta.url).pathname] });
  await wait("!!document.querySelector('.pw-photo-preview img')");
  const marker = `Phase4 QA ${Date.now()}`;
  await fill("#free-question", `${marker}: Please describe one visible detail in this routine cat photo. Do not diagnose. Remind me to call a vet if worried.`);
  await click(".free-companion .content-button");
  await wait("document.querySelectorAll('.chat-answer').length===1", 90_000);
  assert.equal(await evaluate("document.querySelector('.free-companion').innerText.includes('1 of 2 free questions left today')"), true);
  assert.equal(await evaluate("!!document.querySelector('.pw-photo-preview')"), false);
  await evaluate("document.querySelector('.chat-answer').scrollIntoView({block:'center'})");
  await shot("phase4-real-photo-answer-mobile.jpg");
  await fill("#free-question", `${marker}: What is one gentle way to help a puppy settle at bedtime?`);
  await click(".free-companion .content-button");
  await wait("document.querySelectorAll('.chat-answer').length===2", 90_000);
  assert.equal(await evaluate("document.querySelector('.free-companion').innerText.includes('0 of 2 free questions left today')"), true);
  assert.equal(await evaluate("document.querySelector('.free-companion .content-button').disabled"), true);
  const third = await evaluate("fetch('/api/companion/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Third allowance check'})}).then(r=>r.status)");
  assert.equal(third, 429);
  assert.equal(await evaluate("Object.values(sessionStorage).concat(Object.values(localStorage)).some(v=>v.includes('data:image/')||v.includes('base64,'))"), false);
  await go("/#free-chat", 390);
  await wait("document.querySelector('.free-companion')?.innerText.includes('0 of 2 free questions left today')");
  assert.equal(exceptions.length, 0, exceptions.join("\n"));
  // Remove only this test's conversation. Existing user conversations are untouched.
  const temporary = await mkdtemp("/tmp/paw-phase4-cleanup-");
  const bundle = await build({ stdin: { contents: 'export {pool} from "@workspace/db"', loader: "ts", resolveDir: new URL("../", import.meta.url).pathname }, bundle: true, platform: "node", format: "cjs", write: false, external: ["pg-native"] });
  await writeFile(`${temporary}/db.cjs`, bundle.outputFiles[0].contents);
  const { pool } = createRequire(import.meta.url)(`${temporary}/db.cjs`);
  const owned = await pool.query("SELECT DISTINCT conversation_id FROM messages WHERE role='user' AND content LIKE $1", [`${marker}:%`]);
  const ids = owned.rows.map(x => x.conversation_id);
  if (ids.length) {
    await pool.query("DELETE FROM messages WHERE conversation_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM conversations WHERE id = ANY($1::int[])", [ids]);
  }
  await pool.end(); await rm(temporary, { recursive: true });
  console.log("Real photo/text shared cap, reload and no-image-storage checks passed.");
  await writeFile(new URL("phase4-browser-results.json", out), JSON.stringify({ layout, realMap: true, realPhoto: true, sharedDailyCap: true, exceptions }, null, 2));
} finally { ws.close(); }