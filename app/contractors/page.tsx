import Link from "next/link";
import "../visual.css";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { getSession } from "@/lib/session";
import { db } from "@/lib/data";
import { inrShort } from "@/lib/taxonomy";
import { cleanName, gradeOf, num } from "./grade";

const TONE_COLOR = { good: "var(--green)", mid: "var(--amber)", bad: "var(--red)" };

export default async function Contractors() {
  const s = await getSession();
  const list = db()
    .contractors.map((c) => ({ c, g: gradeOf(c) }))
    .sort((a, b) => a.g.score - b.g.score);
  return (
    <>
      <TopBar session={s} active="/contractors" />
      <main className="wrap stack-lg" style={{ maxWidth: 720 }}>
        <div>
          <h1>Who repairs your roads?</h1>
          <p className="ink2" style={{ marginTop: 6 }}>A simple grade for every contractor. Fair to the monsoon: each is compared with others working in the same rain and flooding.</p>
        </div>
        <div className="chips">
          {(["A", "B", "C", "D", "E"] as const).map((l) => (
            <span key={l} className="row tiny muted" style={{ gap: 6 }}>
              <span className={`grade sm ${l <= "B" ? "good" : l === "C" ? "mid" : "bad"}`} style={{ width: 24, height: 24, fontSize: 13, borderRadius: 7 }}>{l}</span>
              {l === "A" ? "Excellent" : l === "B" ? "Good" : l === "C" ? "Average" : l === "D" ? "Poor" : "Very poor"}
            </span>
          ))}
        </div>
        <div className="stack">
          {list.map(({ c, g }) => {
            const broke = Math.round(num(c.reopen_pct) / 10);
            const ontime = Math.round(num(c.sla_met_pct) / 10);
            const money = num(c.overbilled_excess_inr) + num(c.ghost_bills_inr) + num(c.dlp_paid_inr);
            return (
              <Link key={c.contractor_id} href={`/contractors/${c.contractor_id}`} className="card card-link ctr-card">
                <span className={`grade ${g.tone}`}>{g.letter}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bold ellipsis">{cleanName(c.contractor_name)}</div>
                  <div className="small ink2">
                    <span className={broke >= 3 ? "red bold" : ""}>{broke} of 10</span> repairs break again within a month · {ontime} of 10 on time
                  </div>
                  {money > 0 && <div className="tiny muted" style={{ marginTop: 2 }}>{inrShort(money)} in bills to question</div>}
                  <div className="mini"><i style={{ width: `${g.score}%`, background: TONE_COLOR[g.tone] }} /></div>
                </div>
                <Ico name="chevron" size={18} className="muted" />
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
