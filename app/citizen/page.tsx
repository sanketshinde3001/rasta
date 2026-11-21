import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { requireRole } from "@/lib/session";
import { allComplaints } from "@/lib/store";
import { ComplaintRow } from "@/components/ComplaintRow";

export const dynamic = "force-dynamic";

export default async function CitizenHome() {
  const s = await requireRole("citizen");
  const mine = allComplaints()
    .filter((c) => c.complainant_id === s.id || (c.supporters || []).includes(s.id))
    .sort((a, b) => (b.received_at > a.received_at ? 1 : -1));
  return (
    <>
      <TopBar session={s} active="/citizen" />
      <main className="wrap stack-lg">
        <div>
          <p className="muted small">Namaste, {s.name.split(" ")[0]} · {s.area}</p>
          <h1 style={{ marginTop: 4 }}>Seen a problem on the road?</h1>
        </div>

        <Link href="/citizen/new" className="btn primary big" style={{ height: 64, fontSize: 18 }}>
          <Ico name="camera" size={22} /> Report a problem
        </Link>

        <section>
          <div className="section-title">
            <h2>Your complaints</h2>
            <span className="muted small">{mine.length}</span>
          </div>
          <div className="card" style={{ padding: "4px 14px" }}>
            {mine.length ? (
              <div className="list">{mine.map((c) => <ComplaintRow key={c.complaint_id} c={c} href={`/citizen/complaints/${c.complaint_id}`} />)}</div>
            ) : (
              <p className="empty">No complaints yet.</p>
            )}
          </div>
        </section>

        <section>
          <div className="section-title"><h2>Know your city</h2></div>
          <div className="grid3">
            <Link href="/map" className="tile">
              <span className="tile-ico"><Ico name="map" /></span>
              <b>City map</b><span>Complaints and repairs near you</span>
            </Link>
            <Link href="/contractors" className="tile">
              <span className="tile-ico"><Ico name="hardhat" /></span>
              <b>Contractors</b><span>Who fixes your roads, and how well</span>
            </Link>
            <Link href="/rights" className="tile">
              <span className="tile-ico"><Ico name="shield" /></span>
              <b>Your rights</b><span>Deadlines, free re-repairs, escalation</span>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
