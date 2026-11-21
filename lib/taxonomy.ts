// Shared (client + server) definitions: categories, statuses, service deadlines, seasons.

export const CATEGORIES: Record<string, { icon: string; subs: string[] }> = {
  "Road surface": { icon: "road", subs: ["Pothole", "Road cave-in", "Broken paver blocks", "Uneven or damaged road"] },
  "Water & drainage": { icon: "droplets", subs: ["Waterlogging", "Choked drain / nullah overflow"] },
  "Manholes & covers": { icon: "circle-alert", subs: ["Open or broken manhole", "Missing drain cover"] },
  Footpath: { icon: "footprints", subs: ["Broken footpath", "Debris or material on footpath"] },
};

// dataset category_reported -> our category
export const SUB_TO_CAT: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORIES).flatMap(([c, v]) => v.subs.map((s) => [s, c]))
);
SUB_TO_CAT["Road related"] = "Road surface";
SUB_TO_CAT["Other"] = "Road surface";

export function categoryOf(sub: string): string {
  return SUB_TO_CAT[sub] || "Road surface";
}

// Service deadlines shown to citizens (hours). Prototype values, aligned with the dataset's sla_hours.
export const SLA_HOURS: Record<string, number> = {
  "Open or broken manhole": 24,
  "Missing drain cover": 24,
  "Road cave-in": 24,
  Waterlogging: 48,
  "Choked drain / nullah overflow": 48,
  Pothole: 48,
  "Broken paver blocks": 72,
  "Uneven or damaged road": 72,
  "Broken footpath": 72,
  "Debris or material on footpath": 72,
  "Road related": 72,
  Other: 72,
};

export type Bucket = "Registered" | "In progress" | "Closed" | "Invalid";

export function bucketOf(status: string): Bucket {
  if (status === "Open" || status === "Registered") return "Registered";
  if (status === "In Progress" || status === "Verified") return "In progress";
  if (status === "Resolved" || status.startsWith("Closed") || status.startsWith("Forwarded")) return "Closed";
  return "Invalid";
}

export const BUCKET_STYLE: Record<Bucket, string> = {
  Registered: "s-reg",
  "In progress": "s-prog",
  Closed: "s-done",
  Invalid: "s-inv",
};

export function statusNote(status: string): string {
  if (status === "Closed - Duplicate") return "Merged with an earlier complaint about the same spot.";
  if (status === "Forwarded to MMRDA/PWD") return "This road belongs to MMRDA/PWD, so the complaint was sent to them.";
  if (status === "Forwarded to SWM dept") return "Sent to the Solid Waste Management department.";
  if (status === "Rejected - Not BMC road") return "Marked as not a BMC road.";
  if (status === "Rejected - Not road issue") return "Marked as not a road problem.";
  if (status === "Invalid") return "The ward office marked this complaint invalid.";
  return "";
}

export type Season = "pre" | "monsoon" | "post";
export const SEASONS: Record<Season, { label: string; hint: string; flood: number }> = {
  pre: { label: "Pre-monsoon (Mar–May)", hint: "Fix drains and flood-prone roads before the rain", flood: 1.6 },
  monsoon: { label: "Monsoon (Jun–Sep)", hint: "Safety first: open manholes, cave-ins, deep potholes", flood: 1.25 },
  post: { label: "Post-monsoon (Oct–Feb)", hint: "Durable repairs and resurfacing while it is dry", flood: 0.7 },
};

export function currentSeason(d = new Date()): Season {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return "pre";
  if (m >= 6 && m <= 9) return "monsoon";
  return "post";
}

export const inr = (n: number | null | undefined) =>
  n == null ? "–" : "₹" + Math.round(n).toLocaleString("en-IN");

export const inrShort = (n: number | null | undefined) => {
  if (n == null) return "–";
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return inr(n);
};

export const fmtDate = (s?: string | null) =>
  s ? new Date(s.replace(" ", "T")).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export const fmtDateTime = (s?: string | null) =>
  s
    ? new Date(s.replace(" ", "T")).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

// Sample photo for dataset complaints (the dataset has no real photos)
export function samplePhoto(sub: string): string {
  if (/cave/i.test(sub)) return "/samples/cavein.jpg";
  if (/manhole|cover/i.test(sub)) return "/samples/manhole.jpg";
  if (/water|drain/i.test(sub)) return "/samples/waterlogging.jpg";
  if (/paver|footpath|debris/i.test(sub)) return "/samples/paver.jpg";
  return "/samples/pothole.jpg";
}
export const photoOf = (c: { photo?: string | null; category_reported: string; source?: string }) =>
  c.photo || (c.source === "app" ? null : samplePhoto(c.category_reported));

export const SAMPLES = [
  { kind: "pothole", label: "Pothole", src: "/samples/pothole.jpg", say: "Bahut bada khadda hai road pe, bike wale gir rahe hain" },
  { kind: "waterlogging", label: "Waterlogging", src: "/samples/waterlogging.jpg", say: "Road pe ghutne tak paani bhara hai" },
  { kind: "manhole", label: "Open manhole", src: "/samples/manhole.jpg", say: "Gutter ka dhakkan toota hua hai" },
  { kind: "paver", label: "Broken paver", src: "/samples/paver.jpg", say: "Footpath ke paver blocks ukhad gaye hain" },
  { kind: "cavein", label: "Cave-in", src: "/samples/cavein.jpg", say: "Road dhas gaya hai" },
];

// "YYYY-MM-DD HH:MM" in Mumbai time, the format the dataset uses
export const nowStamp = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 16).replace("T", " ");
export const BAND: Record<string, string> = { Good: "s-done", Watch: "s-reg", Concern: "p-High" };
