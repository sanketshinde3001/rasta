import Link from "next/link";
import { notFound } from "next/navigation";
import "../../visual.css";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { RtiButton } from "@/components/RtiBuilder";
import { getSession } from "@/lib/session";
import { db } from "@/lib/data";
import { fmtDate, inr, inrShort } from "@/lib/taxonomy";
import { rtiRows } from "../../rights/rtiData";
import { cityAverages, cleanName, gradeOf, num } from "../grade";

const FLAG_SHORT: Record<string, string> = {
  OVERBILLED: "Billed above rate",
  GHOST_DUPLICATE: "Possible double bill",
  DLP_PAID: "Should have been free",
  FAILED_WITHIN_30D: "Broke within a month",
};
const VERDICT_STYLE: Record<string, string> = { "Fair performance": "s-done", "Needs improvement": "s-reg", "Serious concern": "p-High" };

function Dots({ on, cls }: { on: number; cls: string }) {
  return <div className="dots">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < on ? cls : ""} />)}</div>;
}

function Compare({ label, value, avg, max, fmt, lowerBetter }: { label: string; value: number; avg: number; max: number; fmt: (v: number) => string; lowerBetter: boolean }) {
  const worse = lowerBetter ? value > avg * 1.05 : value < avg * 0.95;
  const better = lowerBetter ? value < avg * 0.95 : value > avg * 1.05;
  return (
    <div className="cmp">
      <div className="between small">
        <span>{label}</span>
        <b className={worse ? "red" : better ? "green" : ""}>{fmt(value)}</b>
      </div>
      <div className="cmp-bar">
        <i style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: worse ? "var(--red)" : better ? "var(--green)" : "var(--accent)" }} />
        <b style={{ left: `${Math.min(99, (avg / max) * 100)}%` }} title="City average" />
      </div>
      <div className="cmp-legend"><span>{worse ? "Worse than the city" : better ? "Better than the city" : "About the city average"}</span><span>city: {fmt(avg)}</span></div>
    </div>
  );
}

