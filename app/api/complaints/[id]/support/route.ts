import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getComplaint, patchComplaint } from "@/lib/store";
import { nowStamp } from "@/lib/taxonomy";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const c = getComplaint(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const sup = new Set(c.supporters || []);
  sup.add(s.id);
  const now = nowStamp();
  patchComplaint(id, { supporters: [...sup], history: [...(c.history || []), { at: now, text: `${s.name} added their support` }] });
  return NextResponse.json({ ok: true, supporters: (c.upvotes || 0) + sup.size });
}
