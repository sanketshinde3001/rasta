"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ico } from "@/components/Ico";
import { BAND, inr } from "@/lib/taxonomy";
import { bidPricing } from "@/lib/bid-pricing";

export function TenderClient({ tender: t, history }: { tender: any; history: Record<string, { band: string; failVsPeers: number; sla: number; jobs: number }> }) {
  const router = useRouter();
  const [a, setA] = useState<any>(t.analysis || null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ bidder: "", amount_inr: "", days: "5", warranty_months: "12", experience_years: "", similar_jobs: "", equipment: "" });
  const [err, setErr] = useState("");
  const awarded = t.status === "Awarded";
  const rank: Record<string, any> = Object.fromEntries((a?.ranking || []).map((r: any, i: number) => [r.bid_id, { ...r, pos: i + 1 }]));
  const bids = [...t.bids].sort((x: any, y: any) => (rank[x.bid_id]?.pos ?? 99) - (rank[y.bid_id]?.pos ?? 99) || x.amount_inr - y.amount_inr);

  async function analyze() {
    setBusy(true);
    const r = await fetch(`/api/officer/tenders/${t.tender_id}/analyze`, { method: "POST" }).then((r) => r.json());
    setA(r);
    setBusy(false);
  }
  async function award(bid_id: string) {
    setBusy(true);
    await fetch(`/api/officer/tenders/${t.tender_id}/award`, { method: "POST", body: JSON.stringify({ bid_id }) });
    router.refresh();
    setBusy(false);
  }
  async function addBid() {
    setErr("");
    const r = await fetch(`/api/officer/tenders/${t.tender_id}/bids`, { method: "POST", body: JSON.stringify(form) });
    const j = await r.json();
    if (!r.ok) return setErr(j.error);
    setAdding(false);
    setA(null);
    router.refresh();
  }

  return (
    <div className="stack-lg">
      {!awarded && (
        <div className="card stack">
          <div className="between wrap-gap">
            <div className="row"><Ico name="sparkles" size={18} className="green" /><h2>Compare bids with AI</h2></div>
            <button className="btn primary" disabled={busy} onClick={analyze}>{busy ? <span className="spin" /> : a ? "Re-run analysis" : "Analyse bids"}</button>
          </div>
          {a ? (
            <>
              <div className="banner info small"><Ico name="scale" size={18} /><div><b>Recommendation.</b> {a.recommendation}</div></div>
              <p className="small"><b>Check before awarding:</b> {a.caution}</p>
              <p className="tiny muted">{a.by === "claude" ? "Claude" : "Rules"} · Lower prices improve value for the same scope. Repair history, delivery and warranty also affect the overall score. You make the award.</p>
            </>
          ) : (
            <p className="small muted">Bids below the estimate offer savings for the same work scope. The comparison also considers repair quality, deadlines, billing history and warranty. New bidders are judged on experience, equipment, warranty and price.</p>
          )}
        </div>
      )}

      <section>
        <div className="section-title"><h2>{t.bids.length} bids</h2>{!awarded && <button className="linkbtn small" onClick={() => setAdding(true)}><Ico name="plus" size={16} /> Add a bid</button>}</div>
        <div className="stack">
          {bids.map((b: any) => {
            const h = b.contractor_id ? history[b.contractor_id] : null;
            const r = rank[b.bid_id];
            const won = t.awarded_bid === b.bid_id;
            const price = bidPricing(b.amount_inr, t.estimate_inr);
            return (
              <div key={b.bid_id} className="card" style={won ? { borderColor: "var(--green)", boxShadow: "0 0 0 2px var(--green-soft)" } : undefined}>
                <div className="between" style={{ alignItems: "flex-start" }}>
                  <div className="row-top" style={{ flex: 1, minWidth: 0 }}>
                    {r ? <span className={`score ${r.pos === 1 ? "Low" : "Low"}`} style={r.pos === 1 ? { background: "var(--green-soft)", color: "var(--green)" } : undefined}>{r.score}</span> : <span className="ico-circle" style={{ background: "var(--line-2)" }}><Ico name="hardhat" /></span>}
                    <div>
                      <div className="row wrap-gap" style={{ gap: 8 }}>
                        <b>{b.bidder}</b>
                        {h ? (
                          b.contractor_id && <Link href={`/contractors/${b.contractor_id}`} className={`pill ${BAND[h.band]}`}>{h.band} · {h.jobs} BMC jobs</Link>
                        ) : (
                          <span className="pill s-inv">New to BMC</span>
                        )}
                        {r?.pos === 1 && <span className="pill s-done">{a.by === "claude" ? "AI pick" : "Rules pick"}</span>}
                        {won && <span className="pill s-done"><Ico name="check" size={13} /> Awarded</span>}
                      </div>
                      <div className="small muted" style={{ marginTop: 3 }}>
                        {b.days} days · {b.warranty_months}-month warranty · {b.experience_years} yrs experience{h ? ` · repairs fail ${h.failVsPeers.toFixed(1)}× peers · ${Math.round(h.sla)}% on time` : ` · ${b.similar_jobs} similar jobs · ${b.equipment}`}
                      </div>
                      {b.note && <div className="small ink2" style={{ marginTop: 3 }}>“{b.note}”</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <div className="num bold" style={{ fontSize: 18 }}>{inr(b.amount_inr)}</div>
                    <div className={`tiny ${price && price.saving > 0 ? "green" : "muted"}`}>{!price ? "Estimate unavailable" : price.saving === 0 ? "At estimate" : `${price.percent}% ${price.saving > 0 ? "below" : "above"} estimate`}</div>
                    {price && price.saving > 0 && <div className="tiny green">{inr(price.saving)} potential saving</div>}
                  </div>
                </div>
                {r && (
                  <div className="grid2 small" style={{ marginTop: 12 }}>
                    <div>{r.strengths.map((x: string) => <div key={x} className="row green" style={{ gap: 6 }}><Ico name="check" size={14} /> {x}</div>)}</div>
                    <div>{r.risks.map((x: string) => <div key={x} className="row" style={{ gap: 6, color: "var(--amber)" }}><Ico name="alert" size={14} /> {x}</div>)}</div>
                  </div>
                )}
                {!awarded && (
                  <div style={{ marginTop: 12, textAlign: "right" }}>
                    <button className={`btn sm ${r?.pos === 1 ? "primary" : ""}`} disabled={busy} onClick={() => award(b.bid_id)}>Award to this bidder</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {awarded && (
        <div className="banner ok"><Ico name="check" /><div><b>Awarded.</b> The {t.complaint_ids.length} linked complaint{t.complaint_ids.length === 1 ? " is" : "s are"} now “In progress”, and citizens see who is doing the work.</div></div>
      )}

      {adding && (
        <div className="overlay" onClick={() => setAdding(false)}>
          <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
            <div className="between"><h2>Add a bid</h2><button className="btn ghost sm" onClick={() => setAdding(false)}><Ico name="x" /></button></div>
            {([
              ["bidder", "Bidder name"], ["amount_inr", "Amount (₹)"], ["days", "Days to finish"], ["warranty_months", "Warranty (months)"],
              ["experience_years", "Years of experience"], ["similar_jobs", "Similar jobs done"], ["equipment", "Equipment and plant"],
            ] as const).map(([k, l]) => (
              <div key={k}>
                <label className="fl">{l}</label>
                <input className="input" value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} inputMode={["bidder", "equipment"].includes(k) ? "text" : "numeric"} />
              </div>
            ))}
            {err && <div className="banner bad small">{err}</div>}
            <button className="btn primary big" onClick={addBid}>Add bid</button>
          </div>
        </div>
      )}
    </div>
  );
}
