import { NextResponse } from "next/server";
import { getComplaint } from "@/lib/store";
import { jobFor, FLAG_TEXT } from "@/lib/views";
import { bucketOf, photoOf } from "@/lib/taxonomy";
import { db } from "@/lib/data";
import { gradeOf } from "@/app/contractors/grade";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = getComplaint(decodeURIComponent((await params).id));
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const j = jobFor(c);
  const con = j ? db().contractors.find((x) => x.contractor_id === j.contractor_id) : null;
  const days = Math.floor((Date.now() - new Date(c.received_at.replace(" ", "T")).getTime()) / 864e5);
  return NextResponse.json({
    id: c.complaint_id, road_id: c.road_id, lang: c.language, sub: c.category_reported, desc: c.description, status: c.status, bucket: bucketOf(c.status),
    at: c.received_at, road: c.road_name || c.locality_text, photo: photoOf(c), real_photo: !!c.photo,
    supporters: (c.upvotes || 0) + (c.supporters?.length || 0), days_open: days,
    status_note: c.history?.length ? c.history[c.history.length - 1].text : null,
    job: j && {
      id: j.work_order_id, contractor: j.contractor_name.replace(" (synthetic)", ""), contractor_id: j.contractor_id,
      method: j.repair_method, cost: j.cost_inr, fair: j.expected_inr, held: j.reopened_within_30d !== "Y",
      done: j.completed_at, sla_met: j.sla_met === "Y", after: j.afterPhoto, rain7: j.rain_7d_after_mm,
      grade: con ? gradeOf(con) : null, band: con?.band || null,
      flags: j.flagList.filter((f) => FLAG_TEXT[f]?.money).map((f) => FLAG_TEXT[f].title),
    },
  });
}
