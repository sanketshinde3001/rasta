import "server-only";
import { db } from "./data";

// Money the city can get back, per work order. Each work order counts once (largest reason wins).
export type ClawItem = {
  wo: string; ward: string; road_id: string; road_name: string; contractor_id: string; contractor: string; method: string;
  date: string | null; cost: number; expected: number; amount: number;
  reasons: ("dlp" | "dlp_review" | "over" | "ghost")[];
};
const SURFACE = /patch|asphalt|paver|PQC/i;
export const DLP_YEARS = 3;

let _items: ClawItem[] | null = null;
export function clawItems(): ClawItem[] {
  if (_items) return _items;
  const out: ClawItem[] = [];
  for (const w of db().workOrders) {
    const reasons: ClawItem["reasons"] = [];
    let amount = 0;
    if (w.under_dlp === "Y") {
      reasons.push(SURFACE.test(w.repair_method) ? "dlp" : "dlp_review");
      amount = Math.max(amount, w.cost_inr);
    }
    if (w.rate_ratio > 1.5) {
      reasons.push("over");
      amount = Math.max(amount, w.cost_inr - w.expected_inr);
    }
    if (w.flags.includes("GHOST")) {
      reasons.push("ghost");
      amount = Math.max(amount, w.cost_inr);
    }
    if (!amount) continue;
    out.push({
      wo: w.work_order_id, ward: w.ward_code, road_id: w.road_id, road_name: w.road_name, contractor_id: w.contractor_id,
      contractor: w.contractor_name.replace(" (synthetic)", ""), method: w.repair_method, date: w.completed_at,
      cost: w.cost_inr, expected: Math.round(w.expected_inr), amount: Math.round(amount), reasons,
    });
  }
  _items = out;
  return out;
}

function sums(items: ClawItem[]) {
  const by = (r: string) => items.filter((i) => i.reasons.includes(r as any));
  return {
    total: items.reduce((s, i) => s + i.amount, 0), jobs: items.length,
    dlp: { jobs: by("dlp").length + by("dlp_review").length, amount: [...by("dlp"), ...by("dlp_review")].reduce((s, i) => s + i.cost, 0) },
    over: { jobs: by("over").length, amount: by("over").reduce((s, i) => s + i.cost - i.expected, 0) },
    ghost: { jobs: by("ghost").length, amount: by("ghost").reduce((s, i) => s + i.cost, 0) },
  };
}

export function clawbackTotals(ward?: string) {
  const all = clawItems();
  return { city: sums(all), ward: ward ? sums(all.filter((i) => i.ward === ward)) : null };
}

export function clawByContractor(ward: string) {
  const items = clawItems().filter((i) => i.ward === ward);
  const map = new Map<string, ClawItem[]>();
  for (const i of items) map.set(i.contractor_id, [...(map.get(i.contractor_id) || []), i]);
  return [...map.entries()]
    .map(([id, its]) => ({ contractor_id: id, contractor: its[0].contractor, items: its.sort((a, b) => b.amount - a.amount), ...sums(its) }))
    .sort((a, b) => b.total - a.total);
}

// Roads whose 3-year warranty ends within `days` from now: inspect before liability lapses.
export function dlpExpiring(days = 90, ward?: string) {
  const now = Date.now();
  const { roads, woByRoad } = db();
  return roads
    .filter((r) => r.under_dlp === "Y" && (!ward || r.ward_code === ward))
    .map((r) => {
      const end = new Date(r.last_resurfaced);
      end.setFullYear(end.getFullYear() + DLP_YEARS);
      const jobs = woByRoad.get(r.road_id) || [];
      const counts = new Map<string, number>();
      jobs.forEach((j) => counts.set(j.contractor_name, (counts.get(j.contractor_name) || 0) + 1));
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(" (synthetic)", "") || null;
      return { road_id: r.road_id, road_name: r.road_name, segment: r.segment_no, ward: r.ward_code, end: end.toISOString().slice(0, 10), daysLeft: Math.round((end.getTime() - now) / 864e5), repairs: jobs.length, contractor: top };
    })
    .filter((r) => r.daysLeft >= 0 && r.daysLeft <= days)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
