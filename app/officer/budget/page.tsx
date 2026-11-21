import { TopBar } from "@/components/TopBar";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/data";
import { wardPlanRows } from "@/lib/budget";
import { tenders } from "@/lib/store";
import { currentSeason } from "@/lib/taxonomy";
import { BudgetPlanner } from "./BudgetPlanner";

export const dynamic = "force-dynamic";

export default async function Budget() {
  const s = await requireRole("officer");
  const w = db().wardMap.get(s.ward)!;
  const rows = wardPlanRows(s.ward);
  const allCost = rows.reduce((s, r) => s + r.cost_to_bmc_inr, 0);
  const defaultFunds = Math.max(100000, Math.round((allCost * 0.45) / 50000) * 50000);
  const tendered = Object.fromEntries(tenders().filter((t) => t.ward_code === s.ward).map((t) => [(t as any).plan_key, t.tender_id]));
  return (
    <>
      <TopBar session={s} active="/officer/budget" />
      <main className="wrap-wide stack-lg">
        <div>
          <p className="muted small">Ward {s.ward} · {w.ward_name}</p>
          <h1 style={{ marginTop: 2 }}>Smart budget</h1>
          <p className="ink2" style={{ marginTop: 6, maxWidth: 720 }}>
            Every open problem in the ward, ranked by risk to people. Each gets the repair method that lasts longest here. Roads still under guarantee go back to their contractor for free.
          </p>
        </div>
        <BudgetPlanner ward={s.ward} wardName={w.ward_name} rows={rows} defaultFunds={defaultFunds} budget={w.monsoon_repair_budget_inr_2025} spent={w.spend_inr} initialSeason={currentSeason()} tendered={tendered} />
      </main>
    </>
  );
}
