import "server-only";
import { db } from "./data";
import { allComplaints } from "./store";
import { priorityOf } from "./priority";
import { bucketOf, currentSeason } from "./taxonomy";

const DEFAULT_METHOD: Record<string, { method: string; cost: number; fail: number }> = {
  Pothole: { method: "Hot mix patch", cost: 16600, fail: 0.2 },
  "Uneven or damaged road": { method: "Hot mix patch", cost: 26000, fail: 0.2 },
  Waterlogging: { method: "Dewatering pump deployed", cost: 60000, fail: 0.25 },
  "Open or broken manhole": { method: "Manhole cover replaced + grating", cost: 45000, fail: 0.1 },
  "Missing drain cover": { method: "Manhole cover replaced + grating", cost: 45000, fail: 0.1 },
  "Broken paver blocks": { method: "Paver blocks relaid", cost: 30000, fail: 0.15 },
  "Broken footpath": { method: "Paver blocks relaid", cost: 30000, fail: 0.15 },
  "Debris or material on footpath": { method: "Desilting and garbage removal", cost: 15000, fail: 0.2 },
  "Choked drain / nullah overflow": { method: "Desilting and garbage removal", cost: 35000, fail: 0.25 },
  "Road cave-in": { method: "Excavation, pipeline repair, PQC patch", cost: 180000, fail: 0.11 },
};

export type PlanRow = {
  key: string; road_id: string; road_name: string; issue: string; why: string; method: string; est_cost_inr: number;
  cost_to_bmc_inr: number; dlp_claim: string; expected_fail_rate: number; suggested_contractor: string | null;
  complaints: number; days_open: number; complaint_ids: string[]; parts: Record<string, number>; isNew: boolean;
};

export function wardPlanRows(ward: string): PlanRow[] {
  const { plan, roadMap } = db();
  const rows: PlanRow[] = plan
    .filter((p) => p.ward_code === ward)
    .map((p) => ({
      key: `${p.road_id}-${p.issue}`, road_id: p.road_id, road_name: p.road_name, issue: p.issue, why: String(p.why).replace(/ \(synthetic\)/g, ""),
      method: p.method, est_cost_inr: p.est_cost_inr, cost_to_bmc_inr: p.cost_to_bmc_inr, dlp_claim: p.dlp_claim,
      expected_fail_rate: p.expected_fail_rate, suggested_contractor: p.suggested_contractor?.replace(" (synthetic)", "") || null,
      complaints: p.complaints, days_open: p.days_open, complaint_ids: String(p.complaint_ids || "").split("|").filter(Boolean),
      parts: { severity: p.severity, safety: p.safety, access: p.access, flood: p.flood, traffic: p.traffic, demand: p.demand },
      isNew: false,
    }));
  // complaints filed in the app that the officer verified or hasn't reviewed yet
  for (const c of allComplaints().filter((c) => c.source === "app" && c.ward_code === ward && ["Registered", "In progress"].includes(bucketOf(c.status)))) {
    const pr = priorityOf(c, currentSeason());
    const m = DEFAULT_METHOD[c.category_reported] || DEFAULT_METHOD.Pothole;
    const road = c.road_id ? roadMap.get(c.road_id) : null;
    const dlp = road?.under_dlp === "Y" && /patch|paver|asphalt|PQC/i.test(m.method);
    const same = rows.find((r) => r.road_id === c.road_id && r.issue === c.category_reported);
    if (same) {
      same.complaint_ids.push(c.complaint_id);
      same.complaints += 1;
      same.isNew = true;
      continue;
    }
    rows.push({
      key: `${c.complaint_id}`, road_id: c.road_id || "", road_name: c.road_name || c.locality_text || "–", issue: c.category_reported,
      why: `${c.category_reported}; new app complaint${c.status === "Verified" ? ", verified by you" : ""}; ${pr.reasons.map((r) => r.text).slice(0, 2).join("; ")}`,
      method: m.method, est_cost_inr: m.cost, cost_to_bmc_inr: dlp ? 0 : m.cost, dlp_claim: dlp ? "Y" : "N",
      expected_fail_rate: m.fail, suggested_contractor: null, complaints: 1, days_open: 0, complaint_ids: [c.complaint_id],
      parts: pr.parts, isNew: true,
    });
  }
  return rows;
}
