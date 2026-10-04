// Explicit public samples only; opt-in real provider verification, not normal CI.
// node artifacts/api-server/tests/vet-geocoding-live.mjs
import { queries } from "./vet-query-fixtures.mjs";
import { build } from "esbuild";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
const temporary = await mkdtemp("/tmp/vet-geocode-live-");
const result = await build({ stdin: { contents: 'export * from "./src/lib/vet-geocoding";', resolveDir: new URL("../", import.meta.url).pathname, loader: "ts" }, bundle: true, platform: "node", format: "cjs", write: false });
await writeFile(`${temporary}/geo.cjs`, result.outputFiles[0].contents);
const { resolveGeocode } = createRequire(import.meta.url)(`${temporary}/geo.cjs`);
const rows = [];
const request = async (_service, url) => {
  await new Promise(r => setTimeout(r, 1200));
  const response = await fetch(url, { signal: AbortSignal.timeout(22000), headers: { Accept: "application/json", "User-Agent": "PawAndWhisker/1.0 (+https://pawandwhisker.net; contact: paul@pawandwhisker.net)" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
  return response.json();
};
try {
  for (const [query, city, state, stateCode, code] of queries) {
    const row = { query, expected: `${city}, ${state}, ${code}`, measuredAt: new Date().toISOString() };
    try {
      // Reproduce the old request exactly (limit=1, unrestricted q).
      const before = await request("nominatim", `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: query, format: "jsonv2", limit: "1", addressdetails: "1" })}`);
      row.before = before?.[0]?.address ?? "No result";
    } catch (error) { row.before = { error: error.message }; }
    try {
      row.after = await resolveGeocode(query, {}, request);
      row.countryMatches = row.after.countryCode === code;
      row.stateMatches = row.after.area.includes(state);
    } catch (error) { row.after = { error: error.message }; }
    rows.push(row); console.log(JSON.stringify(row));
  }
  await mkdir(".local/reports", { recursive: true });
  await writeFile(".local/reports/vet-geocoding-live.json", JSON.stringify(rows, null, 2));
} finally { await rm(temporary, { recursive: true }); }