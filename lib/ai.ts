import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATEGORIES, SUB_TO_CAT } from "./taxonomy";
import type { PhotoAI, Triage } from "./data";

export const MODEL = process.env.RASTA_MODEL || "claude-haiku-5-5";
export const hasKey = () => !!process.env.ANTHROPIC_API_KEY;
let _client: Anthropic | null = null;
const client = () => (_client ||= new Anthropic());

const SUBS = Object.values(CATEGORIES).flatMap((c) => c.subs) as [string, ...string[]];
const CATS = Object.keys(CATEGORIES) as [string, ...string[]];
const TAXONOMY = Object.entries(CATEGORIES).map(([c, v]) => `- ${c}: ${v.subs.join(", ")}`).join("\n");

async function ask<T extends z.ZodType>(system: string, content: Anthropic.MessageParam["content"], schema: T, maxTokens = 2000): Promise<z.infer<T>> {
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(schema) },
  });
  if (!res.parsed_output) throw new Error("no structured output");
  return res.parsed_output as z.infer<T>;
}

// ---------- 1. Photo -> form fields ----------
const PhotoSchema = z.object({
  is_road_issue: z.boolean().describe("true if the photo shows a road, drain, manhole or footpath problem"),
  category: z.enum(CATS),
  subcategory: z.enum(SUBS),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string().describe("2 short sentences in plain English, first person, as the citizen would write it"),
  hazards: z.array(z.string()).describe("up to 4 short tags like 'two-wheeler risk', 'deep water', 'near school', 'night-time hazard'"),
  size_estimate: z.string().describe("rough size, e.g. 'about 1 m wide, 10-15 cm deep'"),
  confidence: z.number().describe("0 to 1"),
  note: z.string().describe("if not a road issue, say what the photo shows instead; else empty"),
});

export async function analyzePhoto(base64: string, mediaType: string, hint = ""): Promise<PhotoAI> {
  if (!hasKey()) return offlinePhoto(hint);
  const out = await ask(
    `You tag citizen photos for a Mumbai municipal road complaint form. Pick exactly one category and subcategory from this list:\n${TAXONOMY}\nBe factual. Only describe what is visible. Severity: high = danger to life or road blocked, medium = vehicles must slow or swerve, low = cosmetic.`,
    [
      { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: base64 } },
      { type: "text", text: `Tag this complaint photo.${hint ? ` The citizen also said: "${hint}"` : ""}` },
    ],
    PhotoSchema
  );
  return { ...out, category: SUB_TO_CAT[out.subcategory] || out.category, by: "claude" };
}

// ---------- 2. Voice transcript -> form fields ----------
const VoiceSchema = z.object({
  category: z.enum(CATS),
  subcategory: z.enum(SUBS),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string().describe("clean 1-2 sentence complaint in English, first person, as the citizen would write it"),
  landmark: z.string().describe("landmark, road or area named by the speaker (e.g. 'LBS Marg, Kurla station'), or empty if none"),
  missing: z.array(z.enum(["problem type", "location", "description"])).describe("parts the speaker did not make clear"),
  language: z.string().describe("language spoken: English, Hindi, Marathi, Hinglish, ..."),
});
export type VoiceForm = z.infer<typeof VoiceSchema> & { by: "claude" | "offline" };

export async function formFromSpeech(transcript: string): Promise<VoiceForm> {
  if (!hasKey()) return { ...offlineClassify(transcript), landmark: "", language: "", missing: ["location"], by: "offline" };
  const out = await ask(
    `A Mumbai citizen described a road problem by voice (any of English, Hindi, Marathi, Hinglish). Fill the complaint form. Categories:\n${TAXONOMY}`,
    transcript,
    VoiceSchema
  );
  return { ...out, category: SUB_TO_CAT[out.subcategory] || out.category, by: "claude" };
}

// ---------- 3. Officer triage: validity + summary ----------
const TriageSchema = z.object({
  validity: z.enum(["Likely valid", "Likely invalid", "Needs more info"]),
  validity_reason: z.string().describe("one line the officer can act on"),
  summary: z.string().describe("2 short lines: what, where, how bad"),
  severity_from_evidence: z.enum(["low", "medium", "high"]),
  suggested_action: z.string().describe("one concrete next step for the ward office"),
  flags: z.array(z.string()).describe("short flags such as 'possible duplicate', 'not a BMC road', 'not a road issue', 'photo does not match text', 'repeat failure'"),
});

export async function triage(facts: object, image?: { data: string; type: string }): Promise<Triage> {
  if (!hasKey()) return offlineTriage(facts as any);
  const content: any[] = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.type, data: image.data } });
  content.push({ type: "text", text: "Complaint and context (JSON):\n" + JSON.stringify(facts, null, 1) });
  const out = await ask(
    `You help a Mumbai (BMC) ward officer screen road complaints. You SUGGEST; a human decides. Judge validity from the text, photo or photo description, and location context:
- Expressways/highways (road_type "Highway") are usually MMRDA/PWD roads, not BMC.
- Garbage, street lights, noise are not road issues.
- A complaint near an open one of the same kind may be a duplicate.
Be brief, neutral and specific. Never invent facts that are not in the input.`,
    content,
    TriageSchema
  );
  return { ...out, by: "claude", at: new Date().toISOString() };
}

