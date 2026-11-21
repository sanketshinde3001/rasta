import "server-only";
import { db, nearestRoad, type Complaint } from "./data";
import { haversine } from "./geo";
import { SEASONS, type Season } from "./taxonomy";

// Transparent hotspot-based priority. Same weights as the Rupee Trail planner.
export const WEIGHTS = { severity: 0.25, safety: 0.2, access: 0.15, flood: 0.15, traffic: 0.15, demand: 0.1 };

const BASE_SEVERITY: Record<string, number> = {
  "Road cave-in": 1, "Open or broken manhole": 0.95, "Missing drain cover": 0.9, Waterlogging: 0.7,
  Pothole: 0.6, "Choked drain / nullah overflow": 0.6, "Uneven or damaged road": 0.45, "Broken paver blocks": 0.4,
  "Broken footpath": 0.35, "Debris or material on footpath": 0.3, "Road related": 0.4, Other: 0.3,
};
const WATER = new Set(["Waterlogging", "Choked drain / nullah overflow", "Open or broken manhole", "Missing drain cover"]);

export type Priority = {
  score: number; level: "High" | "Medium" | "Low";
  parts: Record<keyof typeof WEIGHTS, number>;
  reasons: { icon: string; text: string }[];
  road_type: string | null; repeat_failure: boolean;
};

export function priorityOf(c: Complaint, season: Season): Priority {
  const { roadMap, woByRoad, ctx, wardMap } = db();
  let road = c.road_id ? roadMap.get(c.road_id) : undefined;
  if (!road && c.lat && c.lon) road = nearestRoad(c.lat, c.lon, 300)?.road;
  const reasons: { icon: string; text: string }[] = [];

  // severity
  let sev = BASE_SEVERITY[c.category_reported] ?? 0.4;
  const aiSev = c.triage?.severity_from_evidence || c.ai?.severity;
  if (aiSev === "high") sev += 0.15;
  if (aiSev === "low") sev -= 0.15;
  const past = road ? woByRoad.get(road.road_id) || [] : [];
  const failed = past.filter((w) => w.reopened_within_30d === "Y");
  const repeat = failed.length > 0;
  if (repeat) {
    sev += 0.1;
    reasons.push({ icon: "repeat", text: `${failed.length} earlier repair${failed.length > 1 ? "s" : ""} on this road failed within 30 days` });
  }
  sev = Math.max(0, Math.min(1, sev));
  if (sev >= 0.9) reasons.unshift({ icon: "alert", text: `${c.category_reported}: danger to life if left open` });

  // safety
  const acc = road?.accidents || 0;
  const safety = Math.min(1, Math.max(road?.safety || 0, acc / 6));
  if (acc >= 2) reasons.push({ icon: "car", text: `Accident hotspot: ${acc} accidents recorded on ${road!.road_name}` });

  // access: hospital / school close by
  let access = road?.access || 0;
  if (c.lat && c.lon) {
    let best: { f: any; d: number } | null = null;
    for (const f of ctx.facilities) {
      const d = haversine(c.lat, c.lon, f.lat, f.lon);
      if (d < 400 && (!best || d < best.d)) best = { f, d };
    }
    if (best) {
      const v = best.f.type === "Hospital" ? (best.f.emergency_services === "Y" ? 1 : 0.8) : 0.6;
      access = Math.max(access, v * (best.d < 200 ? 1 : 0.8));
      reasons.push({
        icon: best.f.type === "Hospital" ? "hospital" : "school",
        text: `${Math.round(best.d)} m from ${best.f.name.replace(" (synthetic)", "")}${best.f.emergency_services === "Y" ? " (emergency)" : ""}`,
      });
    }
  }

  // flood, scaled by season
  const ward = c.ward_code ? wardMap.get(c.ward_code) : undefined;
  let flood = (ward?.low_lying_index || 0) * 0.5;
  if (c.lat && c.lon) {
    for (const h of ctx.hotspots) {
      const d = haversine(c.lat, c.lon, h.lat, h.lon);
      if (d < 600) {
        flood = Math.max(flood, 1 - d / 1200);
        reasons.push({ icon: "waves", text: `${Math.round(d)} m from flood hotspot ${h.name} (flooded ${h.years_flagged_last_5} of last 5 years)` });
        break;
      }
    }
  }
  flood = Math.min(1, flood * (WATER.has(c.category_reported) ? 1 : 0.6) * SEASONS[season].flood);
  if (season === "pre" && WATER.has(c.category_reported)) reasons.push({ icon: "cloud", text: "Pre-monsoon: drainage problems get extra weight" });

  // traffic
  const traffic = road?.traffic || 0.2;
  if (road && (road.bus_route === "Y" || traffic > 0.7)) reasons.push({ icon: "bus", text: `${road.road_type} road${road.bus_route === "Y" ? ", bus route" : ""}, heavy traffic` });

  // demand
  const supporters = (c.upvotes || 0) + (c.supporters?.length || 0);
  const demand = Math.min(1, supporters / 30);
  if (supporters >= 10) reasons.push({ icon: "users", text: `${supporters} people support this complaint` });

  const parts = { severity: sev, safety, access, flood, traffic, demand };
  const score = Math.round(
    100 * (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce((s, k) => s + WEIGHTS[k] * parts[k], 0)
  );
  const level = score >= 55 ? "High" : score >= 40 ? "Medium" : "Low";
  return { score, level, parts, reasons: reasons.slice(0, 5), road_type: road?.road_type || null, repeat_failure: repeat };
}
