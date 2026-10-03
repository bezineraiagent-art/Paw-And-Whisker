import { createHash } from "node:crypto";
import tzLookup from "tz-lookup";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { VetClinic, VetSearchInput, VetSearchResult } from "@workspace/api-zod";

export type Origin = { latitude: number; longitude: number };
export type Place = Origin & { area: string };
export type ClinicListing = Omit<VetClinic, "distanceKm" | "openingStatus" | "sponsored">;
export interface VetDirectoryProvider {
  readonly name: string;
  readonly attribution: string;
  resolvePlace(query: string): Promise<Place>;
  findClinics(origin: Origin): Promise<ClinicListing[]>;
}
export class DirectoryError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}
const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
export function distanceKm(a: Origin, b: Origin) {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const dlat = rad(b.latitude - a.latitude), dlon = rad(b.longitude - a.longitude);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
// Only reliably supported schedules are interpreted. Holidays, comments, seasonal rules,
// appointment-only hours and overlapping clauses are deliberately unknown, never guessed.
export function openingStatus(hours: string | undefined, timezone: string, now = new Date()): VetClinic["openingStatus"] {
  if (!hours) return "unknown";
  if (hours.trim() === "24/7") return "open";
  const schedules: { days: Set<number>; ranges: [number, number][] }[] = [];
  const occupied = new Set<number>();
  for (const clause of hours.split(";")) {
    const match = clause.trim().match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)\s+(off|closed|\d{2}:\d{2}-\d{2}:\d{2}(?:,\s*\d{2}:\d{2}-\d{2}:\d{2})*)$/);
    if (!match) return "unknown";
    const selected = new Set<number>();
    for (const span of match[1].split(",")) {
      const [first, last = first] = span.split("-");
      const start = days.indexOf(first), end = days.indexOf(last);
      for (let i = start; ; i = (i + 1) % 7) { selected.add(i); if (i === end) break; }
    }
    if ([...selected].some(day => occupied.has(day))) return "unknown";
    selected.forEach(day => occupied.add(day));
    const ranges: [number, number][] = [];
    if (!["off", "closed"].includes(match[2])) for (const range of match[2].split(",")) {
      const values = range.trim().split("-").map(time => {
        const [h, m] = time.split(":").map(Number);
        return h > 24 || m > 59 || (h === 24 && m !== 0) ? NaN : h * 60 + m;
      });
      if (values.some(Number.isNaN) || values[0] === values[1] || values[0] === 1440) return "unknown";
      ranges.push([values[0], values[1]]);
    }
    schedules.push({ days: selected, ranges });
  }
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
    const today = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(part("weekday"));
    const minute = Number(part("hour")) * 60 + Number(part("minute"));
    for (const schedule of schedules) {
      if (schedule.days.has(today) && schedule.ranges.some(([from, to]) => from < to ? minute >= from && minute < to : minute >= from)) return "open";
      if (schedule.days.has((today + 6) % 7) && schedule.ranges.some(([from, to]) => from > to && minute < to)) return "open";
    }
    return "closed";
  } catch { return "unknown"; }
}
type Cached<T> = { value?: T; error?: DirectoryError; expires: number };
class BoundedCache<T> {
  private values = new Map<string, Cached<T>>();
  private pending = new Map<string, Promise<T>>();
  async get(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
    const cached = this.values.get(key);
    if (cached && cached.expires > Date.now()) {
      if (cached.error) throw cached.error;
      return cached.value!;
    }
    const pending = this.pending.get(key);
    if (pending) return pending;
    const job = load().then(value => {
      this.save(key, { value, expires: Date.now() + ttl }); return value;
    }).catch(error => {
      const safe = error instanceof DirectoryError ? error : new DirectoryError("The public map service is unavailable. Please try again shortly, or contact a clinic directly.");
      this.save(key, { error: safe, expires: Date.now() + 15_000 }); throw safe;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, job);
    return job;
  }
  private save(key: string, value: Cached<T>) {
    for (const [k, v] of this.values) if (v.expires <= Date.now()) this.values.delete(k);
    if (this.values.size >= 256) this.values.delete(this.values.keys().next().value!);
    this.values.set(key, value);
  }
}
class Throttle {
  private tail: Promise<void> = Promise.resolve();
  private lastStart = 0;
  private queued = 0;
  constructor(private interval: number) {}
  async run<T>(job: () => Promise<T>): Promise<T> {
    if (this.queued >= 5) throw new DirectoryError("The map service is busy. Please try again in a moment.");
    this.queued++;
    const wait = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    await wait;
    try {
      const delay = Math.max(0, this.lastStart + this.interval - Date.now());
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      this.lastStart = Date.now();
      return await job();
    } finally { this.queued--; release(); }
  }
}
const userAgent = "PawAndWhisker/1.0 (+https://pawandwhisker.net; contact: paul@pawandwhisker.net)";
const nominThrottle = new Throttle(1100);
const overpassThrottle = new Throttle(1100);
async function upstream<T>(service: "nominatim" | "overpass", job: () => Promise<T>): Promise<T> {
  // The database lock also covers multiple API processes. Waiting under this
  // shared lock enforces the application's 1 request/second policy, not 1 per user.
  return db.transaction(async tx => {
    const lock = await tx.execute<{ locked: boolean }>(sql`select pg_try_advisory_xact_lock(hashtext(${`paw-vet-${service}`})) as locked`);
    if (!lock.rows[0]?.locked) throw new DirectoryError("The public map service is busy. Please try again in a moment.");
    await tx.execute(sql`select pg_sleep(1.1)`);
    return job();
  });
}
async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(22_000), headers: {
    Accept: "application/json", "User-Agent": userAgent, ...init?.headers,
  } });
  if (!response.ok) throw new DirectoryError("The public map service is unavailable or busy. Please try again shortly; call a clinic directly for urgent care.");
  return response.json();
}
type OsmElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
function safeUrl(value?: string) {
  try {
    const url = new URL(value ?? "");
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
export function osmClinic(element: OsmElement): ClinicListing | null {
  if (!element || !["node", "way", "relation"].includes(element.type) || !Number.isSafeInteger(element.id)) return null;
  const latitude = element.lat ?? element.center?.lat, longitude = element.lon ?? element.center?.lon;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude!) > 90 || Math.abs(longitude!) > 180) return null;
  const tags = element.tags ?? {};
  const value = (key: string) => typeof tags[key] === "string" ? tags[key].slice(0, 2048) : undefined;
  const hours = value("opening_hours");
  const street = [value("addr:housenumber"), value("addr:street")].filter(Boolean).join(" ");
  return {
    id: `osm-${element.type}-${element.id}`, name: value("name") || "Veterinary clinic (name not recorded)",
    latitude: latitude!, longitude: longitude!,
    address: [street, value("addr:city"), value("addr:postcode"), value("addr:country")].filter(Boolean).join(", ") || "Address not recorded — use the map and call ahead",
    phone: value("contact:phone") ?? value("phone"), website: safeUrl(value("contact:website") ?? value("website")),
    openingHours: hours,
    emergency: value("emergency") === "yes" || value("emergency:service") === "yes" || value("healthcare:speciality")?.split(";").includes("emergency") === true,
  };
}
export class OpenStreetMapProvider implements VetDirectoryProvider {
  readonly name = "OpenStreetMap via Nominatim and Overpass";
  readonly attribution = "© OpenStreetMap contributors · ODbL";
  private places = new BoundedCache<Place>();
  private clinics = new BoundedCache<ClinicListing[]>();
  async resolvePlace(query: string): Promise<Place> {
    const key = createHash("sha256").update(query.trim().toLowerCase()).digest("hex");
    return this.places.get(key, 6 * 3600_000, () => nominThrottle.run(() => upstream("nominatim", async () => {
      const url = new URL("/search", process.env.VET_NOMINATIM_URL ?? "https://nominatim.openstreetmap.org");
      url.search = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", addressdetails: "1" }).toString();
      const results = await fetchJson(url.href);
      const item = Array.isArray(results) ? results[0] : undefined;
      if (!item || !Number.isFinite(Number(item.lat)) || !Number.isFinite(Number(item.lon))) throw new DirectoryError("We couldn't find that city or postcode. Try adding the region or country.", 404);
      // City/postcode centroids are approximate, not a visitor's exact position.
      const address = item.address ?? {};
      const area = [address.city ?? address.town ?? address.village ?? address.county ?? "Search area", address.state, address.country].filter(x => typeof x === "string").join(", ").slice(0, 200);
      return { latitude: Math.round(Number(item.lat) * 100) / 100, longitude: Math.round(Number(item.lon) * 100) / 100, area };
    })));
  }
  async findClinics(origin: Origin): Promise<ClinicListing[]> {
    // Query/cache a ~5km region, not the visitor's coordinates. OSM clinic coordinates are public data.
    const lat = Math.round(origin.latitude * 20) / 20, lon = Math.round(origin.longitude * 20) / 20;
    return this.clinics.get(`${lat}:${lon}`, 6 * 3600_000, () => overpassThrottle.run(() => upstream("overpass", async () => {
      const query = `[out:json][timeout:18];(nwr["amenity"="veterinary"](around:30000,${lat},${lon});nwr["healthcare"="veterinary"](around:30000,${lat},${lon}););out center 600;`;
      const raw = await fetchJson(process.env.VET_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ data: query }),
      });
      const data = raw && typeof raw === "object" ? raw as { elements?: unknown; remark?: unknown } : {};
      if (!Array.isArray(data.elements) || data.remark) throw new DirectoryError("The public clinic search couldn't finish. Please try again shortly or contact a clinic directly.");
      return (data.elements as OsmElement[]).map(osmClinic).filter((item): item is ClinicListing => !!item);
    })));
  }
}
// Inject another provider (for example Google Places) here without changing the public UI contract.
export function createVetDirectory(provider: VetDirectoryProvider) {
  return async (input: VetSearchInput, now = new Date()): Promise<VetSearchResult> => {
    const place: Place = input.query
      ? await provider.resolvePlace(input.query.trim())
      : { latitude: input.latitude!, longitude: input.longitude!, area: "Near your chosen location" };
    const source = await provider.findClinics(place);
    const deduplicated = [...new Map(source.map(item => [item.id, item])).values()];
    const clinics = deduplicated.map(clinic => {
      let status: VetClinic["openingStatus"] = "unknown";
      try { status = openingStatus(clinic.openingHours, tzLookup(clinic.latitude, clinic.longitude), now); } catch { /* Never guess the clinic's timezone. */ }
      return { ...clinic, distanceKm: distanceKm(place, clinic), openingStatus: status, sponsored: false };
    }).filter(clinic => clinic.distanceKm <= 25 && (!input.openNow || clinic.openingStatus === "open") && (!input.emergencyOnly || clinic.emergency || clinic.openingHours?.trim() === "24/7"))
      .sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id)).slice(0, 50);
    return { clinics, latitude: place.latitude, longitude: place.longitude, area: place.area, urgent: !!input.urgent,
      source: provider.name, attribution: provider.attribution, radiusKm: 25,
      mapTilesUrl: process.env.VET_MAP_TILES_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      mapAttribution: process.env.VET_MAP_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      notice: "This list may be incomplete. Distances are straight-line estimates, not driving distances. Hours and emergency tags may be missing or outdated. Unknown hours are excluded from Open now. Call ahead; no listing confirms a clinic can treat your pet. Urgent results are always sorted by distance with no sponsored placement." };
  };
}