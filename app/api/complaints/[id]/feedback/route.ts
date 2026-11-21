import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getComplaint, patchComplaint } from "@/lib/store";
import { nowStamp } from "@/lib/taxonomy";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "citizen") return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const c = getComplaint((await params).id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const stars = Math.max(1, Math.min(5, Number((await req.json()).stars) || 0));
  patchComplaint(c.complaint_id, { rating: stars, history: [...(c.history || [{ at: c.received_at, text: "Complaint registered" }]), { at: nowStamp(), text: `Citizen rated the repair ${stars}/5` }] });
  return NextResponse.json({ ok: true });
}
