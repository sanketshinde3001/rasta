import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { runTriage } from "@/lib/triage";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "officer") return NextResponse.json({ error: "Officers only" }, { status: 401 });
  const { force } = await req.json().catch(() => ({ force: false }));
  const t = await runTriage((await params).id, !!force);
  if (!t) return NextResponse.json({ error: "AI review failed. Try again." }, { status: 502 });
  return NextResponse.json(t);
}
