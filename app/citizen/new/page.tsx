import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { requireRole } from "@/lib/session";
import { NewComplaint } from "./NewComplaint";
import { getComplaint } from "@/lib/store";

export default async function NewPage({ searchParams }: { searchParams: Promise<{ renew?: string }> }) {
  const s = await requireRole("citizen");
  const { renew } = await searchParams;
  const old = renew ? getComplaint(renew) : null;
  const prefill = old && old.lat && old.lon ? { subcategory: old.category_reported, lat: old.lat, lon: old.lon, renew_of: old.complaint_id } : null;
  return (
    <>
      <TopBar session={s} active="/citizen" />
      <main className="wrap">
        <Link href="/citizen" className="back"><Ico name="back" size={18} /> Home</Link>
        <h1 style={{ marginBottom: 6 }}>{prefill ? "Renew complaint" : "New registration"}</h1>
        <p className="ink2" style={{ marginBottom: 22 }}>{prefill ? `The problem from #${prefill.renew_of} is back? Add a fresh photo and submit.` : "Takes about a minute. A photo helps the most."}</p>
        <NewComplaint phone={s.phone} prefill={prefill} />
      </main>
    </>
  );
}
