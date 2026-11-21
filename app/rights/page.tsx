import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { CopyButton } from "@/components/CopyButton";
import { getSession } from "@/lib/session";
import { db } from "@/lib/data";
import { SLA_HOURS } from "@/lib/taxonomy";
import { RoadCheck } from "./RoadCheck";

const RTI = `To the Public Information Officer, Ward ___ office, BMC
Under the Right to Information Act, 2005, please provide for road ___ (between ___ and ___):
1. All work orders issued between ___ and ___, with contractor name and amount.
2. Measurement book entries and bills paid for each work order.
3. Whether the road is under a Defect Liability Period, and until when.
4. Repairs done under that guarantee at the contractor's own cost.
I have paid the fee of Rs 10.
Name, address, date`;

const LADDER = [
  { icon: "phone", t: "Complain", d: "On this app, the 1916 helpline or the MyBMC app. Keep your complaint number." },
  { icon: "clock", t: "Wait for the deadline", d: "Each problem has a service deadline (below). The clock starts when you complain." },
  { icon: "building", t: "Escalate to the Assistant Commissioner", d: "If it isn't fixed in time, write to your ward's Assistant Commissioner. The app drafts this letter for you." },
  { icon: "users", t: "Ask your corporator", d: "Corporators sit on the ward committee that approves repair spending." },
  { icon: "file", t: "File an RTI", d: "Ask for the work order, bill and guarantee status. It costs ₹10 and must be answered within 30 days." },
];

export default async function Rights() {
  const s = await getSession();
  const roads = db().roads.map((r) => ({ id: r.road_id, name: r.road_name, seg: r.segment_no, ward: r.ward_code, dlp: r.under_dlp, last: r.last_resurfaced }));
  const slaRows = Object.entries(SLA_HOURS).filter(([k]) => !["Road related", "Other"].includes(k)).sort((a, b) => a[1] - b[1]);
  return (
    <>
      <TopBar session={s} active="/rights" />
      <main className="wrap stack-lg">
        <div>
          <h1>Your rights on the road</h1>
          <p className="ink2" style={{ marginTop: 6 }}>Four things every Mumbaikar should know. Short, and in plain words.</p>
        </div>

        <section className="card stack">
          <div className="row"><span className="tile-ico"><Ico name="clock" /></span><h2>1 · Repairs have deadlines</h2></div>
          <p className="small ink2">Once you complain, the ward must fix the problem within these hours (prototype values from BMC data).</p>
          <table className="tbl">
            <tbody>
              {slaRows.map(([k, h]) => (
                <tr key={k}><td>{k}</td><td className="num bold" style={{ textAlign: "right" }}>{h} hours</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card stack">
          <div className="row"><span className="tile-ico"><Ico name="shield" /></span><h2>2 · New roads come with a guarantee</h2></div>
          <p className="small ink2">
            When a road is built or resurfaced, the contractor must fix any defect at their own cost for a few years. This is the <b>Defect Liability Period</b>. If your road is under it, BMC shouldn&apos;t pay for the repair, and you can ask for the original contractor to be called back.
          </p>
          <RoadCheck roads={roads} />
        </section>

        <section className="card stack">
          <div className="row"><span className="tile-ico"><Ico name="building" /></span><h2>3 · If nothing happens, escalate</h2></div>
          <div className="steps">
            {LADDER.map((l, i) => (
              <div key={i} className="step done">
                <span className="dot" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><Ico name={l.icon} size={15} /></span>
                <div><div className="t">{l.t}</div><div className="d">{l.d}</div></div>
              </div>
            ))}
          </div>
          <CopyButton text={RTI} label="Copy an RTI request for road repairs" />
        </section>

        <section className="card stack">
          <div className="row"><span className="tile-ico" style={{ background: "var(--red-soft)", color: "var(--red)" }}><Ico name="alert" /></span><h2>4 · Hurt because of a pothole?</h2></div>
          <p className="small ink2">
            Safe roads are part of a city&apos;s basic duty, and courts have asked civic bodies to answer for pothole injuries. Keep evidence: photos of the spot, the date and time, your complaint number, and hospital or repair bills. Then write to the ward office and keep a copy.
          </p>
        </section>
      </main>
    </>
  );
}
