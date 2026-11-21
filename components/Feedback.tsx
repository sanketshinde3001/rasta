"use client";
import { useState } from "react";
import Link from "next/link";
import { Ico } from "./Ico";

export function Feedback({ id, rating }: { id: string; rating?: number }) {
  const [r, setR] = useState(rating || 0);
  const [saved, setSaved] = useState(!!rating);
  async function rate(n: number) {
    setR(n);
    await fetch(`/api/complaints/${id}/feedback`, { method: "POST", body: JSON.stringify({ stars: n }) });
    setSaved(true);
  }
  return (
    <section className="card stack" style={{ textAlign: "center" }}>
      <h3>{saved ? "Thanks for rating this repair" : "How was the repair?"}</h3>
      <div className="row" style={{ justifyContent: "center", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => rate(n)} aria-label={`${n} stars`} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 32, lineHeight: 1, color: n <= r ? "#e0a100" : "#d5d9d7" }}>★</button>
        ))}
      </div>
      {saved && r <= 2 && <p className="small ink2">Sorry it didn&apos;t hold. You can renew the complaint with a fresh photo.</p>}
      <Link href={`/citizen/new?renew=${id}`} className={`btn block ${saved && r <= 2 ? "primary" : ""}`}><Ico name="repeat" size={18} /> Problem is back? Renew complaint</Link>
    </section>
  );
}
