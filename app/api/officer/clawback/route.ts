import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getLang } from "@/lib/serverLang";
import { clawByContractor } from "@/lib/clawback";
import { clawState, markInspection, setClawState } from "@/lib/store";
import { recoveryNotice } from "@/lib/ai";
import { inr, nowStamp } from "@/lib/taxonomy";

export const maxDuration = 60;
const WHY: Record<string, string> = {
  dlp: "Surface repair on a road under its Defect Liability Period: should be done free by the contractor",
  dlp_review: "Drain/manhole work on a road under its Defect Liability Period: check if the contract covers it",
  over: "Billed more than 1.5x the rate-card cost: excess to be recovered",
  ghost: "Same road and method billed again within 7 days with no complaint linked: possible double bill",
};

export async function POST(req: Request) {
  const s = await getSession();
  if (s?.role !== "officer") return NextResponse.json({ error: "Officers only" }, { status: 401 });
  const b = await req.json();
  const key = `${s.ward}|${b.contractor_id}`;
  const now = nowStamp();
  if (b.action === "inspect") {
    markInspection(b.road_id, now);
    return NextResponse.json({ ok: true, at: now });
  }
  const group = clawByContractor(s.ward).find((g) => g.contractor_id === b.contractor_id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const st = clawState(key);
  if (b.action === "toggle") {
    const ex = new Set(st.excluded);
    b.include ? ex.delete(b.wo) : ex.add(b.wo);
    return NextResponse.json(setClawState(key, { excluded: [...ex], notice: undefined, reviewed_at: undefined }));
  }
  if (b.action === "review") return NextResponse.json(setClawState(key, { reviewed_at: now, by: s.name }));
  if (b.action === "sent") return NextResponse.json(setClawState(key, { sent_at: now }));
  if (b.action === "notice") {
    if (!st.reviewed_at) return NextResponse.json({ error: "Review the items first." }, { status: 400 });
    const items = group.items.filter((i) => !st.excluded.includes(i.wo));
    const lang = await getLang();
    const facts = {
      ward: s.ward, contractor: group.contractor, contractor_id: group.contractor_id, date: now.slice(0, 10),
      total_inr: inr(items.reduce((a, i) => a + i.amount, 0)),
      work_orders: items.slice(0, 25).map((i) => ({ id: i.wo, road: i.road_name, completed: i.date?.slice(0, 10), amount: inr(i.amount), billed: inr(i.cost), rate_card: inr(i.expected), reason: i.reasons.map((r) => WHY[r]).join("; ") })),
      more_work_orders_not_listed: Math.max(0, items.length - 25),
    };
    try {
      const text = await recoveryNotice(facts, lang);
      return NextResponse.json(setClawState(key, { notice: { lang, text, at: now } }));
    } catch {
      return NextResponse.json({ error: "Could not draft the notice. Try again." }, { status: 502 });
    }
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
