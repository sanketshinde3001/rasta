import type { WorkOrder } from "./data";

export const AUDIT_CATEGORIES = [
  { id: "warranty", label: "Warranty · surface work", color: "#e9743c" },
  { id: "scope", label: "Warranty · scope review", color: "#ad6632" },
  { id: "over", label: "Above rate card", color: "#ce3b3f" },
  { id: "duplicate", label: "Duplicate candidates", color: "#c74c82" },
] as const;
export type AuditCategory = typeof AUDIT_CATEGORIES[number]["id"];
export type AuditItem = {
  id: string; ward: string; road: string; roadId: string; contractor: string; method: string;
  billed: number; expected: number; amount: number; category: AuditCategory; underWarranty: boolean;
};
export type WarrantyWard = { ward: string; surface: number; review: number; jobs: number };

// Assign each work order to its largest monetary reason, so tile areas never
// double-count a bill. Equal full-bill reasons prefer surface DLP, then duplicates,
// then scope review. Scope review is exposure to inspect, not confirmed recovery.
export function auditOverview(orders: WorkOrder[]) {
  const items: AuditItem[] = [];
  const warranty = new Map<string, WarrantyWard>();
  for (const w of orders) {
    const surface = /patch|asphalt|paver|PQC/i.test(w.repair_method);
    const candidates: { category: AuditCategory; amount: number }[] = [];
    if (w.under_dlp === "Y") {
      const ward = warranty.get(w.ward_code) || { ward: w.ward_code, surface: 0, review: 0, jobs: 0 };
      ward[surface ? "surface" : "review"] += w.cost_inr;
      ward.jobs++;
      warranty.set(w.ward_code, ward);
      if (surface) candidates.push({ category: "warranty", amount: w.cost_inr });
    }
    if (w.flags.includes("GHOST")) candidates.push({ category: "duplicate", amount: w.cost_inr });
    if (w.under_dlp === "Y" && !surface) candidates.push({ category: "scope", amount: w.cost_inr });
    if (w.rate_ratio > 1.5) candidates.push({ category: "over", amount: Math.max(0, w.cost_inr - w.expected_inr) });
    const primary = candidates.sort((a, b) => b.amount - a.amount)[0];
    if (!primary || primary.amount <= 0) continue;
    items.push({
      id: w.work_order_id, ward: w.ward_code, road: w.road_name, roadId: w.road_id,
      contractor: w.contractor_name.replace(" (synthetic)", ""), method: w.repair_method,
      billed: w.cost_inr, expected: w.expected_inr, amount: primary.amount, category: primary.category, underWarranty: w.under_dlp === "Y",
    });
  }
  return {
    items,
    warranty: [...warranty.values()].sort((a, b) => (b.surface + b.review) - (a.surface + a.review)),
  };
}

export type Box = { x: number; y: number; width: number; height: number };
// Binary treemap: split by the closest half of the value, along the longer edge.
export function treemap<T extends { amount: number }>(nodes: T[], box: Box): (T & Box)[] {
  if (!nodes.length) return [];
  if (nodes.length === 1) return [{ ...nodes[0], x: box.x, y: box.y, width: box.width, height: box.height }];
  const total = nodes.reduce((sum, node) => sum + node.amount, 0);
  if (total <= 0) return [];
  let split = 1;
  let before = nodes[0].amount;
  while (split < nodes.length - 1 && Math.abs(before + nodes[split].amount - total / 2) < Math.abs(before - total / 2)) {
    before += nodes[split++].amount;
  }
  const ratio = before / total;
  const horizontal = box.width >= box.height;
  const first = horizontal ? { ...box, width: box.width * ratio } : { ...box, height: box.height * ratio };
  const second = horizontal
    ? { ...box, x: box.x + first.width, width: box.width - first.width }
    : { ...box, y: box.y + first.height, height: box.height - first.height };
  return [...treemap(nodes.slice(0, split), first), ...treemap(nodes.slice(split), second)];
}
