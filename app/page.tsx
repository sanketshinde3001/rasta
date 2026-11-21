import Link from "next/link";
import { Ico } from "@/components/Ico";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/data";
import { inrShort } from "@/lib/taxonomy";

export default async function Landing() {
  const s = await getSession();
  if (s) redirect(s.role === "officer" ? "/officer" : "/citizen");
  const sum = db().summary;
  return (
    <main className="wrap" style={{ paddingTop: 56 }}>
      <div className="brand" style={{ fontSize: 22, marginBottom: 34 }}>
        <span className="brand-mark" style={{ width: 38, height: 38, borderRadius: 11 }}><Ico name="road" size={22} stroke={2.2} /></span>
        Rasta
      </div>
      <h1 style={{ fontSize: 32 }}>Fix Mumbai&apos;s roads together.</h1>
      <p className="ink2" style={{ marginTop: 10, fontSize: 17 }}>
        Report a pothole in a minute. Track it until it&apos;s fixed. See where every rupee of your ward&apos;s repair money goes.
      </p>

      <p className="fl" style={{ marginTop: 34, marginBottom: 10, color: "var(--muted)", fontSize: 14 }}>Continue as</p>
      <div className="stack">
        <Link href="/login?role=citizen" className="card card-link row" style={{ padding: 20, gap: 16 }}>
          <span className="tile-ico" style={{ width: 52, height: 52 }}><Ico name="users" size={26} /></span>
          <span style={{ flex: 1 }}>
            <b style={{ fontSize: 18 }}>Citizen</b>
            <span className="muted" style={{ display: "block", fontSize: 14.5 }}>Report a problem and track your complaints</span>
          </span>
          <Ico name="chevron" className="muted" />
        </Link>
        <Link href="/login?role=officer" className="card card-link row" style={{ padding: 20, gap: 16 }}>
          <span className="tile-ico" style={{ width: 52, height: 52, background: "#eef0ed", color: "var(--ink)" }}><Ico name="building" size={26} /></span>
          <span style={{ flex: 1 }}>
            <b style={{ fontSize: 18 }}>Ward officer</b>
            <span className="muted" style={{ display: "block", fontSize: 14.5 }}>Review complaints, plan the budget, run tenders</span>
          </span>
          <Ico name="chevron" className="muted" />
        </Link>
      </div>

      <Link href="/map" className="row" style={{ marginTop: 26, color: "var(--accent)", fontWeight: 560 }}>
        <Ico name="map" size={18} /> Just looking? Open the city map
      </Link>

      <div className="card flat" style={{ marginTop: 40, background: "transparent" }}>
        <p className="tiny muted" style={{ marginBottom: 10 }}>Monsoon 2025 in numbers</p>
        <div className="grid3">
          <div className="stat"><b>{inrShort(sum.total_spend_inr)}</b><span>spent on road repairs</span></div>
          <div className="stat"><b className="red">{inrShort(sum.money_flags_dedup_inr)}</b><span>in bills that need checking</span></div>
          <div className="stat"><b>24%</b><span>repairs failed within 30 days</span></div>
        </div>
      </div>
      <p className="tiny muted" style={{ marginTop: 22 }}>Prototype built for Claude Impact Lab Mumbai. All data is synthetic; contractors are fictional.</p>
    </main>
  );
}