// ---------- 4. Tender bid analysis ----------
const BidSchema = z.object({
  ranking: z.array(
    z.object({
      bid_id: z.string(),
      score: z.number().describe("0-100 overall value for money and reliability"),
      strengths: z.array(z.string()).describe("max 3, short"),
      risks: z.array(z.string()).describe("max 3, short"),
      verdict: z.string().describe("one line"),
    })
  ),
  recommendation: z.string().describe("2 lines: which bid and why, mentioning price vs estimate and track record"),
  caution: z.string().describe("one line on what the officer must verify before awarding"),
});
export type BidAnalysis = z.infer<typeof BidSchema> & { by: "claude" | "offline"; at: string };

export async function analyzeBids(facts: object, fallback: () => BidAnalysis): Promise<BidAnalysis> {
  if (!hasKey()) return fallback();
  const out = await ask(
    `You assist a Mumbai ward office in evaluating tender bids for a road repair. The officer awards; you only advise.
For empanelled contractors judge mainly on their track record (repairs failing vs peers in similar rain and terrain, deadlines met, over-billing, double bills, DLP repairs charged to BMC). For new bidders with no history, judge on the bid itself: price vs the rate-card estimate (very low bids are a quality risk), experience, similar jobs, equipment, warranty and timeline. Be fair: a new bidder is not bad, just unproven. Cite numbers from the input.`,
    JSON.stringify(facts, null, 1),
    BidSchema,
    4000
  );
  return { ...out, by: "claude", at: new Date().toISOString() };
}

// ---------- offline fallbacks (no API key) ----------
const KEYWORDS: [RegExp, string][] = [
  [/cave|collapse|sink|dhas|खचला|धंस/i, "Road cave-in"],
  [/manhole|gutter ka dhakkan|chamber|ढक्कन|झाकण/i, "Open or broken manhole"],
  [/cover/i, "Missing drain cover"],
  [/nala|nullah|drain|gutter|नाला|गटार/i, "Choked drain / nullah overflow"],
  [/water|paani|pani|flood|पाणी|पानी|bhar/i, "Waterlogging"],
  [/paver|block/i, "Broken paver blocks"],
  [/footpath|sidewalk|फुटपाथ/i, "Broken footpath"],
  [/pothole|khadda|gadda|खड्डा|गड्ढा/i, "Pothole"],
];
export function offlineClassify(text: string) {
  const sub = KEYWORDS.find(([r]) => r.test(text))?.[1] || "Pothole";
  return {
    category: SUB_TO_CAT[sub], subcategory: sub, severity: (/deep|danger|accident|gir|fell/i.test(text) ? "high" : "medium") as "high" | "medium",
    description: text.slice(0, 280),
  };
}
function offlinePhoto(hint: string): PhotoAI {
  const k = offlineClassify(hint || "pothole");
  return {
    is_road_issue: true, ...k, description: hint || "There is a road problem at this spot. Please inspect and repair.",
    hazards: [], size_estimate: "", confidence: 0.4, note: "AI key not set: guessed from the sample name.", by: "offline",
  };
}
function offlineTriage(f: any): Triage {
  const flags: string[] = [];
  if (f.road_type === "Highway") flags.push("not a BMC road");
  if (f.similar_open_nearby?.length) flags.push("possible duplicate");
  if (f.repeat_failure) flags.push("repeat failure");
  return {
    validity: flags.includes("not a BMC road") ? "Needs more info" : "Likely valid",
    validity_reason: flags.length ? flags.join("; ") : "Text and location match a road problem on a BMC road.",
    summary: `${f.category} at ${f.road_name || f.locality || "the reported spot"}.`,
    severity_from_evidence: "medium", suggested_action: "Send a junior engineer to inspect within the deadline.",
    flags, by: "offline", at: new Date().toISOString(),
  };
}

// ---------- 5. Budget plan brief ----------
const BriefSchema = z.object({
  headline: z.string().describe("one line: what this money fixes"),
  points: z.array(z.string()).describe("3-4 short bullets explaining the ranking with numbers and road names"),
  risk: z.string().describe("one line on what stays unfixed and why it matters"),
});
export async function planBrief(facts: object) {
  if (!hasKey()) return { headline: "AI key not set.", points: [], risk: "" };
  return ask(
    "You write a short, neutral note from a Mumbai ward officer to the ward committee explaining a repair plan. Use only the numbers given. Plain English, no jargon. 'Contractor pays' means the road is under its Defect Liability Period, so the original contractor must fix it free.",
    JSON.stringify(facts, null, 1),
    BriefSchema
  );
}
