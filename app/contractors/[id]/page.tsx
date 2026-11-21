import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { getSession } from "@/lib/session";
import { db } from "@/lib/data";
import { FLAG_TEXT } from "@/lib/views";
import { fmtDate, inr, inrShort, BAND } from "@/lib/taxonomy";

export default async function Contractor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  const c = db().contractors.find((x) => x.contractor_id === id);
  if (!c) notFound();
  const jobs = db().workOrders.filter((w) => w.contractor_id === id);
  const flagged = jobs.filter((w) => /OVERBILLED|GHOST|DLP_PAID/.test(w.flags)).slice(0, 8);
  const court = c.ai_court;
  const metrics = [
    { v: c.jobs, l: "Jobs done", icon: "check" },
    { v: inrShort(+c.spend_inr), l: "Total billed to BMC", icon: "rupee" },
    { v: `${Math.round(+c.sla_met_pct)}%`, l: "Finished within deadline", icon: "clock", bad: +c.sla_met_pct < 50 },
    { v: `${Math.round(+c.reopen_pct)}%`, l: `Repairs failed in 30 days (peers in same conditions: ${Math.round(+c.expected_reopen_pct)}%)`, icon: "repeat", bad: +c.reopen_vs_peers > 1.2 },
    { v: `${(+c.median_rate_ratio).toFixed(2)}×`, l: "Typical bill vs rate card", icon: "file" },
    { v: `${c.overbilled_jobs} · ${inrShort(+c.overbilled_excess_inr)}`, l: "Over-billed jobs · excess", icon: "alert", bad: +c.overbilled_jobs > 0 },
    { v: `${c.ghost_bills} · ${inrShort(+c.ghost_bills_inr)}`, l: "Possible double bills", icon: "copy", bad: +c.ghost_bills > 0 },
    { v: `${c.dlp_paid_jobs} · ${inrShort(+c.dlp_paid_inr)}`, l: "Guarantee repairs charged to BMC", icon: "shield", bad: +c.dlp_paid_jobs > 0 },
    { v: c.wards_worked, l: `Wards worked in · empanelled since ${c.empanelled_since}`, icon: "map" },
  ];
  return (
    <>
      <TopBar session={s} active="/contractors" />
      <main className="wrap stack-lg" style={{ maxWidth: 760 }}>
        <div>
          <Link href="/contractors" className="back"><Ico name="back" size={18} /> All contractors</Link>
          <div className="between" style={{ alignItems: "flex-start" }}>
            <div>
              <h1>{c.contractor_name.replace(" (synthetic)", "")}</h1>
              <p className="ink2" style={{ marginTop: 6 }}>{c.why}</p>
            </div>
            <span className={`pill ${BAND[c.band]}`} style={{ height: 30 }}>{c.band}</span>
          </div>
        </div>

        <div className="grid3">
          {metrics.map((m) => (
            <div key={m.l} className="card tight stat">
              <Ico name={m.icon} size={18} className={m.bad ? "red" : "muted"} />
              <b className={m.bad ? "red" : ""} style={{ fontSize: 21, marginTop: 6 }}>{m.v}</b>
              <span>{m.l}</span>
            </div>
          ))}
        </div>

        {court?.judge && (
          <section>
            <div className="section-title"><h2>Audit court</h2><span className="pill ai-tag"><Ico name="sparkles" size={13} /> Claude</span></div>
            <div className="card stack">
              <div className="banner info"><Ico name="scale" /><div><b>{court.judge.verdict}.</b> {court.judge.ruling}</div></div>
              <p className="small"><b>Action:</b> {court.judge.action}</p>
              <details>
                <summary className="small bold" style={{ cursor: "pointer" }}>Auditor&apos;s charges and the defence</summary>
                <div className="stack small" style={{ marginTop: 12 }}>
                  {court.auditor.charges.map((ch: any, i: number) => (
                    <p key={i}><b className="red">Charge {i + 1}.</b> {ch.claim} <span className="muted">({ch.work_orders.join(", ")})</span></p>
                  ))}
                  {court.defence.mitigations.map((m: any, i: number) => (
                    <p key={i}><b className="green">Defence.</b> {m.point || m.claim || m.argument || JSON.stringify(m).slice(0, 300)}</p>
                  ))}
                </div>
              </details>
            </div>
          </section>
        )}

        {flagged.length > 0 && (
          <section>
            <div className="section-title"><h2>Bills to check</h2></div>
            <div className="card" style={{ padding: "4px 16px" }}>
              <div className="list">
                {flagged.map((w) => (
                  <div key={w.work_order_id} className="between" style={{ padding: "12px 0" }}>
                    <div>
                      <div className="small bold">{w.repair_method} · {w.road_name}</div>
                      <div className="tiny muted">{w.work_order_id} · Ward {w.ward_code} · {fmtDate(w.completed_at)} · {w.flags.split("|").filter((f) => FLAG_TEXT[f]?.money).map((f) => FLAG_TEXT[f].title).join(", ")}</div>
                    </div>
                    <div className="num small" style={{ textAlign: "right" }}><b className="red">{inr(w.cost_inr)}</b><div className="tiny muted">fair {inr(w.expected_inr)}</div></div>
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
