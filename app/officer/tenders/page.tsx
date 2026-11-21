import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { requireRole } from "@/lib/session";
import { tenders } from "@/lib/store";
import { fmtDate, inr } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function Tenders() {
  const s = await requireRole("officer");
  const list = tenders().filter((t) => t.ward_code === s.ward);
  return (
    <>
      <TopBar session={s} active="/officer/tenders" />
      <main className="wrap-wide stack-lg" style={{ maxWidth: 860 }}>
        <div>
          <p className="muted small">Ward {s.ward}</p>
          <h1 style={{ marginTop: 2 }}>Tenders</h1>
        </div>
        {list.length ? (
          <div className="card" style={{ padding: "4px 16px" }}>
            <div className="list">
              {list.map((t) => (
                <Link key={t.tender_id} href={`/officer/tenders/${t.tender_id}`} className="crow">
                  <span className="ico-circle" style={{ background: "var(--line-2)" }}><Ico name="gavel" /></span>
                  <div className="main">
                    <div className="title ellipsis">{t.title}</div>
                    <div className="small muted">{t.tender_id} · estimate {inr(t.estimate_inr)} · {t.bids.length} bids · closes {fmtDate(t.closes_at)}</div>
                  </div>
                  <span className={`pill ${t.status === "Awarded" ? "s-done" : "s-prog"}`}>{t.status}</span>
                  <Ico name="chevron" size={18} className="muted" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="card empty stack" style={{ alignItems: "center" }}>
            <p>No tenders yet.</p>
            <Link href="/officer/budget" className="btn primary"><Ico name="wallet" size={18} /> Go to smart budget</Link>
          </div>
        )}
      </main>
    </>
  );
}
