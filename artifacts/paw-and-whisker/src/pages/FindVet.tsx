import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { LocateFixed, Phone, Globe, Navigation, Search } from "lucide-react";
import { searchVets, type VetClinic, type VetSearchInput, type VetSearchResult } from "@workspace/api-client-react";
import SiteHeader from "@/components/SiteHeader";

const VetMap = lazy(() => import("@/components/VetMap"));

function safeUrl(u?: string) { try { const x = new URL(u ?? ""); return x.protocol === "https:" || x.protocol === "http:" ? x.href : null; } catch { return null; } }
function telHref(p: string) { return "tel:" + p.replace(/[^\d+]/g, ""); }
function directions(c: VetClinic) { return `https://www.openstreetmap.org/directions?to=${c.latitude}%2C${c.longitude}`; }
const statusLabel = { open: "Open now (from listed hours)", closed: "Closed (from listed hours)", unknown: "Hours unknown, call ahead" } as const;

export default function FindVet() {
  // Direct call (not a React Query hook) so the page renders without a provider during prerender.
  const [search, setSearch] = useState<{ data?: VetSearchResult; error: Error | null; isPending: boolean }>({ error: null, isPending: false });
  const searchRef = useRef(0);
  const [query, setQuery] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const [locating, setLocating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Last place searched lives only in this ref (never storage, URL or analytics).
  const lastRef = useRef<Pick<VetSearchInput, "query" | "latitude" | "longitude"> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("urgent") === "1") setUrgent(true); }, []);
  useEffect(() => () => abortRef.current?.abort(), []);

  function run(place: NonNullable<typeof lastRef.current>) {
    lastRef.current = place;
    setSelected(null);
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    const timer = setTimeout(() => ctl.abort(), 30000);
    const id = ++searchRef.current;
    setSearch(prev => ({ data: prev.data, error: null, isPending: true }));
    searchVets({ ...place, urgent, openNow, emergencyOnly }, { signal: ctl.signal })
      .then(data => { if (id === searchRef.current) setSearch({ data, error: null, isPending: false }); })
      .catch(e => { if (id === searchRef.current) setSearch({ error: e instanceof Error ? e : new Error("failed"), isPending: false }); })
      .finally(() => clearTimeout(timer));
  }
  const runRef = useRef(run); runRef.current = run;
  const firstFlags = useRef(true);
  useEffect(() => {
    if (firstFlags.current) { firstFlags.current = false; return; }
    if (lastRef.current) runRef.current(lastRef.current);
  }, [urgent, openNow, emergencyOnly]);
  function submit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) { setGeoMsg("Enter a city or postcode, or use your location."); return; }
    setGeoMsg(""); run({ query: q });
  }
  function locate() {
    setGeoMsg("");
    if (!navigator.geolocation) { setGeoMsg("Your browser can't share a location. Search by city or postcode instead."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      p => { setLocating(false); run({ latitude: p.coords.latitude, longitude: p.coords.longitude }); },
      err => { setLocating(false); setGeoMsg(err.code === 1 ? "Location permission was denied. You can still search by city or postcode." : err.code === 3 ? "Finding your location timed out. Try again or search by city or postcode." : "Your location is unavailable right now. Search by city or postcode instead."); },
      { timeout: 10000, maximumAge: 0 },
    );
  }

  const result: VetSearchResult | undefined = search.data;
  const clinics = useMemo(() => {
    if (!result) return [];
    const isUrgent = result.urgent || urgent;
    const list = result.clinics.filter(c => !(isUrgent && c.sponsored));
    return isUrgent ? list.sort((a, b) => a.distanceKm - b.distanceKm) : list;
  }, [result, urgent]);
  const mapResult = useMemo(() => result ? { ...result, clinics } : undefined, [result, clinics]);
  const showUrgent = !!result?.urgent;
  const err = search.error as (Error & { status?: number }) | null;

  return (
    <div className="pw">
      <SiteHeader />
      <main id="main">
        <section className="pw-hero pw-sky small">
          <div className="pw-wrap pw-reveal">
            <p className="pw-eyebrow">Find a vet</p>
            <h1>Find a vet near you</h1>
            <p className="pw-lede">Search by city or postcode, or share your location only if you choose to. Results come from public map data, which can be incomplete or out of date. Always call ahead.</p>
            <div className="emergency-notice"><strong>Emergency? Call the clinic first.</strong><p>If your pet is struggling to breathe, collapsed, bleeding heavily or may have eaten poison, phone the nearest emergency clinic now. Do not wait for AI or this page.</p></div>
          </div>
        </section>
        <section className="pw-section">
          <div className="pw-wrap">
            <form className="pw-form pw-vetform" onSubmit={submit} data-testid="form-vet-search">
              <label>City or postcode<input value={query} onChange={e => setQuery(e.target.value)} maxLength={120} autoComplete="off" placeholder="e.g. Leeds or 90210" data-testid="input-vet-query" /></label>
              <div className="pw-checks">
                <label><input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)} data-testid="check-urgent" /> My pet may be in danger: nearest first</label>
                <label><input type="checkbox" checked={openNow} onChange={e => setOpenNow(e.target.checked)} /> Open now</label>
                <label><input type="checkbox" checked={emergencyOnly} onChange={e => setEmergencyOnly(e.target.checked)} /> Emergency or 24-hour only</label>
              </div>
              <div className="pw-actions">
                <button className="pw-btn" type="submit" disabled={search.isPending} data-testid="button-vet-search"><Search size={18} aria-hidden="true" /> Search</button>
                <button className="pw-btn ghost" type="button" onClick={locate} disabled={search.isPending || locating} data-testid="button-vet-locate"><LocateFixed size={18} aria-hidden="true" /> {locating ? "Finding you…" : "Use my location"}</button>
              </div>
              {geoMsg && <p role="alert" className="form-error">{geoMsg}</p>}
            </form>
            <p className="pw-disc">Your location is only requested when you tap the button. Map services process an approximate search area, and your browser loads map tiles from OpenStreetMap, which reveals the area you view. We don't store your search or location in your browser, in analytics or in the page address. <a href="/privacy">Privacy</a></p>

            {search.isPending && <div className="pw-skel" role="status" aria-label="Searching for clinics"><i /><i /><i /></div>}
            {err && !search.isPending && <div className="pw-state" role="alert"><h2>We couldn't search just now</h2><p>{err.status === 404 || err.status === 400 ? "We couldn't find that place. Check the spelling or try a nearby city or postcode." : "The map data service didn't respond in time or is unavailable. Please try again. If this is urgent, call a clinic you know or search your phone's maps."}</p><button className="pw-btn ghost" type="button" onClick={() => setSearch({ error: null, isPending: false })}>Dismiss</button></div>}

            {result && !search.isPending && (
              <div className="pw-results" data-testid="vet-results">
                <h2>{clinics.length ? `${clinics.length} clinic${clinics.length === 1 ? "" : "s"} near ${result.area}` : `No clinics to show near ${result.area}`}</h2>
                <p className="pw-disc">Within about {result.radiusKm} km. Distances are straight-line estimates, not driving distances. {result.notice} Source: {result.source}. {result.attribution}</p>
                {showUrgent && <p className="pw-note-box">Urgent mode: sorted strictly by distance. No featured or sponsored listings are shown.</p>}
                {!clinics.length ? (
                  <div className="pw-state"><p>{openNow || emergencyOnly ? "Nothing matched those filters. Open-now is conservative, so clinics with unclear hours are left out. Try turning a filter off, and call ahead." : "No clinics were found in this area in the public map data. That doesn't mean there are none. Try a wider place name, or call local directory services."}</p></div>
                ) : (
                  <>
                    {mounted && <Suspense fallback={<div className="pw-map pw-skel-block" aria-hidden="true" />}><VetMap result={mapResult!} selected={selected} onSelect={setSelected} /></Suspense>}
                    <ul className="pw-cliniclist">
                      {clinics.map(c => {
                        const site = safeUrl(c.website);
                        return (
                          <li key={c.id} className={c.id === selected ? "sel" : ""} data-testid={`card-clinic-${c.id}`}>
                            <div className="pw-clinic-top"><h3>{c.name}</h3><span className="pw-dist">{c.distanceKm.toFixed(1)} km away (straight line)</span></div>
                            <p className="pw-badges"><span className={`pw-status ${c.openingStatus}`}>{statusLabel[c.openingStatus]}</span>{c.emergency && <span className="pw-status emerg">Lists emergency care</span>}</p>
                            <p>{c.address}</p>
                            {c.openingHours && <p className="small-print">Listed hours: {c.openingHours}</p>}
                            <div className="pw-actions">
                              {c.phone ? <a className="pw-btn" href={telHref(c.phone)}><Phone size={16} aria-hidden="true" /> Call {c.phone}</a> : <span className="small-print">No phone listed</span>}
                              <a className="pw-btn ghost" href={directions(c)} target="_blank" rel="noopener noreferrer"><Navigation size={16} aria-hidden="true" /> Directions</a>
                              {site && <a className="pw-btn ghost" href={site} target="_blank" rel="noopener noreferrer nofollow"><Globe size={16} aria-hidden="true" /> Website</a>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
                <p className="pw-disc">Public map data may be missing clinics, hours and phone numbers. Opening status is only inferred from simple listed schedules; holidays and complex hours show as unknown. Phone to confirm they are open and can see your pet.</p>
              </div>
            )}

            {!result && !search.isPending && !err && (
              <div className="pw-state"><h2>Start with a place</h2><p>Type a city or postcode and press Search. Nothing is searched until you do.</p></div>
            )}
            <div className="pw-note-box"><strong>Run a vet clinic?</strong> <a href="/for-vets">Claim a free listing or apply for a Featured placement</a>. Featured clinics are never shown in urgent mode. <a href="/sponsorship-policy">Sponsorship policy</a></div>
          </div>
        </section>
      </main>
    </div>
  );
}
