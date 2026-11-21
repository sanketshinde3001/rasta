import Link from "next/link";
import { Ico } from "./Ico";
import { BUCKET_STYLE, bucketOf, fmtDate, photoOf } from "@/lib/taxonomy";
import type { Complaint } from "@/lib/data";

export function ComplaintRow({ c, href, right }: { c: Complaint; href: string; right?: React.ReactNode }) {
  const b = bucketOf(c.status);
  return (
    <Link href={href} className="crow">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photoOf(c) ? <img className="thumb" src={photoOf(c)!} alt="" /> : <span className="thumb"><Ico name="mic" size={20} /></span>}
      <div className="main">
        <div className="title ellipsis">{c.category_reported}</div>
        <div className="small muted ellipsis">
          {c.road_name || c.locality_text || "Location shared"} · {fmtDate(c.received_at)}
        </div>
        <div className="tiny muted num">#{c.complaint_id}</div>
      </div>
      {right ?? <span className={`pill ${BUCKET_STYLE[b]}`}>{b}</span>}
      <Ico name="chevron" size={18} className="muted" />
    </Link>
  );
}
