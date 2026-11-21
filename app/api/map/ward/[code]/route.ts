import { NextResponse } from "next/server";
import { allComplaints , hydrate } from "@/lib/store";
import { bucketOf } from "@/lib/taxonomy";

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  await hydrate();
  const code = decodeURIComponent((await params).code);
  const pts = allComplaints()
    .filter((c) => c.ward_code === code && c.lat && c.lon)
    .map((c) => ({
      id: c.complaint_id, lat: c.lat, lon: c.lon, b: bucketOf(c.status), sub: c.category_reported,
      at: c.received_at, road: c.road_name || c.locality_text, wo: !!c.work_order_id, app: c.source === "app",
    }));
  return NextResponse.json({ points: pts });
}
