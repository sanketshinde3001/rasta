"use client";
import { useState } from "react";
import Link from "next/link";
import { Ico } from "@/components/Ico";
import { BUCKET_STYLE, fmtDate, type Bucket } from "@/lib/taxonomy";
import { useT } from "@/components/I18n";

type Row = { id: string; sub: string; road: string; at: string; bucket: Bucket; photo: string | null; supported: boolean };
const BUCKETS: Bucket[] = ["Registered", "In progress", "Closed", "Invalid"];

export function HomeList({ rows }: { rows: Row[] }) {
  const t = useT();
  const [f, setF] = useState<Bucket | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const shown = rows.filter((r) => !f || r.bucket === f);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const id = q.trim().toUpperCase();
    if (!id) return;
    const r = await fetch(`/api/complaints/${encodeURIComponent(id)}`);
    if (r.ok) location.href = `/citizen/complaints/${id}`;
    else setErr(`No complaint found with ID ${id}.`);
  }

  return (
    <div className="stack">
      <form onSubmit={search} className="lp-search" style={{ background: "var(--card)" }}>
        <Ico name="filter" size={18} className="muted" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setErr(""); }} placeholder={`${t("home.search")}, e.g. BMC25-000027`} />
      </form>
      {err && <p className="small red">{err}</p>}
      <div className="status-tiles">
        {BUCKETS.map((b) => (
          <button key={b} className={`status-tile ${BUCKET_STYLE[b]} ${f === b ? "on" : ""}`} onClick={() => setF(f === b ? null : b)}>
            <span>{t(`st.${b}`)}</span>
            <b>{rows.filter((r) => r.bucket === b).length}</b>
          </button>
        ))}
      </div>
      <div className="between" style={{ marginTop: 8 }}>
        <h2>{f ? t(`st.${f}`) : t("home.track")}</h2>
        {f && <button className="linkbtn small" onClick={() => setF(null)}>Show all</button>}
      </div>
      <div className="card" style={{ padding: "4px 14px" }}>
        <div className="list">
          {shown.map((c) => (
            <Link key={c.id} href={`/citizen/complaints/${c.id}`} className="crow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.photo ? <img className="thumb" src={c.photo} alt="" /> : <span className="thumb"><Ico name="mic" size={20} /></span>}
              <div className="main">
                <div className="tiny muted num">{c.id}</div>
                <div className="title ellipsis">{c.sub}</div>
                <div className="small muted ellipsis">{c.road} · {fmtDate(c.at)}{c.supported ? " · you support this" : ""}</div>
              </div>
              <span className={`pill ${BUCKET_STYLE[c.bucket]}`}>{t(`st.${c.bucket}`)}</span>
            </Link>
          ))}
          {!shown.length && <p className="empty small">{t("nothing")}</p>}
        </div>
      </div>
    </div>
  );
}
