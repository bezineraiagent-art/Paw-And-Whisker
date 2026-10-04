// Browser journey against the already-running disposable inbox fixture only.
// See tests/README-browser-inbox.md for setup and invocation.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const origin = process.env.INBOX_ORIGIN ?? "http://127.0.0.1:23178";
const token = "inbox-browser-isolated-fixture";
const cdp = process.env.CDP_URL ?? "http://127.0.0.1:9225";
const output = new URL("../../../.local/reports/", import.meta.url);
await mkdir(output, { recursive: true });
const tab = await (await fetch(`${cdp}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let seq = 0;
const pending = new Map(), paused = [];
let hasAxe = false;
ws.addEventListener("message", event => {
  const m = JSON.parse(event.data);
  if (m.id) {
    const p = pending.get(m.id); pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result);
  } else if (m.method === "Fetch.requestPaused") paused.push(m.params);
});
const cmd = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function evaluate(expression) {
  const r = await cmd("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
async function wait(expression, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); }
  throw new Error(`Timed out waiting for ${expression}`);
}
const esc = v => JSON.stringify(v);
async function go(width = 1440) {
  await cmd("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
  await cmd("Page.navigate", { url: `${origin}/admin/inbox` });
  await wait(`location.pathname==="/admin/inbox" && document.querySelector('[data-testid=input-inbox-token]')`);
}
async function fill(testid, value) {
  await evaluate(`(()=>{const e=document.querySelector('[data-testid=${testid}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${esc(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
async function click(testid) { await evaluate(`document.querySelector('[data-testid=${testid}]').click()`); }
async function shot(name) {
  const { data } = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 85 });
  await writeFile(new URL(`inbox-${name}.jpg`, output), Buffer.from(data, "base64"));
}
async function openInbox() {
  await fill("input-inbox-token", token); await click("button-open-inbox");
  await wait(`document.querySelector('[data-testid=button-lock-inbox]') && document.querySelector('[data-testid=text-waitlist-count]')?.textContent.includes('total')`);
}
async function installAxe() {
  try {
    const r = await fetch("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js", { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return false;
    await evaluate(`${await r.text()};undefined`);
    return true;
  } catch { return false; }
}
async function screenshotAndAudit(width, dark) {
  await go(width);
  await openInbox();
  if (hasAxe) await installAxe();
  await evaluate(`document.documentElement.classList.toggle('dark',${dark})`);
  await shot(`${width}-${dark ? "dark" : "light"}-locked`);
  const axeReady = await evaluate("Boolean(window.axe)");
  if (axeReady) {
    const violations = await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})))");
    return violations;
  }
  return null;
}

try {
  await cmd("Page.enable"); await cmd("Runtime.enable"); await cmd("Network.enable");
  await go();
  // API must not disclose either totals or records without the isolated fixture token.
  const protectedApi = await evaluate(`Promise.all(['/api/admin/waitlist','/api/admin/answer-reports'].flatMap(p=>[{}, {'x-admin-token':'wrong-token'}].map(async h=>{const r=await fetch(p,{headers:h});return {status:r.status,body:await r.json(),robots:r.headers.get('x-robots-tag')}})))`);
  for (const r of protectedApi) {
    assert.equal(r.status, 401); assert.deepEqual(Object.keys(r.body), ["error"]);
    assert.equal(r.robots, "noindex, nofollow");
  }
  hasAxe = await installAxe();
  const audits = [];
  for (const width of [1440, 390]) for (const dark of [false, true]) {
    const audit = await screenshotAndAudit(width, dark); if (audit) audits.push({ width, dark, violations: audit });
    assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+1"), false, `${width}px horizontal overflow`);
    assert.match(await evaluate("document.querySelector('meta[name=robots]')?.content||''"), /noindex/);
  }
  await go(1440);
  assert.equal(await evaluate("document.querySelectorAll('.pw-leads').length"), 0, "locked page must show no records");
  assert.equal(await evaluate("document.querySelector('[data-testid=input-inbox-token]').labels.length"), 1, "token input needs a label");
  await fill("input-inbox-token", "wrong-token"); await click("button-open-inbox");
  await wait(`document.querySelector('[data-testid=status-inbox-auth]')`);
  assert.equal(await evaluate("document.querySelectorAll('.pw-leads').length"), 0);
  await go(1440); await openInbox();
  assert.match(await evaluate("document.querySelector('[data-testid=text-waitlist-count]').textContent"), /Showing 1–25 of 26 total/);
  assert.match(await evaluate("document.querySelector('[data-testid=text-reports-count]').textContent"), /Showing 1–1 of 1 total/);
  assert.equal(await evaluate("document.querySelectorAll('[data-testid^=\"row-waitlist-\"]').length"), 25);
  assert.equal(await evaluate("document.querySelectorAll('[data-testid^=\"row-reports-\"]').length"), 1);
  assert.equal(await evaluate("document.querySelector('main').innerText.includes('inbox-pdf-')"), false);
  assert.ok(await evaluate("document.querySelector('main').innerText.includes('inbox-waitlist-')"));
  assert.ok(await evaluate("document.querySelector('main').innerText.includes('inbox-report-')"));
  assert.equal(await evaluate("document.querySelector('[data-testid^=\"row-reports-\"] script')"), null);
  assert.ok(await evaluate("document.querySelector('[data-testid^=\"row-reports-\"]').innerText.includes(\"<script>alert('unsafe')</script>\")"));
  assert.ok(await evaluate("document.querySelector('[data-testid^=\"row-reports-\"] time').dateTime.startsWith('2099-01-01')"));
  assert.equal(await evaluate(`!Object.keys(localStorage).concat(Object.keys(sessionStorage)).some(k=>String(localStorage.getItem(k)||sessionStorage.getItem(k)).includes(${esc(token)}))`), true);
  await shot("1440-authenticated-first-page");
  await click("button-next-waitlist");
  await wait(`document.querySelector('[data-testid=text-waitlist-count]')?.textContent.includes('26–26')`);
  assert.equal(await evaluate("document.querySelector('[data-testid=text-reports-count]').textContent"), "Showing 1–1 of 1 total.");
  assert.equal(await evaluate("document.querySelectorAll('[data-testid^=\"row-waitlist-\"]').length"), 1);
  await shot("1440-pagination");
  await click("button-refresh-inbox");
  await wait(`!document.querySelector('[data-testid=button-refresh-inbox]')?.disabled`);
  assert.match(await evaluate("document.querySelector('[data-testid=text-waitlist-count]').textContent"), /26–26 of 26/);
  await click("button-lock-inbox");
  await wait(`document.querySelector('[data-testid=input-inbox-token]')`);
  assert.equal(await evaluate("document.querySelectorAll('.pw-leads').length"), 0);
  assert.equal(await evaluate(`!Object.keys(localStorage).concat(Object.keys(sessionStorage)).some(k=>String(localStorage.getItem(k)||sessionStorage.getItem(k)).includes(${esc(token)}))`), true);
  await cmd("Page.reload"); await wait(`document.querySelector('[data-testid=input-inbox-token]')`);
  assert.equal(await evaluate("document.querySelectorAll('.pw-leads').length"), 0);
  assert.equal(await evaluate("document.querySelector('[data-testid=input-inbox-token]').value"), "");

  // Synthetic states below are explicitly browser-intercepted, not fixture/API data.
  const synthetic = [];
  async function interceptStart() {
    paused.length = 0;
    await cmd("Fetch.enable", { patterns: [{ urlPattern: `${origin}/api/admin/*`, requestStage: "Request" }] });
  }
  async function fulfill(requestId, status, body) {
    await cmd("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "content-type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") });
  }
  // Empty response state (synthetic only).
  await interceptStart(); await fill("input-inbox-token", token); await click("button-open-inbox");
  // Route synthetic responses without assuming request ordering.
  const drain = async handler => {
    const end = Date.now() + 5000;
    while (Date.now() < end && paused.length < 2) await sleep(25);
    const requests = paused.splice(0);
    for (const p of requests) await handler(p);
    return requests;
  };
  const emptyRequests = await drain(p => fulfill(p.requestId, 200, { records: [], total: 0, offset: 0, limit: 25 }));
  assert.equal(emptyRequests.length, 2, "synthetic empty state: two list requests intercepted");
  await wait("document.querySelector('[data-testid=empty-waitlist]') && document.querySelector('[data-testid=empty-reports]')");
  synthetic.push("empty response");
  await click("button-lock-inbox"); await wait("document.querySelector('[data-testid=input-inbox-token]')");
  await cmd("Fetch.disable");
  // One list 503, one success; retry the failed list with another synthetic success.
  await interceptStart(); await fill("input-inbox-token", token); await click("button-open-inbox");
  const errorRequests = await drain(p => p.request.url.includes("/waitlist") ?
    fulfill(p.requestId, 503, { error: "Synthetic failure" }) :
    fulfill(p.requestId, 200, { records: [], total: 0, offset: 0, limit: 25 }));
  assert.equal(errorRequests.length, 2, "synthetic error state: both list requests intercepted");
  await wait("document.querySelector('[data-testid=button-retry-waitlist]')");
  synthetic.push("one-list error/retry");
  const retryCall = click("button-retry-waitlist");
  const retry = await drain(p => fulfill(p.requestId, 200, { records: [], total: 0, offset: 0, limit: 25 }));
  await retryCall; assert.equal(retry.length, 1, "synthetic retry request intercepted");
  await wait("document.querySelector('[data-testid=empty-waitlist]')");
  await click("button-lock-inbox"); await wait("document.querySelector('[data-testid=input-inbox-token]')");
  await cmd("Fetch.disable");

  // A real auth rejection on one list must clear the UI before the other intercepted list resolves.
  await interceptStart(); await fill("input-inbox-token", token); await click("button-open-inbox");
  const end = Date.now() + 5000;
  while (Date.now() < end && paused.length < 2) await sleep(25);
  const denied = paused.find(p => p.request.url.includes("/waitlist"));
  const stalled = paused.find(p => p.request.url.includes("/answer-reports"));
  assert.ok(denied && stalled, "both requests paused for auth/stall check");
  await fulfill(denied.requestId, 401, { error: "Synthetic unauthorized" });
  await wait("document.querySelector('[data-testid=status-inbox-auth]')");
  assert.equal(await evaluate("document.querySelectorAll('.pw-leads').length"), 0, "401 must clear while reports request remains stalled");
  await fulfill(stalled.requestId, 200, { records: [{ id: 999999, email: "synthetic-private@example.invalid", createdAt: "2099-01-01T00:00:00Z" }], total: 1, offset: 0, limit: 25 }).catch(() => {});
  await sleep(300);
  assert.equal(await evaluate("document.querySelectorAll('.pw-leads').length"), 0, "late response must not restore records");
  synthetic.push("401 clears while other list stalled");
  await cmd("Fetch.disable");

  // Pause both successful requests, lock before they complete, then deliver them late.
  await go(1440); await interceptStart(); await fill("input-inbox-token", token); await click("button-open-inbox");
  const delayed = await drain(async () => {});
  assert.equal(delayed.length, 2, "delayed initial requests intercepted");
  await click("button-lock-inbox-auth"); await wait("document.querySelector('[data-testid=input-inbox-token]')");
  for (const p of delayed) await fulfill(p.requestId, 200, { records: [{ id: 999998, email: "synthetic-late@example.invalid", createdAt: "2099-01-01T00:00:00Z" }], total: 1, offset: 0, limit: 25 }).catch(() => {});
  await sleep(300);
  assert.equal(await evaluate("document.querySelectorAll('.pw-leads').length"), 0);
  synthetic.push("lock defeats delayed initial response");
  await cmd("Fetch.disable");

  // Same stale-response guarantee for an in-flight Refresh request.
  await openInbox();
  await interceptStart(); await click("button-refresh-inbox");
  const refreshRequests = await drain(async () => {});
  assert.equal(refreshRequests.length, 2, "delayed refresh requests intercepted");
  await click("button-lock-inbox"); await wait("document.querySelector('[data-testid=input-inbox-token]')");
  for (const p of refreshRequests) await fulfill(p.requestId, 200, { records: [{ id: 999997, email: "synthetic-refresh@example.invalid", createdAt: "2099-01-01T00:00:00Z" }], total: 1, offset: 0, limit: 25 }).catch(() => {});
  await sleep(300);
  assert.equal(await evaluate("document.querySelectorAll('.pw-leads').length"), 0);
  synthetic.push("lock defeats delayed refresh responses");
  await cmd("Fetch.disable");

  // Keyboard focus and label association on mobile as well as desktop; screenshot locked at mobile.
  await go(390); await shot("390-locked-keyboard");
  await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await cmd("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  const focus = await evaluate("({tag:document.activeElement.tagName,label:document.activeElement.labels?.[0]?.textContent||'',outline:getComputedStyle(document.activeElement).outlineStyle})");
  assert.equal(focus.tag, "A", "first Tab should focus the promotion-leads link");
  assert.notEqual(focus.outline, "none", "keyboard focus must remain visibly indicated");
  assert.equal(await evaluate("document.querySelector('[data-testid=input-inbox-token]').labels.length"), 1);
  assert.ok(!hasAxe || audits.every(a => a.violations.length === 0), "axe AA audit violations");
  await writeFile(new URL("inbox-browser-checks.json", output), JSON.stringify({
    protectedApi: protectedApi.map(r => ({ status: r.status, keys: Object.keys(r.body), robots: r.robots })),
    responsiveThemes: [1440, 390].flatMap(width => ["light", "dark"].map(theme => `${width}px ${theme}`)),
    axe: hasAxe ? audits : "not run: axe-core CDN unavailable", synthetic,
  }, null, 2));
  console.log("Verified admin inbox journey", JSON.stringify({ synthetic, axeAvailable: hasAxe, audits }));
} finally {
  await ws.close();
}