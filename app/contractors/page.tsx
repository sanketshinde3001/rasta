import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { getSession } from "@/lib/session";
import { db } from "@/lib/data";
import { inrShort, BAND } from "@/lib/taxonomy";


export default async function Contractors() {
  const s = await getSession();
  const order: Record<string, number> = { Concern: 0, Watch: 1, Good: 2 };
  const list = [...db().contractors].sort((a, b) => order[a.band] - order[b.band] || b.spend_inr - a.spend_inr);
  return (
    <>
      <TopBar session={s} active="/contractors" />
      <main className="wrap stack-lg" style={{ maxWidth: 760 }}>
        <div>
          <h1>Who repairs Mumbai&apos;s roads</h1>
          <p className="ink2" style={{ marginTop: 6 }}>
            Each contractor is compared with others doing the same kind of repair, in equally flood-prone wards, in equally rainy weeks. So nobody is blamed for the monsoon.
          </p>
        </div>
        <div className="stack">
          {list.map((c) => {
            const money = +c.overbilled_excess_inr + +c.ghost_bills_inr + +c.dlp_paid_inr;
            return (
              <Link key={c.contractor_id} href={`/contractors/${c.contractor_id}`} className="card card-link">
                <div className="between">
                  <div className="row">
                    <span className="ico-circle" style={{ background: "var(--line-2)" }}><Ico name="hardhat" /></span>
                    <div>
                      <div className="bold">{c.contractor_name.replace(" (synthetic)", "")}</div>
                      <div className="small muted">{c.jobs} jobs · {inrShort(+c.spend_inr)} billed · {c.wards_worked} wards</div>
                    </div>
                  </div>
                  <span className={`pill ${BAND[c.band]}`}>{c.band}</span>
                </div>
                <div className="grid3" style={{ marginTop: 14 }}>
                  <div className="stat"><b className={+c.reopen_vs_peers > 1.2 ? "red" : ""}>{(+c.reopen_vs_peers).toFixed(1)}×</b><span>repair failures vs peers</span></div>
                  <div className="stat"><b>{Math.round(+c.sla_met_pct)}%</b><span>deadlines met</span></div>
                  <div className="stat"><b className={money > 0 ? "red" : ""}>{inrShort(money)}</b><span>in bills to check</span></div>
                </div>
                {c.ai_court?.judge?.verdict && <p className="small ink2" style={{ marginTop: 12 }}><Ico name="scale" size={14} /> Audit verdict: <b>{c.ai_court.judge.verdict}</b></p>}
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
