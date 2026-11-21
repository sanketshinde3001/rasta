import "server-only";
import fs from "fs";
import path from "path";
import os from "os";
import { db, type Complaint } from "./data";
import { cloudOn, cloudReadJson, cloudWriteJson } from "./cloud";

// Runtime state on top of the read-only dataset: new complaints, status changes, supporters, tenders.
// A JSON file is enough for a prototype. On read-only hosts it falls back to the temp dir.

export type Bid = {
  bid_id: string; tender_id: string; bidder: string; contractor_id: string | null; amount_inr: number;
  days: number; warranty_months: number; method: string; experience_years: number; similar_jobs: number;
  equipment: string; note: string; submitted_at: string;
};
export type Tender = {
  tender_id: string; ward_code: string; title: string; road_id: string; road_name: string; issue: string;
  method: string; estimate_inr: number; complaint_ids: string[]; risk_score: number; opened_at: string;
  closes_at: string; status: "Open" | "Awarded"; awarded_bid?: string | null; awarded_at?: string;
  analysis?: any; bids: Bid[]; plan_key?: string; contractor_hint?: string | null;
};
export type ClawState = { excluded: string[]; reviewed_at?: string; notice?: { lang: string; text: string; at: string }; sent_at?: string; by?: string };
type State = {
  seq: number; created: Complaint[]; patches: Record<string, Partial<Complaint>>; tenders: Tender[];
  claw?: Record<string, ClawState>; inspections?: Record<string, string>; verdicts?: Record<string, string>;
};

function file() {
  const local = path.join(process.cwd(), ".data");
  try {
    fs.mkdirSync(local, { recursive: true });
    fs.accessSync(local, fs.constants.W_OK);
    return path.join(local, "store.json");
  } catch {
    const t = path.join(os.tmpdir(), "rasta");
    fs.mkdirSync(t, { recursive: true });
    return path.join(t, "store.json");
  }
}

export function photoDir() {
  const d = path.join(path.dirname(file()), "photos");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// Where the state lives: Cloudinary (shared across serverless instances) when CLOUDINARY_URL is set, else a local file.
// Every request calls hydrate() first; every change is written straight away and routes await flush() before replying.
const EMPTY = (): State => ({ seq: 0, created: [], patches: {}, tenders: [] });
let state: State | null = null;
let pending: Promise<void> = Promise.resolve();

export async function hydrate() {
  await pending;
  if (cloudOn()) {
    try {
      state = (await cloudReadJson("rasta/state.json")) || EMPTY();
    } catch (e: any) {
      if (e?.digest === "DYNAMIC_SERVER_USAGE") throw e; // let Next.js know the page is dynamic
      console.error("cloud read failed", e);
      state = state || EMPTY();
    }
    return;
  }
  try {
    state = JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
    state = EMPTY();
  }
}
function load(): State {
  if (!state) {
    try {
      state = cloudOn() ? EMPTY() : JSON.parse(fs.readFileSync(file(), "utf8"));
    } catch {
      state = EMPTY();
    }
  }
  return state!;
}
function save() {
  const snapshot = JSON.stringify(state);
  if (cloudOn()) {
    pending = pending.then(() => cloudWriteJson("rasta/state.json", snapshot)).catch((e) => console.error("cloud write failed", e));
  } else {
    fs.writeFileSync(file(), snapshot);
  }
}
export async function flush() {
  await pending;
}

export const DEMO_CITIZEN = { id: "CIT-DEMO", name: "Priya Kulkarni", phone: "98200 12345", ward: "L", area: "Kurla West" };

// Seed complaints the demo citizen "filed" earlier, chosen to show each status.
let demoIds: string[] | null = null;
export function demoCitizenSeedIds(): string[] {
  if (demoIds) return demoIds;
  const { complaints, woMap } = db();
  const inL = complaints.filter((c) => c.ward_code === "L");
  const pick = (f: (c: Complaint) => boolean) => inL.find((c) => f(c) && !ids.includes(c.complaint_id))?.complaint_id;
  const ids: string[] = [];
  const add = (x?: string) => x && ids.push(x);
  add(pick((c) => !!c.work_order_id && (woMap.get(c.work_order_id!)?.flags || "").includes("OVERBILLED")));
  add(pick((c) => !!c.work_order_id && woMap.get(c.work_order_id!)?.reopened_within_30d === "Y"));
  add(pick((c) => c.status === "In Progress"));
  add(pick((c) => c.status.startsWith("Rejected")));
  demoIds = ids;
  return ids;
}

function apply(c: Complaint): Complaint {
  const p = load().patches[c.complaint_id];
  const out = p ? { ...c, ...p } : { ...c };
  if (demoCitizenSeedIds().includes(c.complaint_id)) {
    out.complainant_id = DEMO_CITIZEN.id;
    out.citizen_name = DEMO_CITIZEN.name;
  }
  return out;
}

export function allComplaints(): Complaint[] {
  return [...load().created.map(apply), ...db().complaints.map(apply)];
}

export function getComplaint(id: string): Complaint | null {
  const s = load();
  const c = s.created.find((x) => x.complaint_id === id) || db().complaints.find((x) => x.complaint_id === id);
  return c ? apply(c) : null;
}

export function addComplaint(c: Omit<Complaint, "complaint_id">): Complaint {
  const s = load();
  s.seq += 1;
  const id = `RST26-${String(s.seq).padStart(5, "0")}`;
  const full = { ...c, complaint_id: id } as Complaint;
  s.created.unshift(full);
  save();
  return full;
}

export function patchComplaint(id: string, patch: Partial<Complaint>) {
  const s = load();
  const i = s.created.findIndex((x) => x.complaint_id === id);
  if (i >= 0) s.created[i] = { ...s.created[i], ...patch };
  else s.patches[id] = { ...(s.patches[id] || {}), ...patch };
  save();
}

export function tenders(): Tender[] {
  return load().tenders;
}
export function getTender(id: string) {
  return load().tenders.find((t) => t.tender_id === id) || null;
}
export function addTender(t: Omit<Tender, "tender_id">): Tender {
  const s = load();
  const id = `TN-${t.ward_code.replace("/", "")}-${String(s.tenders.length + 1).padStart(3, "0")}`;
  const full = { ...t, tender_id: id };
  s.tenders.unshift(full);
  save();
  return full;
}
export function updateTender(id: string, patch: Partial<Tender>) {
  const s = load();
  const i = s.tenders.findIndex((t) => t.tender_id === id);
  if (i >= 0) s.tenders[i] = { ...s.tenders[i], ...patch };
  save();
  return s.tenders[i];
}

export function clawState(key: string): ClawState {
  return load().claw?.[key] || { excluded: [] };
}
export function setClawState(key: string, patch: Partial<ClawState>) {
  const s = load();
  s.claw = s.claw || {};
  s.claw[key] = { ...(s.claw[key] || { excluded: [] }), ...patch };
  save();
  return s.claw[key];
}
export function inspections() {
  return load().inspections || {};
}
export function markInspection(roadId: string, at: string) {
  const s = load();
  s.inspections = { ...(s.inspections || {}), [roadId]: at };
  save();
}
export function getVerdict(k: string) {
  return load().verdicts?.[k] || null;
}
export function setVerdict(k: string, v: string) {
  const s = load();
  s.verdicts = { ...(s.verdicts || {}), [k]: v };
  save();
}
