import "server-only";
import { db } from "@/lib/data";

export type RtiRow = {
  id: string; road: string; ward: string; contractor: string; method: string; cost: number; expected: number;
  completed: string | null; flags: string[]; dlp: boolean;
};

export function rtiRows(filter?: (w: ReturnType<typeof db>["workOrders"][number]) => boolean): RtiRow[] {
  return db()
    .workOrders.filter((w) => (filter ? filter(w) : true))
    .map((w) => ({
      id: w.work_order_id, road: w.road_name, ward: w.ward_code, contractor: w.contractor_name.replace(" (synthetic)", ""),
      method: w.repair_method, cost: Math.round(w.cost_inr), expected: Math.round(w.expected_inr), completed: w.completed_at,
      flags: w.flags ? w.flags.split("|").filter(Boolean) : [], dlp: w.under_dlp === "Y",
    }));
}
