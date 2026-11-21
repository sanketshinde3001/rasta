import "server-only";
import { db } from "./data";
import { addTender, type Bid, type Tender } from "./store";
import { nowStamp } from "./taxonomy";
import type { BidAnalysis } from "./ai";

export function createTenderFromRow(ward: string, r: any): Tender {
  const now = nowStamp();
  const closes = new Date(Date.now() + 7 * 864e5 + 330 * 60000).toISOString().slice(0, 10);
  const t = addTender({
    ward_code: ward, title: `${r.method}: ${r.issue.toLowerCase()} on ${r.road_name}`, road_id: r.road_id, road_name: r.road_name,
    issue: r.issue, method: r.method, estimate_inr: r.est_cost_inr, complaint_ids: r.complaint_ids, risk_score: r.score,
    opened_at: now, closes_at: closes, status: "Open", awarded_bid: null, bids: [], plan_key: r.key,
    contractor_hint: r.suggested_contractor,
  } as any);
  // Demo: bids arrive from contractors who work in this ward, plus one first-time bidder
  const { contractors, workOrders } = db();
  const inWard = new Map<string, number>();
  for (const w of workOrders) if (w.ward_code === ward) inWard.set(w.contractor_id, (inWard.get(w.contractor_id) || 0) + 1);
  const picks = contractors.filter((c) => inWard.has(c.contractor_id)).sort((a, b) => (inWard.get(b.contractor_id)! - inWard.get(a.contractor_id)!)).slice(0, 3);
  const factors = [0.97, 1.08, 0.79];
  const bids: Bid[] = picks.map((c, i) => ({
    bid_id: `${t.tender_id}-B${i + 1}`, tender_id: t.tender_id, bidder: c.contractor_name.replace(" (synthetic)", ""), contractor_id: c.contractor_id,
    amount_inr: Math.round((r.est_cost_inr * factors[i]) / 100) * 100, days: [5, 4, 3][i], warranty_months: [12, 24, 6][i],
    method: r.method, experience_years: 2026 - (+c.empanelled_since || 2018), similar_jobs: +c.jobs, equipment: "Own crew and equipment",
    note: i === 2 ? "Can start tomorrow." : "", submitted_at: now,
  }));
  bids.push({
    bid_id: `${t.tender_id}-B${bids.length + 1}`, tender_id: t.tender_id, bidder: "Navi Infra Projects (new bidder)", contractor_id: null,
    amount_inr: Math.round((r.est_cost_inr * 0.92) / 100) * 100, days: 6, warranty_months: 24, method: r.method, experience_years: 4,
    similar_jobs: 38, equipment: "Tie-up with a hot mix plant in Thane, 2 rollers, infrared patcher",
    note: "Worked for Thane and Navi Mumbai municipal corporations. First bid with BMC.", submitted_at: now,
  });
  t.bids = bids;
  return t;
}

export function bidFacts(t: Tender) {
  const { contractors } = db();
  return {
    tender: { id: t.tender_id, work: t.title, ward: t.ward_code, rate_card_estimate_inr: t.estimate_inr, risk_score: t.risk_score },
    bids: t.bids.map((b) => {
      const c = b.contractor_id ? contractors.find((x) => x.contractor_id === b.contractor_id) : null;
      return {
        bid_id: b.bid_id, bidder: b.bidder, amount_inr: b.amount_inr, price_vs_estimate: +(b.amount_inr / t.estimate_inr).toFixed(2),
        days: b.days, warranty_months: b.warranty_months, experience_years: b.experience_years, similar_jobs: b.similar_jobs,
        equipment: b.equipment, note: b.note,
        track_record: c ? {
          jobs_with_bmc: +c.jobs, repairs_failing_vs_peers_same_conditions: +c.reopen_vs_peers, deadlines_met_pct: +c.sla_met_pct,
          overbilled_jobs: +c.overbilled_jobs, possible_double_bills: +c.ghost_bills, guarantee_repairs_charged_to_bmc: +c.dlp_paid_jobs,
          audit_band: c.band, summary: c.why,
        } : "new bidder: no BMC history",
      };
    }),
  };
}

export function offlineBidAnalysis(t: Tender): BidAnalysis {
  const f = bidFacts(t);
  const ranking = f.bids.map((b: any) => {
    let s = 70;
    const risks: string[] = [], strengths: string[] = [];
    if (typeof b.track_record === "object") {
      s -= (b.track_record.repairs_failing_vs_peers_same_conditions - 1) * 40;
      s += (b.track_record.deadlines_met_pct - 50) / 3;
      s -= b.track_record.overbilled_jobs + b.track_record.possible_double_bills * 2;
      if (b.track_record.repairs_failing_vs_peers_same_conditions > 1.2) risks.push("Repairs fail more than peers");
      else strengths.push("Repairs hold as well as peers");
    } else { s -= 5; risks.push("No BMC history"); }
    if (b.price_vs_estimate < 0.85) { s -= 10; risks.push("Price far below estimate"); }
    if (b.warranty_months >= 24) { s += 5; strengths.push(`${b.warranty_months}-month warranty`); }
    return { bid_id: b.bid_id, score: Math.round(Math.max(0, Math.min(100, s))), strengths, risks, verdict: risks.length ? risks[0] : "Solid bid" };
  }).sort((a: any, b: any) => b.score - a.score);
  return { ranking, recommendation: `Rule-based ranking (no AI key): ${ranking[0].bid_id} scores highest.`, caution: "Verify measurements and warranty terms before awarding.", by: "offline", at: new Date().toISOString() };
}
