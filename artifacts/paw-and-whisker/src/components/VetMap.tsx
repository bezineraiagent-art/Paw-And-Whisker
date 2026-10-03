import { useEffect, useRef, useState } from "react";
import type { VetSearchResult } from "@workspace/api-client-react";

// Leaflet treats string tooltips as HTML; clinic tags are untrusted, so always pass DOM text nodes.
function text(v: string) { const d = document.createElement("span"); d.textContent = v; return d; }

export default function VetMap({ result, selected, onSelect }: { result: VetSearchResult; selected: string | null; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<{ map: any; layer: any; L: any } | null>(null);
  const [error, setError] = useState("");
  const selectRef = useRef(onSelect); selectRef.current = onSelect;

  useEffect(() => {
    let dead = false;
    (async () => {
      const L: any = (await import("leaflet")).default ?? (await import("leaflet"));
      await import("leaflet/dist/leaflet.css");
      if (dead || !el.current) return;
      if (!state.current) {
        const map = L.map(el.current, { scrollWheelZoom: false, preferCanvas: true });
        L.tileLayer(result.mapTilesUrl || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, keepBuffer: 0, attribution: result.mapAttribution || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' })
          .on("tileerror", () => setError("Some map tiles couldn't load. Use the clinic list below to call or open directions."))
          .addTo(map);
        state.current = { map, layer: L.layerGroup().addTo(map), L };
      }
      const { map, layer } = state.current;
      layer.clearLayers();
      const pts: [number, number][] = [[result.latitude, result.longitude]];
      L.circleMarker([result.latitude, result.longitude], { radius: 7, color: "#1b57d6", fillOpacity: 0.7 }).bindTooltip(text("Search area")).addTo(layer);
      result.clinics.forEach(c => {
        const m = L.circleMarker([c.latitude, c.longitude], { radius: c.id === selected ? 11 : 8, color: c.emergency ? "#b3261e" : "#d9573f", fillOpacity: 0.85 }).addTo(layer);
        m.bindTooltip(text(c.name));
        m.on("click", () => selectRef.current(c.id));
        pts.push([c.latitude, c.longitude]);
      });
      if (pts.length > 1) map.fitBounds(pts, { padding: [28, 28], maxZoom: 15 }); else map.setView(pts[0], 13);
    })().catch(() => setError("The map couldn't load. Use the clinic list below to call or open directions."));
    return () => { dead = true; };
  }, [result, selected]);

  useEffect(() => () => { state.current?.map.remove(); state.current = null; }, []);
  return <><div ref={el} className="pw-map" role="region" aria-label="Map of nearby clinics. The list below has the same information." data-testid="map-vets" />{error && <p className="form-error" role="status">{error}</p>}</>;
}
