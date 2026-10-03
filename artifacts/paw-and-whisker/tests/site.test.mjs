import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

process.env.PORT ||= "21283";
const { handleRequest } = await import("../server.mjs");
const { routeFiles, guideRedirects, privatePaths } = JSON.parse(await readFile(new URL("../dist/public/routes.json", import.meta.url), "utf8"));
const { pages, foods, riskFor, symptomResult, symptomQuestions } = await import("../dist/server/prerender.js");
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
    assert.ok(/<h1(?:\s|>)/.test(html), route);
    assert.ok(/<h2(?:\s|>)/.test(html), route);
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

test("all public pages, including home and interactive tools, have full initial HTML and structured data", async () => {
  for (const page of pages.filter(p => !p.noindex)) {
    const html = await (await fetch(base + page.path)).text();
    assert.ok(html.includes("<h1"), page.path);
    assert.ok(html.includes("<footer"), page.path);
    assert.ok(page.title.length < 60, `${page.path}: title ${page.title.length}`);
    assert.ok(page.description.length < 160, `${page.path}: description ${page.description.length}`);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json" id="page-schema">([\s\S]*?)<\/script>/)[1]);
    assert.ok(schema.some(s => s["@type"] === "BreadcrumbList"), page.path);
    assert.ok(schema.some(s => s.dateModified === "2026-10-03"), page.path);
    if (["food", "guide", "comparison"].includes(page.kind)) {
      assert.ok(html.includes("By Paul, pet parent and founder"), page.path);
      assert.ok(schema.some(s => s["@type"] === "Article" && s.author.name === "Paul"), page.path);
    }
  }
  const home = await (await fetch(base + "/")).text();
  assert.ok(home.includes("free-chat") && home.includes("Get the free PDF"));
  const checker = await (await fetch(base + "/tools/toxic-food-checker")).text();
  assert.ok(checker.includes("Chocolate") && checker.includes("Strawberries"));
  const quiz = await (await fetch(base + "/tools/symptom-check")).text();
  assert.equal((quiz.match(/<fieldset/g) ?? []).length, 5);
  const results = await (await fetch(base + "/tools/symptom-check/results")).text();
  assert.ok(results.includes("What the results mean") && results.includes("What to tell your vet"));
});

test("Phase 4 public pages render forms and disclosures, while promotion admin is private", async () => {
  const expectations = {
    "/find-a-vet": ["Find a vet near you", "City or postcode", "Use my location", "call ahead"],
    "/for-vets": ["Claim", "clinicName", "contactEmail", "consent"],
    "/advertise": ["media kit", "brandName", "contactEmail", "consent"],
    "/sponsorship-policy": ["Sponsored", "emergency", "independent"],
  };
  for (const [path, expected] of Object.entries(expectations)) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    const html = await response.text();
    for (const text of expected) assert.ok(html.toLowerCase().includes(text.toLowerCase()), `${path}: ${text}`);
    assert.ok(html.includes(`href="https://pawandwhisker.net${path}"`), `${path}: canonical`);
    assert.ok(html.includes("application/ld+json"));
    assert.ok(!html.includes("leaflet-container"), "Leaflet never renders during SSR");
    assert.ok(!html.includes("Reviewed by a licensed veterinarian"));
  }
  assert.ok(privatePaths.includes("/admin/promotions"));
  const admin = await fetch(base + "/admin/promotions");
  assert.equal(admin.headers.get("x-robots-tag"), "noindex, follow");
  const adminHtml = await admin.text();
  assert.ok(adminHtml.includes('name="robots" content="noindex, follow"'));
  const sitemap = await (await fetch(base + "/sitemap.xml")).text();
  assert.ok(!sitemap.includes("/admin/promotions"));
});