export default async function Contractor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  const all = db().contractors;
  const c = all.find((x) => x.contractor_id === id);
  if (!c) notFound();
  const g = gradeOf(c);
  const avg = cityAverages(all);
  const broke = Math.round(num(c.reopen_pct) / 10);
  const peers = Math.round(num(c.expected_reopen_pct) / 10);
  const ontime = Math.round(num(c.sla_met_pct) / 10);
  const rv = num(c.reopen_vs_peers);
  const court = c.ai_court;
  const jobs = rtiRows((w) => w.contractor_id === id)
    .filter((r) => r.flags.some((f) => FLAG_SHORT[f]))
    .sort((a, b) => (b.completed || "").localeCompare(a.completed || ""))
    .sort((a, b) => b.flags.filter((f) => f !== "FAILED_WITHIN_30D" && FLAG_SHORT[f]).length - a.flags.filter((f) => f !== "FAILED_WITHIN_30D" && FLAG_SHORT[f]).length)
    .slice(0, 8);

  const money = [
    { icon: "rupee", t: "Billed above the fair rate", d: "Bill more than 30% over the official rate for the job size.", n: num(c.overbilled_jobs), amt: num(c.overbilled_excess_inr) },
    { icon: "copy", t: "Billed twice for the same work", d: "Same road, same repair, billed again within 7 days with no complaint.", n: num(c.ghost_bills), amt: num(c.ghost_bills_inr) },
    { icon: "shield", t: "Charged for repairs that should be free", d: "Road was still under the contractor's guarantee, yet BMC paid.", n: num(c.dlp_paid_jobs), amt: num(c.dlp_paid_inr) },
  ];
  const moneyTotal = money.reduce((s2, m) => s2 + m.amt, 0);

  return (
    <>
      <TopBar session={s} active="/contractors" />
      <main className="wrap stack-lg" style={{ maxWidth: 720 }}>
        <div>
          <Link href="/contractors" className="back"><Ico name="back" size={18} /> All contractors</Link>
          <div className="row" style={{ gap: 16, alignItems: "center" }}>
            <span className={`grade lg ${g.tone}`}>{g.letter}</span>
            <div style={{ minWidth: 0 }}>
              <h1>{cleanName(c.contractor_name)}</h1>
              <p className="small muted" style={{ marginTop: 4 }}>{c.jobs} repairs · {inrShort(num(c.spend_inr))} billed · {c.wards_worked} wards · with BMC since {c.empanelled_since}</p>
            </div>
          </div>
        </div>

        <section className="card stack">
          <div className="row"><span className="tile-ico" style={{ background: rv > 1.2 ? "var(--red-soft)" : "var(--green-soft)", color: rv > 1.2 ? "var(--red)" : "var(--green)" }}><Ico name="repeat" /></span>
            <div><h2>Do the repairs last?</h2><p className="small ink2">Out of 10 repairs, how many broke again within a month</p></div>
          </div>
          <div>
            <div className="dotrow"><span className="small bold">This contractor</span><Dots on={broke} cls="on-bad" /></div>
            <div className="dotrow"><span className="small muted">Others, same rain and flooding</span><Dots on={peers} cls="on-mid" /></div>
          </div>
          <p className={`small ${rv > 1.2 ? "red" : rv < 0.85 ? "green" : "ink2"}`} style={{ fontWeight: 560 }}>
            {rv > 1.05 ? `Their repairs break ${rv.toFixed(1)}× as often as others working in the same conditions.` : rv < 0.95 ? `Their repairs last longer than others in the same conditions: ${broke} of 10 break, against ${peers} of 10.` : "Their repairs last about as well as others."}
          </p>
        </section>

        <section className="card stack">
          <div className="row"><span className="tile-ico"><Ico name="clock" /></span>
            <div><h2>Are they on time?</h2><p className="small ink2">Out of 10 repairs, how many finished within the deadline</p></div>
          </div>
          <div className="dotrow"><span className="small bold">On time</span><Dots on={ontime} cls="on-good" /></div>
          <p className="small ink2">{ontime} of 10 on time. City average: {Math.round(avg.sla / 10)} of 10.</p>
        </section>

        <section className="card stack">
          <h2>Compared with the city</h2>
          <Compare label="Repairs that broke again" value={num(c.reopen_pct)} avg={avg.reopen} max={50} fmt={(v) => `${Math.round(v)}%`} lowerBetter />
          <Compare label="Finished on time" value={num(c.sla_met_pct)} avg={avg.sla} max={100} fmt={(v) => `${Math.round(v)}%`} lowerBetter={false} />
          <Compare label="Typical bill vs fair rate" value={num(c.median_rate_ratio) * 100} avg={avg.rate * 100} max={150} fmt={(v) => `${Math.round(v)}%`} lowerBetter />
        </section>

        <section className="card">
          <div className="between" style={{ marginBottom: 4 }}>
            <div className="row"><span className="tile-ico" style={{ background: "var(--red-soft)", color: "var(--red)" }}><Ico name="rupee" /></span><h2>Money questions</h2></div>
            <b className="red num">{inrShort(moneyTotal)}</b>
          </div>
          {money.map((m) => (
            <div key={m.t} className="money-row">
              <Ico name={m.icon} size={18} className={m.n ? "red" : "muted"} />
              <div style={{ minWidth: 0 }}>
                <div className="small bold">{m.t}</div>
                <div className="tiny muted">{m.d}</div>
              </div>
              <div className="amt">
                <div className={m.n ? "red" : "muted"}>{m.n ? inrShort(m.amt) : "None"}</div>
                <div className="tiny muted" style={{ fontWeight: 400 }}>{m.n} job{m.n === 1 ? "" : "s"}</div>
              </div>
            </div>
          ))}
        </section>

        {court?.judge && (
          <section className="card stack">
            <div className="between">
              <div className="row"><Ico name="scale" size={18} /><h2>Audit court</h2></div>
              <span className={`pill ${VERDICT_STYLE[court.judge.verdict] || "s-inv"}`}>{court.judge.verdict}</span>
            </div>
            <p className="small ink2">{String(court.judge.action || court.judge.ruling).split(/(?<=\.)\s/)[0]}</p>
            <details>
              <summary className="small bold" style={{ cursor: "pointer", color: "var(--accent)" }}>Read the charges, the defence and the ruling</summary>
              <div className="stack small" style={{ marginTop: 12 }}>
                {court.auditor.charges.map((ch: any, i: number) => (
                  <p key={i}><b className="red">Charge {i + 1}.</b> {ch.claim}</p>
                ))}
                {court.defence.mitigations.map((m: any, i: number) => (
                  <p key={i}><b className="green">Defence.</b> {m.point}</p>
                ))}
                <p><b>Ruling.</b> {court.judge.ruling}</p>
              </div>
            </details>
            <p className="tiny muted"><Ico name="sparkles" size={12} /> Written by Claude from the audit numbers.</p>
          </section>
        )}

        {jobs.length > 0 && (
          <section>
            <div className="section-title"><h2>Repairs to ask about</h2><span className="small muted">RTI letter in one tap</span></div>
            <div className="card" style={{ padding: "4px 16px" }}>
              <div className="list">
                {jobs.map((r) => (
                  <div key={r.id} className="row" style={{ padding: "12px 0", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="small bold">{r.road}</div>
                      <div className="tiny muted">{r.method} · {r.id} · Ward {r.ward} · {fmtDate(r.completed)}</div>
                      <div className="chips" style={{ marginTop: 6, gap: 6 }}>
                        {r.flags.filter((f) => FLAG_SHORT[f]).map((f) => <span key={f} className={`pill ${f === "FAILED_WITHIN_30D" ? "s-reg" : "p-High"}`} style={{ height: 22, fontSize: 12 }}>{FLAG_SHORT[f]}</span>)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flex: "none" }}>
                      <div className="num small bold">{inr(r.cost)}</div>
                      <div className="tiny muted" style={{ marginBottom: 6 }}>fair {inr(r.expected)}</div>
                      <RtiButton row={r} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
