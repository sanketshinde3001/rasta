"use client";
import { useMemo, useState } from "react";
import { Ico } from "@/components/Ico";
import { SEASONS, inr, inrShort, type Season } from "@/lib/taxonomy";

type Row = {
  key: string; road_id: string; road_name: string; issue: string; why: string; method: string; est_cost_inr: number;
  cost_to_bmc_inr: number; dlp_claim: string; expected_fail_rate: number; suggested_contractor: string | null;
  complaints: number; days_open: number; complaint_ids: string[]; parts: Record<string, number>; isNew: boolean;
};

// Season changes what matters most. Weights add up to 1.
const SW: Record<Season, Record<string, number>> = {
  pre: { severity: 0.2, safety: 0.15, access: 0.13, flood: 0.32, traffic: 0.12, demand: 0.08 },
  monsoon: { severity: 0.3, safety: 0.25, access: 0.15, flood: 0.15, traffic: 0.1, demand: 0.05 },
  post: { severity: 0.25, safety: 0.2, access: 0.15, flood: 0.05, traffic: 0.2, demand: 0.15 },
};
const WATER = /water|drain|manhole|cover/i;

export function BudgetPlanner({ ward, wardName, rows, defaultFunds, budget, spent, initialSeason, tendered }: {
  ward: string; wardName: string; rows: Row[]; defaultFunds: number; budget: number; spent: number; initialSeason: Season; tendered: Record<string, string>;
}) {
  const [season, setSeason] = useState<Season>(initialSeason);
  const [funds, setFunds] = useState(defaultFunds);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [brief, setBrief] = useState<any>(null);
  const [briefBusy, setBriefBusy] = useState(false);

  const plan = useMemo(() => {
    const w = SW[season];
    const scored = rows.map((r) => {
      let s = 0;
      for (const k of Object.keys(w)) s += w[k] * (r.parts[k] || 0);
      if (season === "pre" && WATER.test(r.issue)) s += 0.05; // drains before the rain
      return { ...r, score: Math.round(s * 100) };
    });
    scored.sort((a, b) => b.score - a.score);
    let left = funds;
    let lineAt = -1;
    const out = scored.map((r, i) => {
      const fits = r.cost_to_bmc_inr <= left;
      if (fits) left -= r.cost_to_bmc_inr;
      else if (lineAt < 0) lineAt = i;
      return { ...r, funded: fits };
    });
    const funded = out.filter((r) => r.funded);
    return {
      rows: out, lineAt, left,
      fundedCount: funded.length, spend: funds - left,
      free: funded.filter((r) => r.dlp_claim === "Y"),
      complaintsCovered: funded.reduce((s, r) => s + r.complaints, 0),
      allCost: out.reduce((s, r) => s + r.cost_to_bmc_inr, 0),
    };
  }, [rows, season, funds]);

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
        ward, wardName, season: SEASONS[season].label, funds, spend: plan.spend, budget, spent,
        funded: plan.rows.filter((r) => r.funded).slice(0, 12).map((r) => ({ issue: r.issue, road: r.road_name, score: r.score, cost_to_bmc: r.cost_to_bmc_inr, contractor_pays: r.dlp_claim === "Y", why: r.why })),
        not_funded: plan.rows.filter((r) => !r.funded).slice(0, 5).map((r) => ({ issue: r.issue, road: r.road_name, score: r.score, cost: r.cost_to_bmc_inr })),
        not_funded_count: plan.rows.length - plan.fundedCount,
      }),
    }).then((x) => x.json());
    setBrief(res);
    setBriefBusy(false);
  }

  return (
    <div className="stack-lg">
      <div className="card stack">
        <div className="grid2" style={{ alignItems: "end" }}>
          <div>
            <label className="fl">Money available for repairs</label>
            <div className="row">
              <span className="input" style={{ width: 52, flex: "none", display: "grid", placeItems: "center" }}>₹</span>
              <input className="input num" type="number" step={50000} value={funds} onChange={(e) => setFunds(Math.max(0, +e.target.value))} />
            </div>
            <p className="tiny muted" style={{ marginTop: 6 }}>2025 budget {inrShort(budget)} · already spent {inrShort(spent)}</p>
          </div>
          <div>
            <label className="fl">Season</label>
            <div className="seg" style={{ width: "100%" }}>
              {(Object.keys(SEASONS) as Season[]).map((k) => (
                <button key={k} className={season === k ? "on" : ""} style={{ flex: 1 }} onClick={() => setSeason(k)}>{SEASONS[k].label.split(" (")[0]}</button>
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 6 }}>{SEASONS[season].hint}</p>
          </div>
        </div>
      </div>

      <div className="grid3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="card tight stat"><b>{plan.fundedCount} of {plan.rows.length}</b><span>issues fixed with this money</span></div>
        <div className="card tight stat"><b>{plan.complaintsCovered}</b><span>complaints closed</span></div>
        <div className="card tight stat"><b>{inrShort(plan.spend)}</b><span>used · {inrShort(plan.allCost)} to clear all</span></div>
        <div className="card tight stat"><b className="green">{plan.free.length} · {inrShort(plan.free.reduce((s, r) => s + r.est_cost_inr, 0))}</b><span>free repairs under guarantee</span></div>
      </div>

      <div className="card stack">
        <div className="between">
          <div className="row"><Ico name="sparkles" size={18} className="green" /><h2>Plan summary for the ward committee</h2></div>
          <button className="btn sm" disabled={briefBusy} onClick={explain}>{briefBusy ? <span className="spin" /> : brief ? "Rewrite" : "Write with AI"}</button>
        </div>
        {brief?.headline ? (
          <div className="stack small">
            <p className="bold">{brief.headline}</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{brief.points.map((p: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}</ul>
            <p className="ink2"><b>Risk if we stop here:</b> {brief.risk}</p>
          </div>
        ) : (
          <p className="small muted">One click turns this plan into a short note you can share with the corporator and ward committee.</p>
        )}
        {brief?.error && <div className="banner warn small">{brief.error}</div>}
      </div>

      <div className="card" style={{ padding: "4px 16px" }}>
        <div className="list">
          {plan.rows.slice(0, Math.max(plan.lineAt + 6, 20)).map((r, i) => (
            <div key={r.key}>
              {i === plan.lineAt && (
                <div className="row" style={{ padding: "12px 0", color: "var(--red)", fontWeight: 600, fontSize: 14 }}>
                  <Ico name="wallet" size={17} /> Money runs out here · {inr(plan.left)} left
                </div>
              )}
              <div className="row-top" style={{ padding: "14px 0", opacity: r.funded ? 1 : 0.55 }}>
                <span className="score Low" style={{ width: 40, height: 40, fontSize: 14, background: r.funded ? "var(--accent-soft)" : undefined, color: r.funded ? "var(--accent)" : undefined }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row wrap-gap" style={{ gap: 8 }}>
                    <b>{r.issue}</b><span className="ink2">· {r.road_name}</span>
                    {r.isNew && <span className="pill ai-tag" style={{ height: 21, fontSize: 11.5 }}>NEW</span>}
                    {r.dlp_claim === "Y" && <span className="pill s-done" style={{ height: 21, fontSize: 11.5 }}><Ico name="shield" size={12} /> Contractor pays</span>}
                  </div>
                  <div className="small muted" style={{ marginTop: 2 }}>{r.why}</div>
                  <div className="small" style={{ marginTop: 4 }}>
                    {r.method} · fails {Math.round(r.expected_fail_rate * 100)}% of the time · {r.complaints} complaint{r.complaints === 1 ? "" : "s"}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 120 }}>
                  <div className="num bold">{r.dlp_claim === "Y" ? "₹0" : inr(r.cost_to_bmc_inr)}</div>
                  <div className="tiny muted">score {r.score}</div>
                  {r.funded && r.dlp_claim !== "Y" && (
                    tendered[r.key] ? (
                      <a href={`/officer/tenders/${tendered[r.key]}`} className="linkbtn tiny" style={{ marginTop: 6 }}>View tender</a>
                    ) : (
                      <button className="btn sm" style={{ marginTop: 6 }} disabled={busyKey === r.key} onClick={() => openTender(r)}>
                        {busyKey === r.key ? <span className="spin" /> : <><Ico name="gavel" size={15} /> Open tender</>}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
