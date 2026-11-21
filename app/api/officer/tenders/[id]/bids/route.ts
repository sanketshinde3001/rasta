import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTender, updateTender, flush } from "@/lib/store";
import { nowStamp } from "@/lib/taxonomy";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "officer") return NextResponse.json({ error: "Officers only" }, { status: 401 });
  const t = getTender((await params).id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json();
  if (!b.bidder?.trim() || !(+b.amount_inr > 0)) return NextResponse.json({ error: "Bidder name and amount are needed." }, { status: 400 });
  const bid = {
    bid_id: `${t.tender_id}-B${t.bids.length + 1}`, tender_id: t.tender_id, bidder: b.bidder.trim(), contractor_id: null,
    amount_inr: +b.amount_inr, days: +b.days || 7, warranty_months: +b.warranty_months || 12, method: t.method,
    experience_years: +b.experience_years || 0, similar_jobs: +b.similar_jobs || 0, equipment: b.equipment || "", note: b.note || "",
    submitted_at: nowStamp(),
  };
  updateTender(t.tender_id, { bids: [...t.bids, bid], analysis: null });
  await flush();
  return NextResponse.json({ ok: true });
}