test("founder experience is factual and food emergencies enter the sponsorship-free urgent flow", async () => {
  for (const path of ["/", "/about"]) {
    const html = await (await fetch(base + path)).text();
    assert.ok(html.includes("Lucky") && html.includes("Sugar"), path);
    assert.ok(/infection/.test(html), path);
    assert.ok(!/\bsister\b/i.test(html), path);
    assert.ok(/cannot diagnose|can&#x27;t diagnose|not a diagnosis/i.test(html), path);
  }
  for (const page of pages.filter(p => p.path.startsWith("/foods/"))) {
    assert.ok(page.html.includes('/find-a-vet?urgent=1'), page.path);
  }
});

test("three new sourced guides exceed 1,200 words while recovered copy remains intact", () => {
  for (const path of ["/guides/puppy-first-year-cost", "/guides/puppy-crate-sleep", "/guides/puppy-vaccination-schedule"]) {
    const page = pages.find(p => p.path === path);
    const count = page.html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    assert.ok(count >= 1200, `${path}: ${count} words`);
    assert.ok(page.html.includes("Sources and further reading"));
  }
});

test("food reference includes at least 40 foods with conservative species-specific handling", () => {
  assert.ok(foods.length >= 40);
  assert.equal(new Set(foods.map(f => f.slug)).size, foods.length);
  assert.equal(riskFor(foods.find(f => f.slug === "grapes"), "dog"), "toxic");
  assert.equal(riskFor(foods.find(f => f.slug === "grapes"), "cat"), "avoid");
  assert.equal(riskFor(foods.find(f => f.slug === "xylitol"), "puppy"), "toxic");
  assert.equal(riskFor(foods.find(f => f.slug === "onions"), "cat"), "toxic");
  assert.equal(pages.filter(p => p.kind === "food").length, foods.length);
  assert.ok(!pages.some(p => /^\/tools\/toxic-food-checker\/(puppy|dog|cat)\//.test(p.path)));
  for (const food of foods) {
    const page = pages.find(p => p.path === `/tools/toxic-food-checker/${food.slug}`);
    assert.ok(page.html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length >= 500, food.slug);
    assert.ok(page.description.length >= 140 && page.description.length <= 158, food.slug);
    for (const species of ["puppy", "dog", "cat"]) assert.ok(page.html.includes(`id="${species}"`), food.slug + ":" + species);
  }
});

test("48 food articles have substantial distinct copy, visible FAQs and one canonical URL each", async () => {
  const foodPages = pages.filter(page => page.kind === "food");
  assert.equal(foodPages.length, 48);
  const faqQuestions = new Set();
  for (const page of foodPages) {
    const slug = page.path.split("/").pop();
    const article = JSON.parse(await readFile(new URL(`../src/content/food-articles/${slug}.json`, import.meta.url), "utf8"));
    const substantive = [article.verdict, article.mechanism, article.preparation, article.signsAndTiming, article.puppy, article.dog, article.cat, article.alternatives].join(" ");
    assert.ok(substantive.split(/\s+/).length >= 500, `${slug}: copy excluding FAQs and boilerplate`);
    assert.ok(article.faqs.length >= 4 && article.faqs.length <= 6, slug);
    for (const faq of article.faqs) {
      assert.ok(!faqQuestions.has(faq.question.toLowerCase()), `${slug}: repeated FAQ question`);
      faqQuestions.add(faq.question.toLowerCase());
    }
    const html = await (await fetch(base + page.path)).text();
    const schema = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match => JSON.parse(match[1]));
    const faqSchema = schema.find(item => item["@type"] === "FAQPage");
    assert.equal(faqSchema?.mainEntity.length, article.faqs.length, slug);
    assert.ok(html.includes(`<link rel="canonical" href="https://pawandwhisker.net${page.path}">`), slug);
    const block = page.html.match(/<aside class="emergency-notice food-emergency">([\s\S]*?)<\/aside>/)?.[1];
    assert.ok(block && block.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length < 80, slug);
    for (const species of ["puppy", "dog", "cat"]) {
      const res = await fetch(`${base}/tools/toxic-food-checker/${species}/${slug}?ref=legacy`, { redirect: "manual" });
      assert.equal(res.status, 301);
      assert.equal(res.headers.get("location"), page.path + "?ref=legacy");
    }
  }
});

test("public descriptions and expanded decision pages satisfy the requested SEO bounds", () => {
  for (const page of pages.filter(page => !page.noindex)) {
    assert.ok(page.title.length < 60, `${page.path}: title`);
    assert.ok(page.description.length >= 140 && page.description.length <= 158, `${page.path}: description ${page.description.length}`);
    if (["about", "pricing", "compare", "comparison"].includes(page.kind)) {
      const count = page.html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
      assert.ok(count >= (["compare", "comparison"].includes(page.kind) ? 700 : 500), page.path);
      if (["compare", "comparison"].includes(page.kind)) {
        assert.ok(page.html.includes("<table"), `${page.path}: honest comparison table`);
        assert.ok(/not.*(?:test|independent)|not hands-on|haven.t.*test/i.test(page.html), `${page.path}: testing limitation`);
      }
    }
  }
});

test("symptom answers are validated and no combination produces an all-clear", () => {
  assert.equal(symptomResult({}), null);
  assert.equal(symptomResult({ pet: "dog", symptom: "unknown", duration: "hours", eating: "yes", age: "adult" }), null);
  let count = 0;
  function visit(index, answers) {
    if (index === symptomQuestions.length) {
      const result = symptomResult(answers);
      assert.ok(["emergency", "vet"].includes(result.level));
      if (["breathing", "lethargic"].includes(answers.symptom)) assert.equal(result.level, "emergency");
      if (answers.age === "young" && result.level !== "emergency") assert.ok(result.heading.includes("don't wait overnight"));
      count++; return;
    }
    const question = symptomQuestions[index];
    for (const [value] of question.options) visit(index + 1, { ...answers, [question.key]: value });
  }
  visit(0, {});
  assert.equal(count, 648);
});

test("PDF is a genuine file and private routes remain excluded from crawl metadata", async () => {
  const pdf = await fetch(base + "/downloads/10-pet-symptoms.pdf");
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.ok((await pdf.text()).startsWith("%PDF-1.4"));
  const robots = await (await fetch(base + "/robots.txt")).text();
  assert.ok(robots.includes("Disallow: /chat") && robots.includes("Disallow: /success"));
  const sitemap = await (await fetch(base + "/sitemap.xml")).text();
  assert.equal((sitemap.match(/<lastmod>/g) ?? []).length, pages.filter(p => !p.noindex).length);
  const pricing = await (await fetch(base + "/pricing")).text();
  assert.ok(pricing.includes("https://buy.stripe.com/3cI6oG32021Bedm1Xkgw002") && pricing.includes("$4.99"));
  assert.ok(pricing.includes("not available yet"));
});