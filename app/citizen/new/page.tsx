import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { requireRole } from "@/lib/session";
import { NewComplaint } from "./NewComplaint";

export default async function NewPage() {
  const s = await requireRole("citizen");
  return (
    <>
      <TopBar session={s} active="/citizen" />
      <main className="wrap">
        <Link href="/citizen" className="back"><Ico name="back" size={18} /> Home</Link>
        <h1 style={{ marginBottom: 6 }}>Report a problem</h1>
        <p className="ink2" style={{ marginBottom: 22 }}>Takes about a minute. A photo helps the most.</p>
        <NewComplaint />
      </main>
    </>
  );
}
