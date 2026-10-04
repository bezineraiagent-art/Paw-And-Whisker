import type { VetSearchInput } from "@workspace/api-zod";
import { DirectoryError } from "./vet-errors";

export const countryNames = { us: "United States", ca: "Canada", gb: "United Kingdom", au: "Australia" } as const;
type Country = keyof typeof countryNames;
export type GeocodeOptions = Pick<VetSearchInput, "country" | "autoDetectCountry">;
export type SearchPlace = { latitude: number; longitude: number; area: string; countryCode: string; countryDetected: boolean; geocodingSource: string };
export type GeoRequest = (service: "nominatim" | "postal", url: string) => Promise<any>;

export function geocodeIntent(query: string, options: GeocodeOptions = {}) {
  let text = query.trim().replace(/\s+/g, " ");
  // Strip an explicit country suffix only for recognizable postcodes below.
  const suffix = text.match(/(?:,?\s+)(USA?|United States|Canada|UK|United Kingdom|Australia)$/i);
  const qualified: Country | undefined = suffix
    ? /^(US|USA|United States)$/i.test(suffix[1]) ? "us"
      : /^Canada$/i.test(suffix[1]) ? "ca" : /^Australia$/i.test(suffix[1]) ? "au" : "gb"
    : undefined;
  const candidate = (suffix ? text.slice(0, suffix.index) : text).toUpperCase().trim();
  let detected: Country | undefined, postalcode: string | undefined;
  if (/^\d{5}(?:-\d{4})?$/.test(candidate)) { detected = "us"; postalcode = candidate.slice(0, 5); }
  else if (/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d$/.test(candidate)) {
    detected = "ca"; const compact = candidate.replace(/\s/g, ""); postalcode = `${compact.slice(0, 3)} ${compact.slice(3)}`;
  } else if (/^(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/.test(candidate)) {
    detected = "gb"; const compact = candidate.replace(/\s/g, ""); postalcode = `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  } else if (/^\d{4}$/.test(candidate)) { detected = "au"; postalcode = candidate; }
  const selected = options.country ?? "us";
  const auto = selected === "us" && options.autoDetectCountry !== false;
  let country: Country | undefined = selected === "anywhere" ? undefined : selected;
  if (detected && (auto || selected === "anywhere")) country = qualified ?? detected;
  if (postalcode && ((qualified && country !== qualified) || (detected && country !== detected))) {
    throw new DirectoryError("That postcode doesn't match the selected country. Choose its country or add a city and state.", 400);
  }
  // Recognizable postcodes under Anywhere still get a country restriction; never global numeric ZIPs.
  if (postalcode) text = postalcode;
  return { query: text, postalcode, country, countryDetected: !!detected && (auto || selected === "anywhere") };
}

function coordinates(lat: unknown, lon: unknown) {
  if ((typeof lat !== "string" && typeof lat !== "number") || (typeof lon !== "string" && typeof lon !== "number") || String(lat).trim() === "" || String(lon).trim() === "") return null;
  const latitude = Number(lat), longitude = Number(lon);
  return Number.isFinite(latitude) && Math.abs(latitude) <= 85 && Number.isFinite(longitude) && Math.abs(longitude) <= 180
    ? { latitude: Math.round(latitude * 100) / 100, longitude: Math.round(longitude * 100) / 100 } : null;
}
const string = (v: unknown) => typeof v === "string" ? v.trim().slice(0, 200) : "";
export async function resolveGeocode(query: string, options: GeocodeOptions, request: GeoRequest): Promise<SearchPlace> {
  const intent = geocodeIntent(query, options);
  const notFound = () => new DirectoryError(`We couldn't verify that place${intent.country ? ` in ${countryNames[intent.country]}` : ""}. Not the right place? Add your city or state, or check the country selection.`, 404);
  let match: any, foreign = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const url = new URL("/search", process.env.VET_NOMINATIM_URL ?? "https://nominatim.openstreetmap.org");
    const params = new URLSearchParams({ format: "jsonv2", addressdetails: "1", limit: "5", "accept-language": "en" });
    if (intent.postalcode) params.set("postalcode", intent.postalcode);
    else params.set("q", intent.query);
    if (intent.country) params.set("countrycodes", intent.country);
    if (attempt && intent.postalcode && intent.country) params.set("country", countryNames[intent.country]);
    url.search = params.toString();
    const result = await request("nominatim", url.href);
    if (!Array.isArray(result)) throw new DirectoryError("The geocoder returned an invalid response. Please try again.");
    foreign ||= result.some(item => intent.country && item?.address?.country_code !== intent.country);
    match = result.find(item => {
      const code = string(item?.address?.country_code).toLowerCase();
      const postcode = string(item?.address?.postcode).replace(/\s/g, "").toUpperCase();
      return /^[a-z]{2}$/.test(code) && (!intent.country || code === intent.country)
        && (!intent.postalcode || postcode === intent.postalcode.replace(/\s/g, ""))
        && coordinates(item?.lat, item?.lon);
    });
    if (match) break;
  }
  if (!match && foreign) throw notFound();

  // US postal mailing localities can differ from Nominatim's administrative city
  // (e.g. Beverly Hills vs Los Angeles). Use a general ZIP dataset, not special cases.
  if (intent.country === "us" && intent.postalcode) {
    const url = new URL(`/us/${encodeURIComponent(intent.postalcode)}`, process.env.VET_POSTAL_URL ?? "https://api.zippopotam.us");
    const postal = await request("postal", url.href);
    const place = postal?.places?.[0];
    const point = coordinates(place?.latitude, place?.longitude);
    if (postal?.["country abbreviation"] !== "US" || postal?.["post code"] !== intent.postalcode || !point || !string(place?.["place name"]) || !string(place?.state)) throw notFound();
    const stateCode = string(match?.address?.["ISO3166-2-lvl4"]);
    if (stateCode && stateCode !== `US-${place["state abbreviation"]}`) throw notFound();
    return { ...point, area: `${string(place["place name"])}, ${string(place.state)}, United States`, countryCode: "us", countryDetected: intent.countryDetected, geocodingSource: "Nominatim; US postal areas: Zippopotam.us / GeoNames" };
  }
  if (!match) throw notFound();
  const address = match.address;
  const area = [address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? "Search area", address.state ?? address.province, address.country].map(string).filter(Boolean).join(", ").slice(0, 200);
  return { ...coordinates(match.lat, match.lon)!, area, countryCode: string(address.country_code).toLowerCase(), countryDetected: intent.countryDetected, geocodingSource: "Nominatim / OpenStreetMap" };
}