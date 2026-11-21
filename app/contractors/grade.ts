// Plain-language grade for a contractor, from the audit numbers. Shared by list and detail pages.
export type Grade = { letter: "A" | "B" | "C" | "D" | "E"; score: number; tone: "good" | "mid" | "bad" };

const n = (v: unknown) => Number(v) || 0;

export function gradeOf(c: Record<string, any>): Grade {
  let s = 100;
  const rv = n(c.reopen_vs_peers);
  if (rv > 1) s -= (rv - 1) * 60;
  const sla = n(c.sla_met_pct);
  if (sla < 60) s -= (60 - sla) / 2;
  s -= Math.min(25, n(c.overbilled_jobs) * 0.5 + n(c.ghost_bills) * 2 + n(c.dlp_paid_jobs) * 0.3);
  s = Math.max(0, Math.round(s));
  const letter = s >= 85 ? "A" : s >= 72 ? "B" : s >= 58 ? "C" : s >= 45 ? "D" : "E";
  return { letter, score: s, tone: letter <= "B" ? "good" : letter === "C" ? "mid" : "bad" };
}

export function cityAverages(list: Record<string, any>[]) {
  const jobs = list.reduce((s, c) => s + n(c.jobs), 0) || 1;
  const w = (k: string) => list.reduce((s, c) => s + n(c[k]) * n(c.jobs), 0) / jobs;
  return { reopen: w("reopen_pct"), expected: w("expected_reopen_pct"), sla: w("sla_met_pct"), rate: w("median_rate_ratio") };
}

export const cleanName = (s: string) => String(s || "").replace(" (synthetic)", "");
export { n as num };
