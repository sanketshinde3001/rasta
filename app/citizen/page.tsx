import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { requireRole } from "@/lib/session";
import { allComplaints } from "@/lib/store";
import { HomeList } from "./HomeList";
import { bucketOf, photoOf } from "@/lib/taxonomy";

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
          <Ico name="plus" size={22} /> New registration
        </Link>

        <HomeList
          rows={mine.map((c) => ({
            id: c.complaint_id, sub: c.category_reported, road: c.road_name || c.locality_text || "Shared location", at: c.received_at,
            bucket: bucketOf(c.status), photo: photoOf(c), supported: c.complainant_id !== s.id,
          }))}
        />

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
