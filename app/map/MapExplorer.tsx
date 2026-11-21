"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Ico } from "@/components/Ico";
import { TILE_ATTR, TILE_URL } from "@/components/PinMap";
import { fmtDate, inr, inrShort } from "@/lib/taxonomy";

type WardStat = {
  ward_code: string; ward_name: string; complaints_open: number; complaints: number; budget_used_pct: number;
  flagged_inr_dedup: number; spend_inr: number; monsoon_repair_budget_inr_2025: number; reopen_pct: number;
  sla_met_pct: number; failed_30d_spend_inr: number; top_contractor: string;
};
type Pt = { id: string; lat: number; lon: number; b: string; sub: string; at: string; road: string | null; wo: boolean; app: boolean };

const BCOLOR: Record<string, string> = { Registered: "#c27a12", "In progress": "#2560a8", Closed: "#22774a", Invalid: "#8b928f" };
const FILTERS = [
  { k: "open", label: "Not fixed", match: (b: string) => b === "Registered" || b === "In progress" },
  { k: "fixed", label: "Fixed", match: (b: string) => b === "Closed" },
  { k: "invalid", label: "Invalid", match: (b: string) => b === "Invalid" },
  { k: "all", label: "All", match: () => true },
];
const METRICS = {
  open: { label: "Open complaints", get: (w: WardStat) => w.complaints_open, fmt: (v: number) => `${v} open` },
  money: { label: "Money to check", get: (w: WardStat) => w.flagged_inr_dedup, fmt: (v: number) => inrShort(v) },
};

