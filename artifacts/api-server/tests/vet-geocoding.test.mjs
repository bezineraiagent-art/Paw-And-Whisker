import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { queries, responseFor } from "./vet-query-fixtures.mjs";

const temporary = await mkdtemp("/tmp/vet-geocode-tests-");
const compiled = await build({ stdin: { contents: 'export * from "./src/lib/vet-geocoding"; export * from "./src/lib/vet-directory"; export {pool} from "@workspace/db"; export {SearchVetsBody} from "@workspace/api-zod";', resolveDir: new URL("../", import.meta.url).pathname, loader: "ts" }, bundle: true, write: false, platform: "node", format: "cjs", external: ["pg-native"] });
await writeFile(`${temporary}/test.cjs`, compiled.outputFiles[0].contents);
const { resolveGeocode, geocodeIntent, OpenStreetMapProvider, createVetDirectory, osmClinic, SearchVetsBody, pool } = createRequire(import.meta.url)(`${temporary}/test.cjs`);
after(async () => { await pool.end(); await rm(temporary, { recursive: true }); });

for (const row of queries) test(`country/state and real outbound request shape: ${row[0]}`, async () => {
  const fixture = responseFor(row), calls = [];
  const result = await resolveGeocode(row[0], {}, async (service, href) => { calls.push({ service, url: new URL(href) }); return fixture[service]; });
  assert.equal(result.countryCode, row[4]);
  assert.ok(result.area.includes(row[1]) && result.area.includes(row[2]));
  assert.equal(calls[0].url.searchParams.get("countrycodes"), row[4]);
  assert.equal(calls[0].url.searchParams.get("addressdetails"), "1");
  if (row[0] === "Austin, TX") {
    assert.equal(calls[0].url.searchParams.get("q"), "Austin, TX");
    assert.equal(calls[0].url.searchParams.has("postalcode"), false);
  } else {
    assert.equal(calls[0].url.searchParams.has("q"), false);
    assert.equal(calls[0].url.searchParams.get("postalcode"), row[4] === "us" ? row[0].slice(0, 5) : row[0]);
    if (row[4] === "us") assert.equal(calls[1].url.pathname, `/us/${row[0].slice(0, 5)}`);
  }
});
test("detection, explicit choices, Anywhere safety, normalization and API country validation", () => {
  assert.equal(geocodeIntent("2000").country, "au");
  assert.equal(geocodeIntent("m5v3l9").postalcode, "M5V 3L9");
  assert.equal(geocodeIntent("sw1a1aa").postalcode, "SW1A 1AA");
  assert.equal(geocodeIntent("02134").postalcode, "02134");
  assert.equal(geocodeIntent("75201 USA").postalcode, "75201");
  assert.equal(geocodeIntent("75201", { country: "anywhere" }).country, "us");
  assert.equal(geocodeIntent("Paris", { country: "anywhere" }).country, undefined);
  assert.equal(geocodeIntent("London", { country: "gb", autoDetectCountry: true }).country, "gb");
  assert.throws(() => geocodeIntent("M5V 3L9", { country: "us", autoDetectCountry: false }), /selected country/);
  assert.throws(() => geocodeIntent("75201", { country: "ca" }), /selected country/);
  assert.equal(SearchVetsBody.safeParse({ query: "75201", country: "invalid" }).success, false);
  assert.equal(SearchVetsBody.parse({ query: "75201" }).country, "us");
});
test("wrong or missing countries retry once under restriction, never use foreign results", async () => {
  for (const code of ["lt", undefined]) {
    const calls = [];
    await assert.rejects(resolveGeocode("75201", {}, async (service, href) => {
      assert.equal(service, "nominatim");
      const url = new URL(href); calls.push(url);
      return [{ lat: "55", lon: "22", address: { country_code: code, postcode: "75201" } }];
    }), /verify.*United States/);
    assert.equal(calls.length, 2);
    for (const url of calls) { assert.equal(url.searchParams.get("countrycodes"), "us"); assert.ok(!url.searchParams.has("q")); }
    assert.equal(calls[1].searchParams.get("country"), "United States");
  }
});
test("retry accepts corrected country; missing records use verified postal fallback, invalid postal data fails", async () => {
  let calls = 0;
  const fixture = responseFor(queries[0]);
  const place = await resolveGeocode("75201", {}, async service => service === "postal" ? fixture.postal : ++calls === 1 ? [{ lat: "55", lon: "22", address: { country_code: "lt" } }] : fixture.nominatim);
  assert.equal(calls, 2); assert.equal(place.countryCode, "us");
  assert.equal((await resolveGeocode("75201", {}, async service => service === "postal" ? fixture.postal : [])).area, place.area);
  await assert.rejects(resolveGeocode("75201", {}, async service => service === "postal" ? { ...fixture.postal, "country abbreviation": "CA" } : fixture.nominatim), /verify/);
  await assert.rejects(resolveGeocode("75201", {}, async service => service === "postal" ? { ...fixture.postal, "post code": "90210" } : fixture.nominatim), /verify/);
  await assert.rejects(resolveGeocode("SW1A 1AA", {}, async () => []), /United Kingdom/);
  await assert.rejects(resolveGeocode("75201", {}, async () => { throw new Error("provider unavailable"); }), /unavailable/);
});
test("US postal verification corrects administrative locality without special-casing ZIPs", async () => {
  const fixture = responseFor(queries[2]); fixture.nominatim[0].address.city = "Los Angeles";
  const result = await resolveGeocode("90210", {}, async service => fixture[service]);
  assert.equal(result.area, "Beverly Hills, California, United States");
  fixture.nominatim[0].address["ISO3166-2-lvl4"] = "US-TX";
  await assert.rejects(resolveGeocode("90210", {}, async service => fixture[service]), /verify/);
});
test("country/mode-separated cache, coalescing, failure caching and radius-aware coarse map requests", async () => {
  const requests = [];
  const provider = new OpenStreetMapProvider(async (href, init) => {
    const url = new URL(href); requests.push({ url, init });
    if (init) return { elements: [] };
    const code = url.searchParams.get("countrycodes") ?? "fr";
    return [{ lat: "45", lon: "2", address: { city: "Paris", country_code: code, country: code, state: "Fixture state" } }];
  }, async (_service, job) => job());
  await Promise.all([provider.resolvePlace("Paris", { country: "us" }), provider.resolvePlace("Paris", { country: "us" })]);
  assert.equal(requests.length, 1);
  await provider.resolvePlace("Paris", { country: "ca" });
  await provider.resolvePlace("Paris", { country: "anywhere" });
  assert.equal(requests.length, 3);
  const point = { latitude: 51.50123456, longitude: -0.12345678 };
  await provider.findClinics(point, 25); await provider.findClinics(point, 50); await provider.findClinics(point, 50);
  assert.equal(requests.length, 5);
  const bodies = requests.slice(3).map(r => r.init.body.get("data"));
  assert.ok(bodies[0].includes("around:30000") && bodies[1].includes("around:55000"));
  assert.ok(!bodies.join("").includes("51.50123456") && !bodies.join("").includes("-0.12345678"));
  let failed = 0;
  const broken = new OpenStreetMapProvider(async () => { failed++; throw new Error("offline"); }, async (_service, job) => job());
  await assert.rejects(broken.resolvePlace("Missing")); await assert.rejects(broken.resolvePlace("Missing"));
  assert.equal(failed, 1);
});
const clinic = (id, km, hasName = true, more = {}) => ({ id, name: hasName ? id : "Veterinary clinic", hasName, latitude: km / 111.195, longitude: 0, address: "Fixture address", emergency: false, ...more });
const providerFor = clinics => ({ name: "fixture", attribution: "fixture", resolvePlace: async () => ({ latitude: 0, longitude: 0, area: "Fixture US", countryCode: "us" }), findClinics: async (_point, radius) => { assert.ok(radius === 25 || radius === 50); return clinics; } });
test("postcode radii stop at 10/25/50, cap at 50, and respect filters without hiding service failures", async () => {
  for (const [distance, radius] of [[5, 10], [20, 25], [40, 50], [60, 50]]) {
    const result = await createVetDirectory(providerFor([clinic("one", distance)]))({ query: "75201" });
    assert.equal(result.radiusKm, radius);
    assert.equal(result.radiusExpanded, radius > 10);
    assert.equal(result.clinics.length, distance <= 50 ? 1 : 0);
  }
  const result = await createVetDirectory(providerFor([clinic("closed", 5), clinic("open", 40, true, { openingHours: "24/7" })]))({ query: "75201", openNow: true });
  assert.equal(result.radiusKm, 50); assert.equal(result.clinics[0].id, "open");
  assert.equal((await createVetDirectory(providerFor([]))({ query: "75201" })).radiusKm, 50);
  assert.equal((await createVetDirectory(providerFor([clinic("one", 20)]))({ query: "Austin, TX" })).radiusKm, 25);
  await assert.rejects(createVetDirectory({ ...providerFor([]), findClinics: async () => { throw new Error("offline"); } })({ query: "75201" }), /offline/);
});
test("friendly unnamed labels; named preference confined to 500m bands; urgent always strict distance", async () => {
  const unnamed = osmClinic({ type: "node", id: 1, lat: 0, lon: 0, tags: { "addr:street": "Main Street", name: "   " } });
  assert.equal(unnamed.name, "Veterinary clinic — Main Street"); assert.equal(unnamed.hasName, false);
  const search = createVetDirectory(providerFor([clinic("near", 1.1, false), clinic("named", 1.3), clinic("far", 2.2)]));
  assert.deepEqual((await search({ query: "75201" })).clinics.map(c => c.id), ["named", "near", "far"]);
  assert.deepEqual((await search({ query: "75201", urgent: true })).clinics.map(c => c.id), ["near", "named", "far"]);
});