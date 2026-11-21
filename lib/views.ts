import "server-only";
import { db, type Complaint } from "./data";

export function jobFor(c: Complaint) {
  const w = c.work_order_id ? db().woMap.get(c.work_order_id) : null;
  if (!w) return null;
  const road = db().roadMap.get(w.road_id);
  const flags = w.flags ? w.flags.split("|").filter(Boolean) : [];
  const n = parseInt(w.work_order_id.replace(/\D/g, ""), 10) || 0;
  return {
    ...w, flagList: flags, road,
    afterPhoto: w.completed_at ? (n % 2 ? "/samples/repaired.jpg" : "/samples/repaired2.jpg") : null,
  };
}

export const FLAG_TEXT: Record<string, { title: string; text: string; money: boolean }> = {
  OVERBILLED: { title: "Billed above the rate card", text: "The bill is more than 30% above the official rate for this job size.", money: true },
  GHOST_DUPLICATE: { title: "Possible double bill", text: "The same road and repair method was billed in the previous 7 days, with no complaint linked.", money: true },
  DLP_PAID: { title: "Should have been free", text: "This road was still under the contractor's guarantee (Defect Liability Period), yet BMC paid for the repair.", money: true },
  DLP_REVIEW: { title: "Guarantee check needed", text: "The road is under guarantee; this drain or manhole work may or may not be covered.", money: false },
  FAILED_WITHIN_30D: { title: "Repair failed within 30 days", text: "The problem came back within a month of the repair.", money: false },
  SLA_MISSED: { title: "Missed the deadline", text: "The repair finished after the deadline for this kind of problem.", money: false },
};
