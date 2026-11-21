import "server-only";
import fs from "fs";
import path from "path";
import { distToSegment, haversine, inRing } from "./geo";
import { categoryOf } from "./taxonomy";

const DIR = path.join(process.cwd(), "data");
const read = <T,>(f: string): T => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));

export type Ward = {
  ward_code: string; ward_name: string; zone: string; centroid_lat: number; centroid_lon: number;
  population_est: number; low_lying_index: number; localities: string; monsoon_repair_budget_inr_2025: number;
  assistant_commissioner_office: string; jobs: number; spend_inr: number; failed_30d_spend_inr: number;
  sla_met_pct: number; reopen_pct: number; top_contractor: string; budget_used_pct: number;
  remaining_budget_inr: number; overbilled_inr: number; ghost_duplicate_inr: number; dlp_paid_inr: number;
  flagged_inr_dedup: number; complaints: number; complaints_open: number;
};
export type Road = {
  road_id: string; road_name: string; segment_no: number; ward_code: string; road_type: string; surface: string; lanes: number;
  length_m: number; start_lat: number; start_lon: number; end_lat: number; end_lon: number; lat: number; lon: number;
  last_resurfaced: string; under_dlp: string; bus_route: string; traffic: number; safety: number; access: number;
  flood: number; facilities: string | null; flood_hotspot: string | null; accidents: number;
};
export type WorkOrder = {
  work_order_id: string; ward_code: string; road_id: string; road_name: string; contractor_id: string;
  contractor_name: string; work_type: string; repair_method: string; linked_complaint_ids: string | null;
  assigned_at: string; completed_at: string | null; area_sqm: number; cost_inr: number; expected_inr: number;
  rate_ratio: number; under_dlp: string; sla_hours: number; sla_met: string; reopened_within_30d: string;
  rain_7d_after_mm: number; flags: string; engineer_remark: string | null;
};
export type Contractor = Record<string, any> & {
  contractor_id: string; contractor_name: string; jobs: number; spend_inr: number; sla_met_pct: number;
  reopen_pct: number; expected_reopen_pct: number; reopen_vs_peers: number; median_rate_ratio: number;
  overbilled_jobs: number; overbilled_excess_inr: number; ghost_bills: number; ghost_bills_inr: number;
  dlp_paid_jobs: number; dlp_paid_inr: number; band: string; why: string; empanelled_since: number;
  wards_worked: number;
};
export type PhotoAI = {
  is_road_issue: boolean; category: string; subcategory: string; severity: "low" | "medium" | "high";
  description: string; hazards: string[]; size_estimate: string; confidence: number; note?: string;
  by?: "claude" | "offline";
};
export type Triage = {
  validity: "Likely valid" | "Likely invalid" | "Needs more info";
  validity_reason: string; summary: string; severity_from_evidence: "low" | "medium" | "high";
  suggested_action: string; flags: string[]; by?: "claude" | "offline"; at?: string;
};
export type Complaint = {
  complaint_id: string; received_at: string; channel: string; category_reported: string; category?: string;
  description: string; language: string; locality_text: string | null; ward_code: string | null;
  lat: number | null; lon: number | null; photo_description: string | null; complainant_id: string | null;
  upvotes: number; status: string; resolved_at: string | null; road_id: string | null; road_name: string | null;
  work_order_id: string | null;
  // app-only
  source?: "seed" | "app"; photo?: string | null; landmark?: string; ai?: PhotoAI | null; triage?: Triage | null;
  decision?: { action: string; note: string; at: string; by: string } | null; supporters?: string[];
  override_reason?: string; similar_to?: string | null; location_source?: string; citizen_name?: string;
  history?: { at: string; text: string }[];
};

type Geo = { features: { properties: { ward_code: string; ward_name: string }; geometry: { type: string; coordinates: any } }[] };

let cache: null | {
  wards: Ward[]; wardMap: Map<string, Ward>; geo: Geo; roads: Road[]; roadMap: Map<string, Road>;
  workOrders: WorkOrder[]; woMap: Map<string, WorkOrder>; woByRoad: Map<string, WorkOrder[]>;
  complaints: Complaint[]; contractors: Contractor[]; plan: any[]; briefs: Record<string, any>;
  ctx: { facilities: any[]; hotspots: any[]; localities: any[]; rate_card: any[]; contractors_list: any[] };
  summary: any;
} = null;

