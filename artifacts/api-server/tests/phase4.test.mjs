import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
import express from "express";

const temporary = await mkdtemp(`${tmpdir()}/paw-phase4-tests-`);
const bundled = await build({
  stdin: { contents: `
    export * from "./src/lib/vet-directory";
    export * from "./src/lib/transient-photo";
    export { createVetsRouter } from "./src/routes/vets";
    export { default as promotion } from "./src/routes/promotion";
    export { db, pool, clinicApplications, advertiserInquiries } from "@workspace/db";
    export { eq } from "drizzle-orm";
  `, resolveDir: new URL("../", import.meta.url).pathname, loader: "ts" },
  bundle: true, platform: "node", format: "cjs", write: false, external: ["pg-native"],
});
const file = `${temporary}/test.cjs`;
await writeFile(file, bundled.outputFiles[0].contents);
const api = createRequire(import.meta.url)(file);
const { openingStatus, distanceKm, osmClinic, createVetDirectory, validateTransientPhoto, DirectoryError } = api;
const date = new Date("2026-10-05T10:00:00Z"); // Monday, 11:00 in London.
const baseClinic = { id: "test-a", name: "Test clinic", latitude: 51.501, longitude: -0.12, address: "Test address", emergency: false };
const provider = {
  name: "Test provider", attribution: "Test fixture only",
  resolvePlace: async () => ({ latitude: 51.50, longitude: -0.12, area: "Test area" }),
  findClinics: async () => [
    { ...baseClinic, id: "far", latitude: 51.58, openingHours: "24/7" },
    { ...baseClinic, id: "near", openingHours: 'Mo-Fr 09:00-17:00; Sa 10:00-12:00; Su off', emergency: true },
    { ...baseClinic, id: "unknown", latitude: 51.52, openingHours: "Mo-Fr 09:00-17:00; PH off" },
    { ...baseClinic, id: "outside", latitude: 52.5, openingHours: "24/7", emergency: true },
  ],
};
let server, base;
const created = [];
const logs = [];
before(async () => {
  // A fixture token in this isolated test process; the workspace secret is never read or printed.
  process.env.ANALYTICS_ADMIN_TOKEN = "phase4-isolated-test-token";
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.log = { info: (...args) => logs.push(args), warn: (...args) => logs.push(args), error: (...args) => logs.push(args) }; next(); });
  app.use(api.createVetsRouter(provider));
  app.use(api.promotion);
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  for (const [table, id] of created) await api.db.delete(table).where(api.eq(table.id, id));
  await api.pool.end();
  await new Promise(resolve => server.close(resolve));
  await rm(temporary, { recursive: true });
});
const post = (path, body) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("timezone-aware weekly and overnight hours, conservative unknown syntax", () => {
  assert.equal(openingStatus("24/7", "Europe/London", date), "open");
  assert.equal(openingStatus("Mo-Fr 09:00-17:00; Su off", "Europe/London", date), "open");
  assert.equal(openingStatus("Mo-Fr 09:00-17:00", "America/New_York", date), "closed");
  assert.equal(openingStatus("Mo 22:00-02:00", "Europe/London", new Date("2026-10-06T00:00:00Z")), "open");
  assert.equal(openingStatus("Mo 22:00-02:00", "Europe/London", new Date("2026-10-06T02:00:00Z")), "closed");
  for (const hours of [undefined, "by appointment", "PH off", "Mo-Fr 09:00-17:00; PH off", "Mo 25:00-28:00", "Mo-Su 09:00-17:00; Mo off"]) {
    assert.equal(openingStatus(hours, "Europe/London", date), "unknown", hours);
  }
  assert.equal(openingStatus("Mo-Fr 09:00-17:00", "bad-zone", date), "unknown");
});
test("distance sorting, radius bounds, emergency/24-hour and open-now filtering", async () => {
  const search = createVetDirectory(provider);
  const result = await search({ query: "Fixture city", urgent: true }, date);
  assert.deepEqual(result.clinics.map(c => c.id), ["near", "unknown", "far"]);
  assert.ok(result.clinics.every(c => c.sponsored === false));
  assert.equal(result.urgent, true);
  assert.match(result.notice, /incomplete/);
  assert.ok(result.clinics.every((c, i, list) => i === 0 || list[i - 1].distanceKm <= c.distanceKm));
  assert.deepEqual((await search({ query: "Fixture city", openNow: true }, date)).clinics.map(c => c.id), ["near", "far"]);
  assert.deepEqual((await search({ latitude: 51.5, longitude: -0.12, emergencyOnly: true }, date)).clinics.map(c => c.id), ["near", "far"]);
  assert.ok(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) > 111);
});
test("OSM normalization is honest about missing fields and rejects unsafe websites", () => {
  const clinic = osmClinic({ type: "way", id: 12, center: { lat: 51.5, lon: -0.12 }, tags: { opening_hours: "24/7", website: "javascript:alert(1)" } });
  assert.equal(clinic.id, "osm-way-12");
  assert.equal(clinic.name, "Veterinary clinic");
  assert.equal(clinic.hasName, false);
  assert.match(clinic.address, /not recorded/);
  assert.equal(clinic.website, undefined);
  assert.equal(clinic.emergency, false, "24/7 does not invent emergency capabilities");
  assert.equal(osmClinic({ type: "node", id: 4, lat: 100, lon: 0 }), null);
  assert.equal(osmClinic(null), null);
  assert.equal(osmClinic({ type: "node", id: 5, lat: 0, lon: 0, tags: { emergency: "yes" } }).emergency, true);
});
test("transient photo validation checks format, signature and decoded size", () => {
  const jpeg = "data:image/jpeg;base64," + Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1]).toString("base64");
  assert.equal(validateTransientPhoto(jpeg), jpeg);
  assert.equal(validateTransientPhoto(), undefined);
  for (const bad of ["https://example.invalid/image.jpg", "data:image/svg+xml;base64,AAAA", "data:image/jpeg;base64,AAAAAAAAAAAAAAAA", "data:image/png;base64,not-base64"]) {
    assert.throws(() => validateTransientPhoto(bad));
  }
  assert.throws(() => validateTransientPhoto("data:image/jpeg;base64," + Buffer.alloc(3_000_001).toString("base64")));
});
test("provider failure is explicit, never replaced by fake clinic data", async () => {
  await assert.rejects(createVetDirectory({ ...provider, findClinics: async () => { throw new DirectoryError("Public service unavailable"); } })({ query: "Fixture city" }), /unavailable/);
});
test("search API validates exclusive city/position inputs and never logs them", async () => {
  for (const input of [{}, { latitude: 51 }, { latitude: 95, longitude: 0 }, { query: "City", latitude: 51, longitude: 0 }, { query: " " }]) {
    assert.equal((await post("/vets/search", input)).status, 400);
  }
  const response = await post("/vets/search", { latitude: 51.50123456, longitude: -0.12345678, urgent: true });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok((await response.json()).clinics.length > 0);
  const logged = JSON.stringify(logs);
  assert.ok(!logged.includes("51.50123456") && !logged.includes("-0.12345678"));
  assert.ok(!logged.includes("latitude") && !logged.includes("longitude"));
});
test("lead APIs reject absent consent, honeypots, unsafe URLs and invalid placements", async () => {
  const clinic = { clinicName: "Phase 4 QA clinic", contactEmail: "qa@phase4.invalid", city: "Fixture city", message: "An isolated automated test.", consent: true };
  for (const input of [{ ...clinic, consent: false }, { ...clinic, fax: "bot" }, { ...clinic, website: "javascript:alert(1)" }]) {
    assert.equal((await post("/promotion/clinic-applications", input)).status, 400);
  }
  assert.equal((await post("/promotion/advertiser-inquiries", { brandName: "QA fixture", contactEmail: "qa@phase4.invalid", message: "An isolated automated test.", consent: true, placements: ["fake-slot"] })).status, 400);
});
test("both leads persist and admin access is header-protected; test records are cleaned up", async () => {
  const clinicResponse = await post("/promotion/clinic-applications", { clinicName: "Phase 4 QA clinic", contactEmail: "qa@phase4.invalid", city: "Fixture city", message: "An isolated automated test, removed on completion.", consent: true, intent: "both", fax: "" });
  assert.equal(clinicResponse.status, 201);
  const clinic = await clinicResponse.json(); created.push([api.clinicApplications, clinic.id]);
  assert.match(clinic.message, /No email was sent/);
  const adResponse = await post("/promotion/advertiser-inquiries", { brandName: "Phase 4 QA advertiser", contactEmail: "qa@phase4.invalid", message: "An isolated automated test, removed on completion.", consent: true, placements: ["newsletter", "product-box"], fax: "" });
  assert.equal(adResponse.status, 201);
  const ad = await adResponse.json(); created.push([api.advertiserInquiries, ad.id]);
  assert.equal((await fetch(base + "/promotion/leads")).status, 401);
  assert.equal((await fetch(base + "/promotion/leads", { headers: { "x-admin-token": "wrong" } })).status, 401);
  const authenticated = await fetch(base + "/promotion/leads", { headers: { "x-admin-token": "phase4-isolated-test-token" } });
  assert.equal(authenticated.status, 200);
  assert.equal(authenticated.headers.get("cache-control"), "no-store");
  const leads = await authenticated.json();
  assert.ok(leads.clinicApplications.some(row => row.id === clinic.id && row.intent === "both" && row.consent));
  assert.ok(leads.advertiserInquiries.some(row => row.id === ad.id && row.placements.includes("newsletter") && row.consent));
  assert.ok(leads.clinicTotal >= 1 && leads.advertiserTotal >= 1);
  assert.ok(leads.clinicApplications.length <= 100 && leads.advertiserInquiries.length <= 100);
});