export function MapExplorer({ wards, geo, initialWard, initialComplaint, loggedIn }: { wards: WardStat[]; geo: any; initialWard?: string; initialComplaint?: string; loggedIn: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<any>(null);
  const map = useRef<any>(null);
  const wardLayer = useRef<any>(null);
  const dotLayer = useRef<any>(null);
  const [ward, setWard] = useState<string | null>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [filter, setFilter] = useState("open");
  const [metric, setMetric] = useState<"open" | "money">("open");
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const byCode = useMemo(() => new Map(wards.map((w) => [w.ward_code, w])), [wards]);
  const wardRef = useRef<string | null>(null);
  wardRef.current = ward;

  const max = Math.max(...wards.map((w) => METRICS[metric].get(w)));
  const shade = (v: number) => {
    const t = Math.sqrt(v / (max || 1));
    return `rgba(${metric === "money" ? "192,57,43" : "14,104,120"},${(0.08 + t * 0.55).toFixed(2)})`;
  };

  // init map
  useEffect(() => {
    let alive = true;
    import("leaflet").then((Lm) => {
      if (!alive || !el.current || map.current) return;
      L.current = Lm;
      map.current = Lm.map(el.current, { zoomControl: false, minZoom: 10 }).setView([19.07, 72.88], 11);
      Lm.control.zoom({ position: "bottomright" }).addTo(map.current);
      Lm.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map.current);
      dotLayer.current = Lm.layerGroup().addTo(map.current);
      drawWards();
      map.current.fitBounds(wardLayer.current.getBounds(), { padding: [10, 10] });
      if (initialWard && byCode.has(initialWard)) openWard(initialWard, initialComplaint);
    });
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function drawWards() {
    const Lm = L.current;
    if (!Lm || !map.current) return;
    wardLayer.current?.remove();
    wardLayer.current = Lm.geoJSON(geo, {
      style: (f: any) => {
        const w = byCode.get(f.properties.ward_code);
        const on = wardRef.current === f.properties.ward_code;
        return {
          color: on ? "#17201d" : "#ffffff", weight: on ? 2.5 : 1.5,
          fillColor: w ? shade(METRICS[metric].get(w)) : "#ccc", fillOpacity: wardRef.current ? (on ? 0.12 : 0.3) : 1,
        };
      },
      onEachFeature: (f: any, layer: any) => {
        const w = byCode.get(f.properties.ward_code);
        layer.bindTooltip(`<b>${f.properties.ward_code}</b> · ${f.properties.ward_name}<br>${w ? METRICS[metric].fmt(METRICS[metric].get(w)) : ""}`, { sticky: true, direction: "top" });
        layer.on("click", () => openWard(f.properties.ward_code));
      },
    }).addTo(map.current);
    wardLayer.current.bringToBack();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(drawWards, [metric, ward]);

  async function openWard(code: string, complaint?: string) {
    setWard(code);
    setSel(complaint || null);
    setDetail(null);
    setLoading(true);
    const layer = wardLayer.current?.getLayers().find((l: any) => l.feature.properties.ward_code === code);
    if (layer) map.current.flyToBounds(layer.getBounds(), { padding: [30, 30], duration: 0.9 });
    const r = await fetch(`/api/map/ward/${encodeURIComponent(code)}`).then((r) => r.json());
    setPoints(r.points);
    setLoading(false);
    if (complaint) {
      const p = r.points.find((x: Pt) => x.id === complaint);
      if (p) {
        setFilter(FILTERS.find((f) => f.match(p.b))?.k || "all");
        setTimeout(() => map.current.flyTo([p.lat, p.lon], 16, { duration: 0.9 }), 950);
      }
    }
  }

  function backToCity() {
    setWard(null);
    setSel(null);
    setDetail(null);
    setPoints([]);
    map.current.flyToBounds(wardLayer.current.getBounds(), { padding: [10, 10], duration: 0.9 });
  }

  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.k === filter)!;
    return points.filter((p) => f.match(p.b));
  }, [points, filter]);

  // draw dots
  useEffect(() => {
    const Lm = L.current;
    if (!Lm || !dotLayer.current) return;
    dotLayer.current.clearLayers();
    for (const p of shown) {
      const on = p.id === sel;
      const m = Lm.circleMarker([p.lat, p.lon], {
        radius: on ? 10 : p.app ? 7 : 5.5, color: on ? "#17201d" : "#fff", weight: on ? 3 : 1.2,
        fillColor: BCOLOR[p.b], fillOpacity: 0.95,
      });
      m.bindTooltip(`${p.sub} · ${p.b}`, { direction: "top" });
      m.on("click", () => setSel(p.id));
      dotLayer.current.addLayer(m);
    }
  }, [shown, sel]);

  // load detail
  useEffect(() => {
    if (!sel) return setDetail(null);
    setDetail(null);
    fetch(`/api/complaints/${sel}`).then((r) => r.json()).then(setDetail);
  }, [sel]);

  const w = ward ? byCode.get(ward) : null;
  const counts = Object.fromEntries(FILTERS.map((f) => [f.k, points.filter((p) => f.match(p.b)).length]));
  const top = [...wards].sort((a, b) => METRICS[metric].get(b) - METRICS[metric].get(a)).slice(0, 6);

  return (
    <div className="mapx">
      <div ref={el} className="mapx-map" />
      <aside className="mapx-panel">
        {!w && (
          <div className="stack">
            <div>
              <h1 style={{ fontSize: 22 }}>Mumbai, ward by ward</h1>
              <p className="ink2 small" style={{ marginTop: 4 }}>Tap a ward to see every complaint, who repaired it, and what it cost.</p>
            </div>
            <div className="seg">
              {(Object.keys(METRICS) as ("open" | "money")[]).map((k) => (
                <button key={k} className={metric === k ? "on" : ""} onClick={() => setMetric(k)}>{METRICS[k].label}</button>
              ))}
            </div>
            <div className="card flat tight list">
              {top.map((x) => (
                <button key={x.ward_code} className="crow" style={{ width: "100%", border: "none", background: "none", cursor: "pointer", textAlign: "left", padding: "10px 4px" }} onClick={() => openWard(x.ward_code)}>
                  <span className="score Low" style={{ width: 40, height: 34, fontSize: 13 }}>{x.ward_code}</span>
                  <span className="main"><span className="bold small ellipsis" style={{ display: "block" }}>{x.ward_name}</span></span>
                  <span className={`small num bold ${metric === "money" ? "red" : ""}`}>{METRICS[metric].fmt(METRICS[metric].get(x))}</span>
                </button>
              ))}
            </div>
            <p className="tiny muted">Darker = more {metric === "money" ? "money in bills that need checking" : "open complaints"}.</p>
          </div>
        )}

        {w && !sel && (
          <div className="stack">
            <button className="back linkbtn" style={{ color: "var(--ink-2)", marginBottom: 0 }} onClick={backToCity}><Ico name="back" size={18} /> All wards</button>
            <div>
              <p className="tiny muted">Ward {w.ward_code}</p>
              <h1 style={{ fontSize: 22 }}>{w.ward_name}</h1>
            </div>
            <div className="grid2">
              <div className="card flat tight stat"><b>{w.complaints_open}</b><span>complaints not fixed</span></div>
              <div className="card flat tight stat"><b className={w.budget_used_pct > 100 ? "red" : ""}>{Math.round(w.budget_used_pct)}%</b><span>of repair budget used</span></div>
              <div className="card flat tight stat"><b className="red">{inrShort(w.flagged_inr_dedup)}</b><span>in bills to check</span></div>
              <div className="card flat tight stat"><b>{Math.round(w.reopen_pct)}%</b><span>repairs failed in 30 days</span></div>
            </div>
            <div className="chips">
              {FILTERS.map((f) => (
                <button key={f.k} className={`chip ${filter === f.k ? "on" : ""}`} onClick={() => setFilter(f.k)}>
                  {f.k !== "all" && <i style={{ width: 9, height: 9, borderRadius: 9, background: f.k === "open" ? BCOLOR.Registered : f.k === "fixed" ? BCOLOR.Closed : BCOLOR.Invalid }} />}
                  {f.label} <span className="count">{counts[f.k] ?? 0}</span>
                </button>
              ))}
            </div>
            {loading ? (
              <div className="row muted"><span className="spin" /> Loading complaints…</div>
            ) : (
              <div className="card flat tight list" style={{ maxHeight: 360, overflow: "auto" }}>
                {shown.slice(0, 80).map((p) => (
                  <button key={p.id} onClick={() => { setSel(p.id); map.current.flyTo([p.lat, p.lon], 16, { duration: 0.8 }); }} className="crow" style={{ width: "100%", border: "none", background: "none", textAlign: "left", cursor: "pointer", padding: "10px 4px" }}>
                    <i style={{ width: 10, height: 10, borderRadius: 10, background: BCOLOR[p.b], flex: "none" }} />
                    <span className="main">
                      <span className="small bold" style={{ display: "block" }}>{p.sub}</span>
                      <span className="tiny muted ellipsis" style={{ display: "block" }}>{p.road || "–"} · {fmtDate(p.at)}</span>
                    </span>
                    <Ico name="chevron" size={16} className="muted" />
                  </button>
                ))}
                {!shown.length && <p className="empty small">Nothing here.</p>}
              </div>
            )}
            {loggedIn && <Link href="/citizen/new" className="btn primary block"><Ico name="plus" size={18} /> Report a problem here</Link>}
          </div>
        )}

        {w && sel && (
          <div className="stack">
            <button className="back linkbtn" style={{ color: "var(--ink-2)", marginBottom: 0 }} onClick={() => setSel(null)}><Ico name="back" size={18} /> Ward {w.ward_code}</button>
            {!detail ? (
              <div className="row muted"><span className="spin" /> Loading…</div>
            ) : (
              <>
                {detail.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.photo} alt="" className="photo" style={{ height: 170 }} />
                )}
                <div className="between">
                  <h2>{detail.sub}</h2>
                  <span className={`pill ${{ Registered: "s-reg", "In progress": "s-prog", Closed: "s-done", Invalid: "s-inv" }[detail.bucket as string]}`}>{detail.bucket}</span>
                </div>
                <p className="small ink2">{detail.road} · {fmtDate(detail.at)} · {detail.supporters} supporters</p>
                <p className="small" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{detail.desc}</p>
                {detail.job ? (
                  <div className="card flat tight stack" style={{ marginTop: 4 }}>
                    <div className="row"><Ico name="hardhat" size={18} /><b className="small">{detail.job.contractor}</b></div>
                    <div className="small ink2">{detail.job.method} · done {fmtDate(detail.job.done)}</div>
                    <div className="grid3 small">
                      <div><div className="muted tiny">Billed</div><b className={detail.job.cost > detail.job.fair * 1.3 ? "red num" : "num"}>{inr(detail.job.cost)}</b></div>
                      <div><div className="muted tiny">Fair price</div><b className="num">{inr(detail.job.fair)}</b></div>
                      <div><div className="muted tiny">Held 30 days</div><b className={detail.job.held ? "green" : "red"}>{detail.job.held ? "Yes" : "No"}</b></div>
                    </div>
                    {detail.job.flags.map((f: string) => <div key={f} className="banner bad small" style={{ padding: "8px 10px" }}><Ico name="alert" size={16} /> {f}</div>)}
                    {detail.job.after && (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={detail.job.after} alt="" className="photo" style={{ height: 110 }} />
                        <p className="tiny muted" style={{ marginTop: 4 }}>Contractor&apos;s completion photo (sample)</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="small muted">No repair job linked yet.</p>
                )}
                <Link href={`/citizen/complaints/${detail.id}`} className="btn block">Open full details</Link>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