export function db() {
  if (cache) return cache;
  const wards = read<Ward[]>("wards.json");
  const roads = read<Road[]>("roads.json");
  const workOrders = read<WorkOrder[]>("work_orders.json");
  const complaints = read<Complaint[]>("complaints.json").map((c) => ({
    ...c, source: "seed" as const, category: categoryOf(c.category_reported),
  }));
  const woByRoad = new Map<string, WorkOrder[]>();
  for (const w of workOrders) {
    if (!woByRoad.has(w.road_id)) woByRoad.set(w.road_id, []);
    woByRoad.get(w.road_id)!.push(w);
  }
  cache = {
    wards, wardMap: new Map(wards.map((w) => [w.ward_code, w])), geo: read<Geo>("wards.geojson"),
    roads, roadMap: new Map(roads.map((r) => [r.road_id, r])), workOrders,
    woMap: new Map(workOrders.map((w) => [w.work_order_id, w])), woByRoad, complaints,
    contractors: read<Contractor[]>("contractors.json"), plan: read<any[]>("plan.json"),
    briefs: read<Record<string, any>>("briefs.json"), ctx: read("context.json"), summary: read("summary.json"),
  };
  return cache;
}

export const WARD_ORDER = ["A", "B", "C", "D", "E", "F/S", "F/N", "G/S", "G/N", "H/E", "H/W", "K/E", "K/W", "P/S", "P/N", "R/S", "R/C", "R/N", "L", "M/E", "M/W", "N", "S", "T"];

export function wardAt(lat: number, lon: number): string | null {
  for (const f of db().geo.features) {
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const p of polys) if (inRing(lon, lat, p[0])) return f.properties.ward_code;
  }
  return null;
}

export function nearestRoad(lat: number, lon: number, maxM = 400): { road: Road; dist: number } | null {
  let best: { road: Road; dist: number } | null = null;
  for (const r of db().roads) {
    const d = distToSegment(lat, lon, [r.start_lat, r.start_lon], [r.end_lat, r.end_lon]);
    if (!best || d < best.dist) best = { road: r, dist: d };
  }
  return best && best.dist <= maxM ? best : null;
}

export function nearestLocality(lat: number, lon: number) {
  let best: any = null, bd = Infinity;
  for (const l of db().ctx.localities) {
    const d = haversine(lat, lon, l.lat, l.lon);
    if (d < bd) { bd = d; best = l; }
  }
  return best ? { name: best.locality as string, ward_code: best.ward_code as string, dist: bd } : null;
}

export function locate(lat: number, lon: number) {
  const ward = wardAt(lat, lon);
  const nr = nearestRoad(lat, lon);
  const loc = nearestLocality(lat, lon);
  const w = ward ? db().wardMap.get(ward) : null;
  return {
    lat, lon, ward_code: ward, ward_name: w?.ward_name ?? null, inside_bmc: !!ward,
    road_id: nr?.road.road_id ?? null, road_name: nr?.road.road_name ?? null,
    road_type: nr?.road.road_type ?? null, road_dist_m: nr ? Math.round(nr.dist) : null,
    locality: loc && loc.dist < 3000 ? loc.name : null,
  };
}

// Demo locations used by sample photos (real road midpoints in ward L, Kurla, next to open complaints)
export function demoSpot(kind: string) {
  const { complaints } = db();
  const want: Record<string, string> = {
    pothole: "Pothole", waterlogging: "Waterlogging", manhole: "Open or broken manhole",
    paver: "Broken paver blocks", cavein: "Road cave-in",
  };
  const sub = want[kind] || "Pothole";
  const hit =
    complaints.find((c) => c.ward_code === "L" && c.status === "Open" && c.category_reported === sub && c.lat) ||
    complaints.find((c) => c.ward_code === "L" && c.status === "Open" && c.lat)!;
  // 25 m away from the existing complaint so the duplicate check has something to find
  return { lat: +(hit.lat! + 0.00018).toFixed(6), lon: +(hit.lon! + 0.0001).toFixed(6) };
}
