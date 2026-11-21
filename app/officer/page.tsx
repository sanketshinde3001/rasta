import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { requireRole } from "@/lib/session";
import { wardQueue } from "@/lib/officer";
import { db } from "@/lib/data";
import { BUCKET_STYLE, CATEGORIES, SEASONS, currentSeason, fmtDate, photoOf } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

const VIEWS = [
  { k: "review", label: "To review" },
  { k: "high", label: "High priority" },
  { k: "overdue", label: "Overdue" },
  { k: "progress", label: "In progress" },
  { k: "all", label: "All" },
];

export default async function Inbox({ searchParams }: { searchParams: Promise<{ view?: string; cat?: string; sort?: string }> }) {
  const s = await requireRole("officer");
  const sp = await searchParams;
  const view = sp.view || "review";
  const sort = sp.sort || "priority";
  const season = currentSeason();
  const ward = db().wardMap.get(s.ward)!;
  const q = wardQueue(s.ward, season);
  const open = q.filter((x) => x.b === "Registered" || x.b === "In progress");
  const match: Record<string, (x: (typeof q)[number]) => boolean> = {
    review: (x) => x.b === "Registered",
    high: (x) => (x.b === "Registered" || x.b === "In progress") && x.p.level === "High",
    overdue: (x) => x.overdue,
    progress: (x) => x.b === "In progress",
    all: () => true,
  };
  let rows = q.filter(match[view] || match.review);
  if (sp.cat) rows = rows.filter((x) => x.c.category === sp.cat);
  rows.sort((a, b) => (sort === "recent" ? (b.c.received_at > a.c.received_at ? 1 : -1) : b.p.score - a.p.score));
  const newToday = q.filter((x) => x.c.source === "app" && x.b === "Registered").length;
  const href = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { view, cat: sp.cat, sort, ...o };
    Object.entries(m).forEach(([k, v]) => v && p.set(k, v));
    return `/officer?${p}`;
  };

  return (
    <>
      <TopBar session={s} active="/officer" />
      <main className="wrap-wide stack-lg">
        <div className="between wrap-gap">
          <div>
            <p className="muted small">Ward {s.ward} · {ward.ward_name}</p>
            <h1 style={{ marginTop: 2 }}>Complaints</h1>
          </div>
          <span className="pill ai-tag" title={SEASONS[season].hint}><Ico name="cloud" size={14} /> {SEASONS[season].label} weighting</span>
        </div>

        <div className="grid3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="card tight stat"><b>{q.filter((x) => x.b === "Registered").length}</b><span>waiting for review</span></div>
          <div className="card tight stat"><b className="red">{open.filter((x) => x.p.level === "High").length}</b><span>high priority, not fixed</span></div>
          <div className="card tight stat"><b>{open.filter((x) => x.overdue).length}</b><span>past their deadline</span></div>
          <div className="card tight stat"><b>{newToday}</b><span>new from the Rasta app</span></div>
        </div>

        <div className="between wrap-gap">
          <div className="chips">
            {VIEWS.map((v) => (
              <Link key={v.k} href={href({ view: v.k })} className={`chip ${view === v.k ? "on" : ""}`}>
                {v.label} <span className="count">{q.filter(match[v.k]).length}</span>
              </Link>
            ))}
          </div>
          <div className="row">
            <div className="seg">
              <Link href={href({ cat: undefined })} className={!sp.cat ? "on" : ""}>All types</Link>
              {Object.keys(CATEGORIES).map((c) => (
                <Link key={c} href={href({ cat: c })} className={sp.cat === c ? "on" : ""}>{c.split(" ")[0]}</Link>
              ))}
            </div>
            <div className="seg">
              <Link href={href({ sort: "priority" })} className={sort === "priority" ? "on" : ""}>Priority</Link>
              <Link href={href({ sort: "recent" })} className={sort === "recent" ? "on" : ""}>Newest</Link>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "4px 16px" }}>
          <div className="list">
            {rows.slice(0, 60).map(({ c, b, p, overdue }) => (
              <Link key={c.complaint_id} href={`/officer/complaints/${c.complaint_id}`} className="crow">
                <span className={`score ${p.level}`} title={`${p.level} priority`}>{p.score}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photoOf(c) ? <img className="thumb hide-sm" src={photoOf(c)!} alt=""  style={{ width: 48, height: 48 }} /> : <span className="thumb hide-sm"  style={{ width: 48, height: 48 }}><Ico name="mic" size={20} /></span>}
                <div className="main">
                  <div className="row" style={{ gap: 8 }}>
                    <span className="title">{c.category_reported}</span>
                    {c.source === "app" && <span className="pill ai-tag" style={{ height: 21, fontSize: 11.5 }}>NEW</span>}
                    {overdue && <span className="pill p-High" style={{ height: 21, fontSize: 11.5 }}>Overdue</span>}
                  </div>
                  <div className="small muted ellipsis">{c.road_name || c.locality_text || "–"} · {fmtDate(c.received_at)} · {(c.upvotes || 0) + (c.supporters?.length || 0)} supporters</div>
                  <div className="small ellipsis" style={{ color: c.triage ? (c.triage.validity === "Likely valid" ? "var(--ink-2)" : "var(--amber)") : "var(--ink-2)" }}>
                    {c.triage ? <><Ico name="sparkles" size={13} /> {c.triage.validity}: {c.triage.validity_reason}</> : p.reasons[0]?.text || "No special risk signals"}
                  </div>
                </div>
                <span className={`pill ${BUCKET_STYLE[b as keyof typeof BUCKET_STYLE]} hide-sm`}>{b}</span>
                <Ico name="chevron" size={18} className="muted" />
              </Link>
            ))}
            {!rows.length && <p className="empty">Nothing here. Nice.</p>}
          </div>
        </div>
        {rows.length > 60 && <p className="small muted">Showing the top 60 of {rows.length}.</p>}
      </main>
    </>
  );
}
