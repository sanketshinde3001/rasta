import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { planBrief } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const s = await getSession();
  if (s?.role !== "officer") return NextResponse.json({ error: "Officers only" }, { status: 401 });
  try {
    return NextResponse.json(await planBrief(await req.json()));
  } catch {
    return NextResponse.json({ error: "AI could not write the summary. Try again." });
  }
}
