import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTender, updateTender, flush } from "@/lib/store";
import { analyzeBids } from "@/lib/ai";
import { bidFacts, offlineBidAnalysis } from "@/lib/tenders";

export const maxDuration = 60;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "officer") return NextResponse.json({ error: "Officers only" }, { status: 401 });
  const t = getTender((await params).id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let a;
  try {
    a = await analyzeBids(bidFacts(t), () => offlineBidAnalysis(t));
  } catch {
    a = offlineBidAnalysis(t);
  }
  updateTender(t.tender_id, { analysis: a });
  await flush();
  return NextResponse.json(a);
}
