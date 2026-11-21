import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addComplaint } from "@/lib/store";
import { locate } from "@/lib/data";
import { categoryOf, nowStamp } from "@/lib/taxonomy";
import { runTriage } from "@/lib/triage";
import { detectLang } from "@/lib/lang";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.role !== "citizen") return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const b = await req.json();
  if (!b.subcategory || !b.description?.trim() || b.lat == null) {
    return NextResponse.json({ error: "Add a location, a problem type and a short description." }, { status: 400 });
  }
  const loc = locate(Number(b.lat), Number(b.lon));
  const now = nowStamp();
  const c = addComplaint({
    received_at: now, channel: "Rasta app", category_reported: b.subcategory, category: categoryOf(b.subcategory),
    description: b.description.trim(), language: detectLang(b.description), locality_text: loc.locality,
    ward_code: loc.ward_code, lat: loc.lat, lon: loc.lon, photo_description: b.ai?.description || null,
    complainant_id: s.id, citizen_name: b.anonymous ? "Anonymous" : s.name, upvotes: 0, status: "Registered", resolved_at: null,
    road_id: loc.road_id, road_name: loc.road_name, work_order_id: null, source: "app", photo: b.photo || null,
    landmark: b.landmark || "", ai: b.ai || null, triage: null, decision: null, supporters: [],
    override_reason: b.override_reason || undefined, similar_to: b.similar_to || null,
    location_source: b.location_source || "device", anonymous: !!b.anonymous, notify_email: b.notify_email || "",
    history: [{ at: now, text: "Complaint registered" + (loc.ward_code ? ` and sent to the Ward ${loc.ward_code} office` : "") }],
  });
  runTriage(c.complaint_id); // AI screening runs in the background for the ward officer
  return NextResponse.json({ id: c.complaint_id });
}
