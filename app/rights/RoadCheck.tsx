"use client";
import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/taxonomy";
import { Ico } from "@/components/Ico";

type R = { id: string; name: string; seg: number; ward: string; dlp: string; last: string };

export function RoadCheck({ roads }: { roads: R[] }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => (q.length < 2 ? [] : roads.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6)), [q, roads]);
  return (
    <div className="stack">
      <div>
        <label className="fl">Is my road under guarantee?</label>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a road name, e.g. LBS Marg" />
      </div>
      {hits.map((r) => (
        <div key={r.id} className="between card flat tight">
          <div>
            <div className="small bold">{r.name} · part {r.seg}</div>
            <div className="tiny muted">Ward {r.ward} · last resurfaced {fmtDate(r.last)}</div>
          </div>
          {r.dlp === "Y" ? (
            <span className="pill s-done"><Ico name="shield" size={13} /> Under guarantee</span>
          ) : (
            <span className="pill s-inv">No guarantee</span>
          )}
        </div>
      ))}
    </div>
  );
}
