import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getComplaint, patchComplaint, flush } from "@/lib/store";
import { nowStamp } from "@/lib/taxonomy";

const ACTIONS: Record<string, { status: string; text: string }> = {
  verify: { status: "Verified", text: "Checked and confirmed by the ward office. Added to the repair plan." },
  invalid: { status: "Invalid", text: "Marked invalid by the ward office." },
  resolve: { status: "Resolved", text: "Marked fixed by the ward office." },
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "officer") return NextResponse.json({ error: "Officers only" }, { status: 401 });
  const id = (await params).id;
  const c = getComplaint(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { action, note } = await req.json();
  const a = ACTIONS[action];
  if (!a) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  if (action === "invalid" && !note?.trim()) return NextResponse.json({ error: "Give a reason the citizen will see." }, { status: 400 });
  const now = nowStamp();
  const text = note?.trim() ? `${a.text} Note: ${note.trim()}` : a.text;
  patchComplaint(id, {
    status: a.status,
    resolved_at: action === "resolve" ? now : c.resolved_at,
    decision: { action, note: note?.trim() || a.text, at: now, by: `${s.name}, ${s.title}` },
    history: [...(c.history || [{ at: c.received_at, text: "Complaint registered" }]), { at: now, text }],
  });
  await flush();
  return NextResponse.json({ ok: true });
}
