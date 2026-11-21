"use client";
import { useMemo, useState } from "react";
import { Ico } from "@/components/Ico";
import { SEASONS, inr, inrShort, samplePhoto, type Season } from "@/lib/taxonomy";

type Row = {
  key: string; road_id: string; road_name: string; issue: string; why: string; method: string; est_cost_inr: number;
  cost_to_bmc_inr: number; dlp_claim: string; expected_fail_rate: number; suggested_contractor: string | null;
  complaints: number; days_open: number; complaint_ids: string[]; parts: Record<string, number>; isNew: boolean;
  facilities: string | null; flood_hotspot: string | null; accidents: number; bus: boolean; repeat: boolean; approved: boolean;
};

// Season changes what matters most. Weights add up to 1.
const SW: Record<Season, Record<string, number>> = {
  pre: { severity: 0.2, safety: 0.15, access: 0.13, flood: 0.32, traffic: 0.12, demand: 0.08 },
  monsoon: { severity: 0.3, safety: 0.25, access: 0.15, flood: 0.15, traffic: 0.1, demand: 0.05 },
  post: { severity: 0.25, safety: 0.2, access: 0.15, flood: 0.05, traffic: 0.2, demand: 0.15 },
};
const SEASON_ICON: Record<Season, string> = { pre: "cloud", monsoon: "storm", post: "sun" };
const WATER = /water|drain|manhole|cover/i;

