import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createTenderFromRow } from "@/lib/tenders";
import { updateTender, flush } from "@/lib/store";

export async function POST(req: Request) {
  const s = await getSession();
  if (s?.role !== "officer") return NextResponse.json({ error: "Officers only" }, { status: 401 });
  const { row } = await req.json();
  const t = createTenderFromRow(s.ward, row);
  updateTender(t.tender_id, { bids: t.bids });
  await flush();
  return NextResponse.json({ id: t.tender_id });
}
