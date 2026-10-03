import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

process.env.PORT ||= "21283";
const { handleRequest } = await import("../server.mjs");
const { routeFiles, guideRedirects, privatePaths } = JSON.parse(await readFile(new URL("../dist/public/routes.json", import.meta.url), "utf8"));
let server;
let base;
before(async () => {
  server = createServer(handleRequest);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

test("every actual route has unique server-visible SEO and private pages are noindex", async () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const route of Object.keys(routeFiles)) {
    const res = await fetch(base + route);
    assert.equal(res.status, 200, route);
    const html = await res.text();
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    const description = html.match(/name="description" content="([^"]*)"/)[1];
    assert.ok(!titles.has(title), `duplicate title: ${route}`);
    assert.ok(!descriptions.has(description), `duplicate description: ${route}`);
    titles.add(title);
    descriptions.add(description);
    assert.ok(html.includes(`rel="canonical" href="https://pawandwhisker.net${route}"`), route);
    for (const key of ["og:title", "og:description", "og:url", "og:image", "twitter:card", "twitter:title", "twitter:description", "twitter:image"]) assert.ok(html.includes(key), key);
    if (privatePaths.includes(route)) {
      assert.ok(html.includes('name="robots" content="noindex, follow"'));
      assert.equal(res.headers.get("x-robots-tag"), "noindex, follow");
    }
  }
});

test("guides and legal pages contain readable HTML and footer links without JavaScript", async () => {
  for (const route of ["/guides", "/guides/new-puppy-checklist", "/guides/puppy-first-30-days", "/guides/toxic-foods-for-puppies", "/privacy", "/terms", "/refund", "/medical-disclaimer", "/pricing", "/puppy-kit/"]) {
    const html = await (await fetch(base + route)).text();
    assert.ok(html.includes("<h1>"), route);
    assert.ok(html.includes("<h2>"), route);
    assert.ok(html.includes("<footer"), route);
    for (const legal of ["/privacy", "/terms", "/refund", "/medical-disclaimer"]) assert.ok(html.includes(`href="${legal}"`), route);
  }
  const checklist = await (await fetch(base + "/guides/new-puppy-checklist")).text();
  assert.ok(checklist.includes("Buy before day one"));
  assert.ok(checklist.includes("Enzyme cleaner"));
  const month = await (await fetch(base + "/guides/puppy-first-30-days")).text();
  assert.ok(month.includes("Week 4"));
  const foods = await (await fetch(base + "/guides/toxic-foods-for-puppies")).text();
  assert.ok(foods.includes("Xylitol"));
  assert.ok(foods.includes("(888) 426-4435"));
});

test("legacy guide URLs redirect permanently, preserving query parameters", async () => {
  for (const [oldUrl, newUrl] of Object.entries(guideRedirects)) {
    const res = await fetch(base + oldUrl + "?from=old", { redirect: "manual" });
    assert.equal(res.status, 301);
    assert.equal(res.headers.get("location"), newUrl + "?from=old");
  }
  const slash = await fetch(base + "/guides/", { redirect: "manual" });
  assert.equal(slash.status, 301);
  assert.equal(slash.headers.get("location"), "/guides");
});

test("unknown URLs and missing assets are friendly real HTTP 404s", async () => {
  for (const route of ["/missing-page", "/guides/does-not-exist", "/missing.js", "/index.html", "/routes.json", "/guides/missing.html"]) {
    const res = await fetch(base + route);
    assert.equal(res.status, 404, route);
    const html = await res.text();
    assert.ok(html.includes("couldn&#x27;t find that page"), route);
    assert.ok(html.includes("Back to home"), route);
    assert.ok(html.includes("<footer"), route);
    assert.equal(res.headers.get("x-robots-tag"), "noindex, follow");
  }
  assert.equal((await fetch(base + "/missing", { method: "HEAD" })).status, 404);
});

test("robots and sitemap list only actual public pages; assets still work", async () => {
  const robots = await (await fetch(base + "/robots.txt")).text();
  assert.ok(robots.includes("Allow: /"));
  assert.ok(robots.includes("Disallow: /admin"));
  assert.ok(robots.includes("Disallow: /api"));
  const sitemap = await (await fetch(base + "/sitemap.xml")).text();
  for (const route of Object.keys(routeFiles).filter(p => !privatePaths.includes(p))) assert.ok(sitemap.includes(`<loc>https://pawandwhisker.net${route}</loc>`), route);
  for (const route of privatePaths) assert.ok(!sitemap.includes(route), route);
  assert.ok(!sitemap.includes(".html"));
  const logo = await fetch(base + "/app-logo.png");
  assert.equal(logo.status, 200);
  assert.equal(logo.headers.get("content-type"), "image/png");
  const home = await (await fetch(base + "/")).text();
  const script = home.match(/src="([^"]+\.js)"/)[1];
  assert.equal((await fetch(base + script)).status, 200);
});