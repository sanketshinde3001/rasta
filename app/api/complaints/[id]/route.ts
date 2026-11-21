import { NextResponse } from "next/server";
import { getComplaint } from "@/lib/store";
import { jobFor, FLAG_TEXT } from "@/lib/views";
import { bucketOf, photoOf } from "@/lib/taxonomy";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = getComplaint(decodeURIComponent((await params).id));
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const j = jobFor(c);
  return NextResponse.json({
    id: c.complaint_id, sub: c.category_reported, desc: c.description, status: c.status, bucket: bucketOf(c.status),
    at: c.received_at, road: c.road_name || c.locality_text, photo: photoOf(c), real_photo: !!c.photo,
    supporters: (c.upvotes || 0) + (c.supporters?.length || 0),
    job: j && {
      id: j.work_order_id, contractor: j.contractor_name.replace(" (synthetic)", ""), contractor_id: j.contractor_id,
      method: j.repair_method, cost: j.cost_inr, fair: j.expected_inr, held: j.reopened_within_30d !== "Y",
      done: j.completed_at, sla_met: j.sla_met === "Y", after: j.afterPhoto,
      flags: j.flagList.filter((f) => FLAG_TEXT[f]?.money).map((f) => FLAG_TEXT[f].title),
    },
  });
}
