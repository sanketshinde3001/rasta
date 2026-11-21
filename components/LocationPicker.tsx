"use client";
import { useEffect, useRef, useState } from "react";
import { Ico } from "./Ico";
import { TILE_ATTR, TILE_URL } from "./PinMap";
import { bestFix } from "@/lib/gps";

export type Loc = {
  lat: number; lon: number; ward_code: string | null; ward_name: string | null; road_name: string | null;
  locality: string | null; inside_bmc: boolean; road_type: string | null; address?: string | null; landmark_hint?: string | null;
};

const KURLA = { lat: 19.0726, lon: 72.8845 };

async function locate(lat: number, lon: number): Promise<Loc> {
  return fetch("/api/locate", { method: "POST", body: JSON.stringify({ lat, lon }) }).then((r) => r.json());
}

// Full-screen "set location" sheet, like a food-delivery app: move the map under a fixed pin, or search.
export function LocationPicker({ start, onConfirm, onClose }: { start: { lat: number; lon: number } | null; onConfirm: (l: Loc, landmark: string) => void; onClose: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [moving, setMoving] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [gps, setGps] = useState<"idle" | "busy" | "denied">("idle");
  const [acc, setAcc] = useState<number | null>(null);
  const circle = useRef<any>(null);
  const Lref = useRef<any>(null);
  const [landmark, setLandmark] = useState("");
  const timer = useRef<any>(null);

  useEffect(() => {
    let alive = true;
    import("leaflet").then((L) => {
      if (!alive || !el.current || map.current) return;
      Lref.current = L;
      const c = start || KURLA;
      map.current = L.map(el.current, { zoomControl: false }).setView([c.lat, c.lon], 17);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map.current);
      map.current.on("movestart", () => setMoving(true));
      map.current.on("moveend", () => {
        setMoving(false);
        const p = map.current.getCenter();
        clearTimeout(timer.current);
        timer.current = setTimeout(() => locate(p.lat, p.lng).then(setLoc), 500);
      });
      locate(c.lat, c.lon).then(setLoc);
      if (!start) useGps();
    });
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(() => fetch(`/api/places?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((j) => setResults(j.results)), 200);
    return () => clearTimeout(t);
  }, [q]);

  function useGps() {
    if (!navigator.geolocation) return setGps("denied");
    setGps("busy");
    let first = true;
    const show = (f: { lat: number; lon: number; acc: number }) => {
      setAcc(f.acc);
      if (!map.current || !Lref.current) return;
      circle.current?.remove();
      circle.current = Lref.current.circle([f.lat, f.lon], { radius: f.acc, color: "#2560a8", weight: 1, fillOpacity: 0.08 }).addTo(map.current);
      if (first) map.current.flyTo([f.lat, f.lon], f.acc < 60 ? 18 : 16, { duration: 0.8 });
      else map.current.panTo([f.lat, f.lon]);
      first = false;
    };
    bestFix(show).then((f) => setGps(f ? "idle" : "denied"));
  }

  function pick(r: any) {
    setQ("");
    setResults([]);
    map.current?.flyTo([r.lat, r.lon], 17, { duration: 0.8 });
  }

  const title = loc?.road_name || loc?.locality || "Move the map to the spot";
  return (
    <div className="lp">
      <div className="lp-top">
        <button className="btn ghost sm" onClick={onClose} aria-label="Close"><Ico name="back" /></button>
        <div className="lp-search">
          <Ico name="pin" size={18} className="muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search area, road or landmark" />
          {q && <button className="linkbtn" onClick={() => setQ("")}><Ico name="x" size={16} /></button>}
        </div>
      </div>
      {results.length > 0 && (
        <div className="lp-results">
          {results.map((r, i) => (
            <button key={i} onClick={() => pick(r)}>
              <Ico name={r.kind === "road" ? "road" : r.kind === "hospital" ? "hospital" : r.kind === "school" ? "school" : "pin"} size={18} className="muted" />
              <span><b>{r.name}</b><span className="tiny muted" style={{ display: "block" }}>{r.sub}</span></span>
            </button>
          ))}
        </div>
      )}
      <div className="lp-map">
        <div ref={el} style={{ position: "absolute", inset: 0 }} />
        <div className={`lp-pin ${moving ? "up" : ""}`}>
          <svg width="40" height="52" viewBox="0 0 30 40"><path d="M15 39s13-13.3 13-23.5C28 7.5 22.2 2 15 2S2 7.5 2 15.5C2 25.7 15 39 15 39z" fill="#0e6878" stroke="#fff" strokeWidth="2" /><circle cx="15" cy="15.5" r="5" fill="#fff" /></svg>
          <i />
        </div>
        <div className="lp-hint">{moving ? "Release to set" : "Move the map to place the pin on the problem"}</div>
        <button className="lp-gps" onClick={useGps}>
          {gps === "busy" ? <><span className="spin" /> Finding precise location…</> : <><Ico name="nav" size={18} /> Use current location</>}
        </button>
      </div>
      <div className="lp-card">
        {gps === "denied" && <div className="banner warn small" style={{ marginBottom: 10 }}>Location is off. Search or move the map instead.</div>}
        <div className="row-top">
          <span className="ico-circle" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><Ico name="pin" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="bold ellipsis">{title}</div>
            <div className="small ink2">
              {loc ? (loc.ward_code ? `${loc.address || loc.locality || ""}${loc.address || loc.locality ? " · " : ""}Ward ${loc.ward_code}, ${loc.ward_name}` : "Outside BMC limits") : "Finding address…"}
            </div>
            {acc != null && <div className="tiny muted">GPS accuracy ±{acc} m{acc > 60 ? " · drag the map to the exact spot" : ""}</div>}
          </div>
        </div>
        <input className="input" style={{ marginTop: 12 }} value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Landmark (optional), e.g. opposite bus depot" />
        <button className="btn primary big" style={{ marginTop: 12 }} disabled={!loc?.inside_bmc || moving} onClick={() => loc && onConfirm(loc, landmark)}>
          {loc && !loc.inside_bmc ? "Move the pin inside Mumbai" : "Confirm location"}
        </button>
      </div>
    </div>
  );
}