export function BudgetPlanner({ ward, wardName, rows, defaultFunds, budget, spent, initialSeason, tendered }: {
  ward: string; wardName: string; rows: Row[]; defaultFunds: number; budget: number; spent: number; initialSeason: Season; tendered: Record<string, string>;
}) {
  const [season, setSeason] = useState<Season>(initialSeason);
  const [funds, setFunds] = useState(defaultFunds);
  const [reserve, setReserve] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [brief, setBrief] = useState<any>(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const usable = reserve ? Math.round(funds * 0.8) : funds;
  const plan = useMemo(() => {
    const w = SW[season];
    const scored = rows.map((r) => {
      let s = 0;
      for (const k of Object.keys(w)) s += w[k] * (r.parts[k] || 0);
      if (season === "pre" && WATER.test(r.issue)) s += 0.05;
      if (r.approved) s += 0.03;
      return { ...r, score: Math.round(s * 100) };
    });
    scored.sort((a, b) => b.score - a.score);
    let left = usable;
    let lineAt = -1;
    const out = scored.map((r, i) => {
      const fits = r.cost_to_bmc_inr <= left;
      if (fits) left -= r.cost_to_bmc_inr;
      else if (lineAt < 0) lineAt = i;
      return { ...r, funded: fits };
    });
    const funded = out.filter((r) => r.funded);
    return {
      rows: out, lineAt, left, fundedCount: funded.length, spend: usable - left,
      free: funded.filter((r) => r.dlp_claim === "Y"),
      complaintsCovered: funded.reduce((s, r) => s + r.complaints, 0),
      allCost: out.reduce((s, r) => s + r.cost_to_bmc_inr, 0),
    };
  }, [rows, season, usable]);

  async function openTender(r: (typeof plan.rows)[number]) {
    setBusyKey(r.key);
    const res = await fetch("/api/officer/tenders", { method: "POST", body: JSON.stringify({ row: r }) }).then((x) => x.json());
    location.href = `/officer/tenders/${res.id}`;
  }

  async function explain() {
    setBriefBusy(true);
    const res = await fetch("/api/officer/plan-brief", {
      method: "POST",
      body: JSON.stringify({
        ward, wardName, season: SEASONS[season].label, funds, emergency_reserve_inr: funds - usable, spend: plan.spend, budget, spent,
        funded: plan.rows.filter((r) => r.funded).slice(0, 12).map((r) => ({ issue: r.issue, road: r.road_name, score: r.score, cost_to_bmc: r.cost_to_bmc_inr, contractor_pays: r.dlp_claim === "Y", why: r.why })),
        not_funded: plan.rows.filter((r) => !r.funded).slice(0, 5).map((r) => ({ issue: r.issue, road: r.road_name, score: r.score, cost: r.cost_to_bmc_inr })),
        not_funded_count: plan.rows.length - plan.fundedCount,
      }),
    }).then((x) => x.json());
    setBrief(res);
    setBriefBusy(false);
  }

  const pct = (v: number) => `${Math.max(0, Math.min(100, (100 * v) / Math.max(funds, 1)))}%`;
  const visible = showAll ? plan.rows : plan.rows.slice(0, Math.max(plan.lineAt + 4, 12));

  return (
    <div className="stack-lg">
      {/* money + season */}
      <div className="budget-top">
        <div className="card stack">
          <label className="fl">Money available</label>
          <div className="row">
            <span className="input" style={{ width: 48, flex: "none", display: "grid", placeItems: "center" }}>₹</span>
            <input className="input num" style={{ fontSize: 20, fontWeight: 650 }} type="number" step={50000} value={funds} onChange={(e) => setFunds(Math.max(0, +e.target.value))} />
          </div>
          <label className="check small"><input type="checkbox" checked={reserve} onChange={(e) => setReserve(e.target.checked)} /> Keep 20% for emergencies (cave-ins, open manholes in the rain)</label>
          <div className="money-bar">
            <i className="spend" style={{ width: pct(plan.spend) }} title="Planned repairs" />
            {reserve && <i className="reserve" style={{ width: pct(funds - usable) }} title="Emergency reserve" />}
          </div>
          <div className="row wrap-gap tiny" style={{ gap: 14 }}>
            <span className="row" style={{ gap: 6 }}><i className="dot" style={{ background: "var(--accent)" }} /> Repairs {inrShort(plan.spend)}</span>
            {reserve && <span className="row" style={{ gap: 6 }}><i className="dot" style={{ background: "#e0a100" }} /> Reserve {inrShort(funds - usable)}</span>}
            <span className="row" style={{ gap: 6 }}><i className="dot" style={{ background: "var(--line)" }} /> Unused {inrShort(plan.left)}</span>
          </div>
        </div>
        <div className="card stack">
          <label className="fl">Season</label>
          <div className="season-grid">
            {(Object.keys(SEASONS) as Season[]).map((k) => (
              <button key={k} className={`type-btn ${season === k ? "on" : ""}`} onClick={() => setSeason(k)}>
                <Ico name={SEASON_ICON[k]} size={24} />
                <span>{SEASONS[k].label.split(" (")[0]}</span>
              </button>
            ))}
          </div>
          <p className="tiny muted">{SEASONS[season].hint}</p>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><Ico name="check" size={20} /><b>{plan.fundedCount}<small>/{plan.rows.length}</small></b><span>problems fixed</span></div>
        <div className="kpi"><Ico name="users" size={20} /><b>{plan.complaintsCovered}</b><span>complaints closed</span></div>
        <div className="kpi"><Ico name="rupee" size={20} /><b>{inrShort(plan.allCost)}</b><span>needed to fix everything</span></div>
        <div className="kpi good"><Ico name="shield" size={20} /><b>{plan.free.length}</b><span>free repairs, {inrShort(plan.free.reduce((s, r) => s + r.est_cost_inr, 0))} saved</span></div>
      </div>

      <div className="card stack">
        <div className="between wrap-gap">
          <div className="row"><Ico name="sparkles" size={18} className="green" /><h2>Note for the ward committee</h2></div>
          <button className="btn sm" disabled={briefBusy} onClick={explain}>{briefBusy ? <span className="spin" /> : brief ? "Rewrite" : "Write with AI"}</button>
        </div>
        {brief?.headline && (
          <div className="stack small">
            <p className="bold">{brief.headline}</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{brief.points.map((p: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}</ul>
            <p className="ink2"><b>If we stop here:</b> {brief.risk}</p>
          </div>
        )}
        {brief?.error && <div className="banner warn small">{brief.error}</div>}
      </div>

      <div className="stack">
        {visible.map((r, i) => (
          <div key={r.key}>
            {i === plan.lineAt && (
              <div className="money-line"><Ico name="wallet" size={17} /> Money runs out here. {plan.rows.length - plan.fundedCount} problems wait for more funds.</div>
            )}
            <div className={`issue-card ${r.funded ? "" : "unfunded"}`}>
              <span className="rank">{i + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={samplePhoto(r.issue)} alt="" className="issue-img" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row wrap-gap" style={{ gap: 6 }}>
                  <b>{r.issue}</b>
                  {r.approved && <span className="pill s-done mini"><Ico name="check" size={12} /> Approved</span>}
                  {r.isNew && <span className="pill ai-tag mini">New</span>}
                </div>
                <div className="small ink2 ellipsis">{r.road_name}</div>
                <div className="sig-chips">
                  {r.facilities && <span title={r.facilities}><Ico name={/hospital/i.test(r.facilities) ? "hospital" : "school"} size={13} /> {/hospital/i.test(r.facilities) ? "Hospital" : "School"}</span>}
                  {r.flood_hotspot && <span title={r.flood_hotspot}><Ico name="waves" size={13} /> Flood spot</span>}
                  {r.accidents > 0 && <span><Ico name="car" size={13} /> {r.accidents} accidents</span>}
                  {r.bus && <span><Ico name="bus" size={13} /> Bus route</span>}
                  {r.repeat && <span className="warn"><Ico name="repeat" size={13} /> Failed before</span>}
                  <span><Ico name="users" size={13} /> {r.complaints}</span>
                </div>
                <div className="tiny muted" style={{ marginTop: 4 }}>{r.method} · lasts {Math.round((1 - r.expected_fail_rate) * 100)}% of the time</div>
              </div>
              <div className="issue-right">
                <div className={`score ${r.score >= 55 ? "High" : r.score >= 40 ? "Medium" : "Low"}`} title="Priority score" style={{ width: 40, height: 40, fontSize: 15 }}>{r.score}</div>
                {r.dlp_claim === "Y" ? (
                  <span className="pill s-done mini"><Ico name="shield" size={12} /> Contractor pays</span>
                ) : (
                  <b className="num">{inr(r.cost_to_bmc_inr)}</b>
                )}
                {r.funded && r.dlp_claim !== "Y" && (
                  tendered[r.key] ? (
                    <a href={`/officer/tenders/${tendered[r.key]}`} className="linkbtn tiny">View tender</a>
                  ) : (
                    <button className="btn sm" disabled={busyKey === r.key} onClick={() => openTender(r)}>
                      {busyKey === r.key ? <span className="spin" /> : <><Ico name="gavel" size={15} /> Tender</>}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
        {!showAll && plan.rows.length > visible.length && (
          <button className="btn ghost block" onClick={() => setShowAll(true)}>Show all {plan.rows.length} problems</button>
        )}
      </div>
    </div>
  );
}
