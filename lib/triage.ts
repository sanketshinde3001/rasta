import "server-only";
import { db, type Complaint } from "./data";
import { getComplaint, patchComplaint, allComplaints, flush } from "./store";
import { triage } from "./ai";
import { loadPhoto } from "./photos";
import { priorityOf } from "./priority";
import { bucketOf, currentSeason } from "./taxonomy";
import { haversine } from "./geo";
import { TRIAGE_REVIEW_VERSION } from "./photo-validation";

// Same problem type (exact subtype) close by and still open
export function similarOpen(lat: number, lon: number, sub: string | undefined, excludeId?: string, radius = 100) {
  return allComplaints()
    .filter((c) => c.complaint_id !== excludeId && c.lat && c.lon && (!sub || c.category_reported === sub))
    .filter((c) => ["Registered", "In progress"].includes(bucketOf(c.status)))
    .map((c) => ({ c, d: haversine(lat, lon, c.lat!, c.lon!) }))
    .filter((x) => x.d <= radius)
    .sort((a, b) => a.d - b.d);
}

const running = new Set<string>();

export async function runTriage(id: string, force = false) {
  const c = getComplaint(id);
  if (!c || (c.triage?.review_version === TRIAGE_REVIEW_VERSION && !force) || running.has(id)) return c?.triage;
  running.add(id);
  try {
    const p = priorityOf(c, currentSeason());
    const road = c.road_id ? db().roadMap.get(c.road_id) : null;
    const sims = c.lat && c.lon ? similarOpen(c.lat, c.lon, c.category_reported, c.complaint_id).slice(0, 3) : [];
    const past = road ? (db().woByRoad.get(road.road_id) || []).slice(-4) : [];
    const facts = {
      complaint_id: c.complaint_id, category: c.category_reported, description: c.description,
      photo_description: c.photo ? "(see attached photo)" : c.photo_description || "no photo",
      ai_photo_tags: c.ai ? { by: c.ai.by, is_road_issue: c.ai.is_road_issue, subcategory: c.ai.subcategory, severity: c.ai.severity, hazards: c.ai.hazards, note: c.ai.note } : null,
      locality: c.locality_text, landmark: c.landmark, ward: c.ward_code, road_name: c.road_name,
      road_type: road?.road_type || p.road_type, under_dlp: road?.under_dlp,
      priority_signals: p.reasons.map((r) => r.text), repeat_failure: p.repeat_failure,
      similar_open_nearby: sims.map((s) => ({ id: s.c.complaint_id, category: s.c.category_reported, distance_m: Math.round(s.d), status: s.c.status })),
      past_repairs_on_road: past.map((w) => ({ id: w.work_order_id, method: w.repair_method, completed: w.completed_at, failed_within_30d: w.reopened_within_30d })),
      supporters: (c.upvotes || 0) + (c.supporters?.length || 0),
    };
    const t = await triage(facts, (await loadPhoto(c.photo)) || undefined);
    patchComplaint(id, { triage: t });
    await flush();
    return t;
  } catch (e) {
    console.error("triage failed", id, e);
    return null;
  } finally {
    running.delete(id);
  }
}

export function complaintCardData(c: Complaint, d?: number) {
  return {
    complaint_id: c.complaint_id, category_reported: c.category_reported, description: c.description, source: c.source,
    status: c.status, received_at: c.received_at, road_name: c.road_name, locality_text: c.locality_text,
    photo: c.photo || null, supporters: (c.upvotes || 0) + (c.supporters?.length || 0), distance_m: d == null ? null : Math.round(d),
  };
}
