import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { requireRole } from "@/lib/session";
import { getTender } from "@/lib/store";
import { db } from "@/lib/data";
import { fmtDate, inr } from "@/lib/taxonomy";
import { TenderClient } from "./TenderClient";

export const dynamic = "force-dynamic";

export default async function TenderPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("officer");
  const t = getTender((await params).id);
  if (!t) notFound();
  const history = Object.fromEntries(db().contractors.map((c) => [c.contractor_id, { band: c.band, failVsPeers: +c.reopen_vs_peers, sla: +c.sla_met_pct, jobs: +c.jobs }]));
  return (
    <>
      <TopBar session={s} active="/officer/tenders" />
      <main className="wrap-wide stack-lg" style={{ maxWidth: 960 }}>
        <div>
          <Link href="/officer/tenders" className="back"><Ico name="back" size={18} /> Tenders</Link>
          <div className="between wrap-gap">
            <div>
              <p className="muted small">{t.tender_id} · opened {fmtDate(t.opened_at)} · closes {fmtDate(t.closes_at)}</p>
              <h1 style={{ marginTop: 2 }}>{t.title}</h1>
              <p className="ink2" style={{ marginTop: 4 }}>Rate-card estimate {inr(t.estimate_inr)} · fixes {t.complaint_ids.length} complaint{t.complaint_ids.length === 1 ? "" : "s"} · risk score {t.risk_score}</p>
            </div>
            <span className={`pill ${t.status === "Awarded" ? "s-done" : "s-prog"}`} style={{ height: 30 }}>{t.status}</span>
          </div>
        </div>
        <TenderClient tender={t} history={history} />
      </main>
    </>
  );
}
