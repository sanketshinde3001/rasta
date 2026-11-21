import "../visual.css";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { RtiBuilder } from "@/components/RtiBuilder";
import { getSession } from "@/lib/session";
import { db } from "@/lib/data";
import { SLA_HOURS } from "@/lib/taxonomy";
import { RoadCheck } from "./RoadCheck";
import { rtiRows } from "./rtiData";

const STEPS = [
  { icon: "phone", t: "Complain", d: "App, 1916 or MyBMC" },
  { icon: "clock", t: "Wait", d: "Till the deadline" },
  { icon: "building", t: "Escalate", d: "Ward Asst. Commissioner" },
  { icon: "file", t: "File RTI", d: "₹10 · reply in 30 days" },
];
const KEEP = ["Photos of the spot", "Date and time", "Complaint number", "Hospital or repair bills"];

export default async function Rights() {
  const s = await getSession();
  const roads = db().roads.map((r) => ({ id: r.road_id, name: r.road_name, seg: r.segment_no, ward: r.ward_code, dlp: r.under_dlp, last: r.last_resurfaced }));
  const groups = [24, 48, 72].map((h) => ({
    h,
    items: Object.entries(SLA_HOURS).filter(([k, v]) => v === h && !["Road related", "Other", "Debris or material on footpath", "Uneven or damaged road"].includes(k)).map(([k]) => k),
  }));
  return (
    <>
      <TopBar session={s} active="/rights" />
      <main className="wrap stack-lg">
        <div>
          <h1>Your rights on the road</h1>
          <p className="ink2" style={{ marginTop: 6 }}>Four things to know, and a letter you can send today.</p>
        </div>

        <section className="card stack">
          <div className="row"><span className="tile-ico"><Ico name="clock" /></span><div><h2>Repairs have deadlines</h2><p className="small muted">The clock starts when you complain.</p></div></div>
          <div className="stack" style={{ gap: 10 }}>
            {groups.map((g) => (
              <div key={g.h} className="row-top" style={{ gap: 10 }}>
                <span className={`pill h${g.h}`} style={{ width: 62, justifyContent: "center", flex: "none" }}>{g.h} hrs</span>
                <div className="chips" style={{ gap: 6 }}>{g.items.map((i) => <span key={i} className="pill s-inv" style={{ fontWeight: 500 }}>{i}</span>)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card stack">
          <div className="row"><span className="tile-ico" style={{ background: "var(--green-soft)", color: "var(--green)" }}><Ico name="shield" /></span><div><h2>New roads come with a guarantee</h2><p className="small muted">If it breaks in the guarantee period, the contractor fixes it free.</p></div></div>
          <RoadCheck roads={roads} />
        </section>

        <section className="card stack">
          <div className="row"><span className="tile-ico"><Ico name="building" /></span><div><h2>Not fixed? Escalate</h2><p className="small muted">Four steps, in this order.</p></div></div>
          <div className="hstep">
            {STEPS.map((st) => (
              <div key={st.t}>
                <span className="tile-ico"><Ico name={st.icon} size={19} /></span>
                <b>{st.t}</b>
                <span>{st.d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card stack">
          <div className="row"><span className="tile-ico" style={{ background: "var(--red-soft)", color: "var(--red)" }}><Ico name="alert" /></span><div><h2>Hurt by a pothole?</h2><p className="small muted">Write to the ward office. Keep:</p></div></div>
          <div className="chips">{KEEP.map((k) => <span key={k} className="pill s-inv" style={{ fontWeight: 500 }}><Ico name="check" size={13} /> {k}</span>)}</div>
        </section>

        <section className="card stack">
          <div className="row"><span className="tile-ico"><Ico name="file" /></span><div><h2>Ask for the bill (RTI)</h2><p className="small muted">Pick a repair. We write the letter for you.</p></div></div>
          <RtiBuilder rows={rtiRows()} />
        </section>
      </main>
    </>
  );
}
