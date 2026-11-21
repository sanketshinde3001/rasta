import "server-only";
import { db } from "./data";
import { allComplaints } from "./store";
import { DLP_YEARS } from "./clawback";

const COLABA = new Set(["A", "B", "C", "D", "E", "F/S", "F/N", "G/S", "G/N"]);
const RATE: Record<string, number> = { "Mastic asphalt": 4200 };

// Everything that ever happened on one road segment, for the Sadak Kundli page.
export function roadFacts(id: string) {
  const { roadMap, woByRoad, signals } = db();
  const r = roadMap.get(id);
  if (!r) return null;
  const jobs = [...(woByRoad.get(id) || [])].sort((a, b) => (a.assigned_at > b.assigned_at ? 1 : -1));
  const complaints = allComplaints().filter((c) => c.road_id === id);
  const accidents = signals.accidents.filter((a: any) => a.road_id === id);
  const station = COLABA.has(r.ward_code) ? "Colaba" : "Santacruz";
  const rain = signals.rain_daily[station] || [];
  const tides = signals.tides.filter((t) => t[2] === "Y");
  const dlpEnd = new Date(r.last_resurfaced);
  dlpEnd.setFullYear(dlpEnd.getFullYear() + DLP_YEARS);
  const spent = jobs.reduce((s, j) => s + j.cost_inr, 0);
  const failed = jobs.filter((j) => j.reopened_within_30d === "Y").length;
  const duringDlp = jobs.filter((j) => j.under_dlp === "Y");
  const area = Math.round(r.length_m * Math.max(2, r.lanes) * 3.5);
  const resurface = area * RATE["Mastic asphalt"];
  const counts = new Map<string, number>();
  jobs.forEach((j) => counts.set(j.contractor_id, (counts.get(j.contractor_id) || 0) + 1));
  const ward = db().wardMap.get(r.ward_code);
  return {
    road: r, jobs, complaints, accidents, rain, tides, station, ward,
    dlpEnd: dlpEnd.toISOString().slice(0, 10), underDlp: r.under_dlp === "Y", spent, failed,
    duringDlpSpent: duringDlp.reduce((s, j) => s + j.cost_inr, 0), duringDlpJobs: duringDlp.length,
    resurface, area, contractors: [...counts.entries()].sort((a, b) => b[1] - a[1]),
    summary: {
      road: `${r.road_name} (part ${r.segment_no}), Ward ${r.ward_code}`, length_m: r.length_m, surface: r.surface,
      last_resurfaced: r.last_resurfaced, warranty_until: dlpEnd.toISOString().slice(0, 10), under_warranty_during_2025: r.under_dlp === "Y",
      repairs_jun_oct_2025: jobs.length, spent_inr: spent, repairs_failed_within_30_days: failed,
      paid_while_under_warranty_inr: duringDlp.reduce((s, j) => s + j.cost_inr, 0), complaints: complaints.length, accidents: accidents.length,
      full_resurface_estimate_inr: resurface,
    },
  };
}

// Roads with the most repairs: used for "worst roads" lists
export function topRoads(n = 8, ward?: string) {
  const { roads, woByRoad } = db();
  return roads
    .filter((r) => !ward || r.ward_code === ward)
    .map((r) => {
      const j = woByRoad.get(r.road_id) || [];
      return { road_id: r.road_id, name: r.road_name, seg: r.segment_no, ward: r.ward_code, repairs: j.length, spent: j.reduce((s, x) => s + x.cost_inr, 0), dlp: r.under_dlp === "Y" };
    })
    .sort((a, b) => b.spent - a.spent)
    .slice(0, n);
}
