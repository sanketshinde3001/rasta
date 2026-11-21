import "server-only";
import { allComplaints } from "./store";
import { priorityOf } from "./priority";
import { SLA_HOURS, bucketOf, currentSeason, type Season } from "./taxonomy";
import type { Complaint } from "./data";

export function wardQueue(ward: string, season: Season = currentSeason()) {
  return allComplaints()
    .filter((c) => c.ward_code === ward)
    .map((c) => {
      const b = bucketOf(c.status);
      const p = priorityOf(c, season);
      const due = new Date(c.received_at.replace(" ", "T")).getTime() + (SLA_HOURS[c.category_reported] ?? 72) * 3600e3;
      const overdue = (b === "Registered" || b === "In progress") && Date.now() > due;
      return { c, b, p, overdue };
    });
}
export type QueueItem = { c: Complaint; b: string; p: ReturnType<typeof priorityOf>; overdue: boolean };
