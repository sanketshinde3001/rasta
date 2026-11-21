import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getComplaint, getTender, patchComplaint, updateTender, flush } from "@/lib/store";
import { nowStamp } from "@/lib/taxonomy";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "officer") return NextResponse.json({ error: "Officers only" }, { status: 401 });
  const t = getTender((await params).id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { bid_id } = await req.json();
  const bid = t.bids.find((b) => b.bid_id === bid_id);
  if (!bid) return NextResponse.json({ error: "Bid not found" }, { status: 400 });
  const now = nowStamp();
  updateTender(t.tender_id, { status: "Awarded", awarded_bid: bid_id, awarded_at: now });
  for (const id of t.complaint_ids) {
    const c = getComplaint(id);
    if (!c) continue;
    patchComplaint(id, {
      status: "In Progress",
      history: [...(c.history || [{ at: c.received_at, text: "Complaint registered" }]), { at: now, text: `Repair awarded to ${bid.bidder} (tender ${t.tender_id}), to finish in ${bid.days} days.` }],
    });
  }
  await flush();
  return NextResponse.json({ ok: true });
}
