import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { getSession } from "@/lib/session";
import { getT } from "@/lib/serverLang";
import { roadFacts } from "@/lib/kundli";
import { db } from "@/lib/data";
import { gradeOf } from "@/app/contractors/grade";
import { fmtDate, inr, inrShort } from "@/lib/taxonomy";
import { Verdict } from "./Verdict";

export const dynamic = "force-dynamic";

const START = new Date("2025-06-01").getTime();
const END = new Date("2025-10-31").getTime();

export default async function Kundli({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  await getT();
  const f = roadFacts(id);
  if (!f) notFound();
  const { road: r } = f;
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") || "http"}://${h.get("host")}/roads/${id}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#17201d", light: "#ffffff" } });

  // timeline geometry
  const W = 900, H = 230, L = 70, R = 12;
  const x = (d: string) => L + ((new Date(d.replace(" ", "T")).getTime() - START) / (END - START)) * (W - L - R);
  const inRange = (d?: string | null) => !!d && new Date(d.replace(" ", "T")).getTime() >= START && new Date(d.replace(" ", "T")).getTime() <= END;
  const maxRain = Math.max(...f.rain.map((d) => d[1]), 1);
  const months = ["2025-06-01", "2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01"];
  const rows = { repair: 40, complaint: 82, accident: 116, rain: 205 };
  const pct = Math.min(100, (100 * f.spent) / f.resurface);
  const conMap = new Map(db().contractors.map((c) => [c.contractor_id, c]));

  return (
    <>
      <TopBar session={s} active="/map" wide />
      <main className="wrap-wide stack-lg" style={{ maxWidth: 1000 }}>
        <div>
          <Link href={`/map?ward=${encodeURIComponent(r.ward_code)}`} className="back"><Ico name="back" size={18} /> Ward {r.ward_code} map</Link>
          <p className="tiny muted" style={{ letterSpacing: ".06em", textTransform: "uppercase" }}>Sadak Kundli · road life chart</p>
          <div className="between wrap-gap" style={{ alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: 28 }}>{r.road_name} <span className="muted" style={{ fontWeight: 500 }}>· part {r.segment_no}</span></h1>
              <p className="ink2" style={{ marginTop: 4 }}>Ward {r.ward_code}, {f.ward?.ward_name} · {r.road_type} road · {r.surface} · {r.length_m} m · {r.lanes} lanes{r.bus_route === "Y" ? " · bus route" : ""}</p>
            </div>
            <div className="qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code for this page" width={96} height={96} />
              <span className="tiny muted">Scan for this road&apos;s history</span>
            </div>
          </div>
        </div>

        <Verdict id={id} />

        <div className="kpis">
          <div className="kpi"><Ico name="repeat" size={20} /><b>{f.jobs.length}</b><span>repairs, Jun–Oct 2025</span></div>
          <div className="kpi"><Ico name="rupee" size={20} /><b>{inrShort(f.spent)}</b><span>spent on {r.length_m} m</span></div>
          <div className="kpi" style={{ color: f.failed ? "var(--red)" : undefined }}><Ico name="alert" size={20} /><b>{f.failed}</b><span>failed within a month</span></div>
          <div className="kpi"><Ico name="car" size={20} /><b>{f.accidents.length}</b><span>accidents · {f.complaints.length} complaints</span></div>
        </div>

        <div className="grid2" style={{ gap: 14 }}>
          <div className={`card stack ${f.underDlp ? "warranty-on" : ""}`}>
            <div className="row"><span className="tile-ico" style={f.underDlp ? { background: "var(--green-soft)", color: "var(--green)" } : undefined}><Ico name="shield" /></span>
              <div><b>{f.underDlp ? "Under warranty" : "No warranty"}</b><div className="small muted">Resurfaced {fmtDate(r.last_resurfaced)} · 3-year guarantee {f.underDlp ? "until" : "ended"} {fmtDate(f.dlpEnd)}</div></div>
            </div>
            {f.underDlp && f.duringDlpJobs > 0 && (
              <div className="banner bad small"><Ico name="alert" size={18} /><div><b>BMC paid {inrShort(f.duringDlpSpent)} for {f.duringDlpJobs} repairs</b> while this road was under warranty. The original contractor should have fixed these free.</div></div>
            )}
            <div className="small ink2"><Ico name="building" size={14} /> Ward office: {f.ward?.assistant_commissioner_office?.replace(" (synthetic)", "")} · Assistant Engineer (Roads), Ward {r.ward_code}</div>
          </div>
          <div className="card stack">
            <div className="row"><span className="tile-ico"><Ico name="road" /></span><div><b>Patch or pave?</b><div className="small muted">Patching spend vs resurfacing the whole stretch</div></div></div>
            <div className="money-bar" style={{ height: 14 }}><i className="spend" style={{ width: `${pct}%`, background: pct > 60 ? "var(--red)" : "var(--accent)" }} /></div>
            <div className="between small"><span>Patches: <b className="num">{inrShort(f.spent)}</b></span><span className="muted">Full resurface (mastic, {f.area.toLocaleString("en-IN")} sqm): <b className="num">{inrShort(f.resurface)}</b></span></div>
            <p className="small ink2">{pct >= 60 ? "Patching has cost most of a full resurface. Stop patching; resurface." : `Patching has used ${Math.round(pct)}% of a resurface's cost in one season. ${f.failed > 3 ? "With this many failures, plan a resurface before next monsoon." : "Keep patching, but watch failures."}`}</p>
          </div>
        </div>

        {/* timeline */}
        <section className="card">
          <div className="between wrap-gap" style={{ marginBottom: 6 }}>
            <h2>Monsoon 2025, day by day</h2>
            <div className="legend tiny">
              <span><i style={{ background: "var(--green)" }} /> Repair held</span>
              <span><i style={{ background: "var(--red)" }} /> Repair failed</span>
              <span><i style={{ background: "#fff", boxShadow: "inset 0 0 0 2px var(--red)" }} /> Bill to check</span>
              <span><i style={{ background: "#8b928f" }} /> Complaint</span>
              <span><i style={{ background: "var(--amber)" }} /> Accident</span>
              <span><i style={{ background: "#9db7c9" }} /> Rain ({f.station})</span>
              <span><i style={{ background: "var(--accent)" }} /> Big tide</span>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 640, display: "block" }} role="img" aria-label="Timeline of repairs, complaints, accidents and rain">
              {months.map((m) => (
                <g key={m}>
                  <line x1={x(m)} x2={x(m)} y1={18} y2={H - 6} stroke="var(--line)" />
                  <text x={x(m) + 4} y={14} fontSize="11" fill="var(--muted)">{new Date(m).toLocaleDateString("en-IN", { month: "short" })}</text>
                </g>
              ))}
              {[["Repairs", rows.repair], ["Complaints", rows.complaint], ["Accidents", rows.accident], ["Rain", rows.rain - 20]].map(([t, y]) => (
                <text key={t as string} x={0} y={(y as number) + 4} fontSize="11.5" fill="var(--ink-2)">{t}</text>
              ))}
              {f.rain.filter((d) => inRange(d[0])).map((d) => {
                const h = (d[1] / maxRain) * 60;
                return <rect key={d[0]} x={x(d[0]) - 1.6} y={rows.rain - h} width={3.2} height={h} fill="#9db7c9" rx={1}><title>{`${d[0]}: ${d[1]} mm`}</title></rect>;
              })}
              {f.tides.filter((t) => inRange(t[0])).map((t) => <circle key={t[0]} cx={x(t[0])} cy={rows.rain + 10} r={2.6} fill="var(--accent)"><title>{`Big tide ${t[0]}: ${t[1]} m`}</title></circle>)}
              {f.complaints.filter((c) => inRange(c.received_at)).map((c) => <rect key={c.complaint_id} x={x(c.received_at) - 1} y={rows.complaint - 8} width={2} height={16} fill="#8b928f"><title>{`${c.complaint_id}: ${c.category_reported}`}</title></rect>)}
              {f.accidents.filter((a: any) => inRange(a.occurred_at)).map((a: any) => (
                <path key={a.accident_id} d={`M${x(a.occurred_at)},${rows.accident - 7} l6,11 h-12 z`} fill="var(--amber)"><title>{`${a.occurred_at}: ${a.vehicle_type}, ${a.severity}`}</title></path>
              ))}
              {f.jobs.filter((j) => inRange(j.completed_at || j.assigned_at)).map((j, i) => {
                const money = /OVERBILLED|GHOST|DLP_PAID/.test(j.flags);
                const cx = x(j.completed_at || j.assigned_at);
                const cy = rows.repair + ((i % 3) - 1) * 7;
                return (
                  <circle key={j.work_order_id} cx={cx} cy={cy} r={5.5} fill={j.reopened_within_30d === "Y" ? "var(--red)" : "var(--green)"} stroke={money ? "#fff" : "none"} strokeWidth={money ? 1.5 : 0}>
                    <title>{`${j.work_order_id} · ${j.repair_method} · ${inr(j.cost_inr)} · ${j.contractor_name.replace(" (synthetic)", "")}${j.reopened_within_30d === "Y" ? " · failed within 30 days" : ""}${money ? " · bill to check" : ""}`}</title>
                  </circle>
                );
              })}
              {f.jobs.filter((j) => inRange(j.completed_at || j.assigned_at) && /OVERBILLED|GHOST|DLP_PAID/.test(j.flags)).map((j, i) => (
                <circle key={j.work_order_id + "r"} cx={x(j.completed_at || j.assigned_at)} cy={rows.repair + ((f.jobs.indexOf(j) % 3) - 1) * 7} r={8} fill="none" stroke="var(--red)" strokeWidth={1.6} />
              ))}
            </svg>
          </div>
          <p className="tiny muted" style={{ marginTop: 6 }}>Hover any mark for details. Rain from the {f.station} station.</p>
        </section>

        <section className="grid2" style={{ gap: 14, alignItems: "start" }}>
          <div className="card stack">
            <h2>Who worked on it</h2>
            {f.contractors.map(([cid, n]) => {
              const c = conMap.get(cid);
              const g = c ? gradeOf(c) : null;
              return (
                <Link key={cid} href={`/contractors/${cid}`} className="row card-link" style={{ padding: "6px 0" }}>
                  {g && <span className={`grade sm ${g.tone}`}>{g.letter}</span>}
                  <span style={{ flex: 1 }}><b className="small">{c?.contractor_name.replace(" (synthetic)", "")}</b><span className="tiny muted" style={{ display: "block" }}>{n} repairs here</span></span>
                  <Ico name="chevron" size={16} className="muted" />
                </Link>
              );
            })}
          </div>
          <div className="card stack">
            <h2>Every repair</h2>
            <div className="list" style={{ maxHeight: 340, overflow: "auto" }}>
              {[...f.jobs].reverse().map((j) => (
                <div key={j.work_order_id} className="between" style={{ padding: "9px 0" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="small"><b>{j.work_order_id}</b> · {j.repair_method}</div>
                    <div className="tiny muted">{fmtDate(j.completed_at)} · {j.reopened_within_30d === "Y" ? "failed" : "held"}{/OVERBILLED/.test(j.flags) ? " · above rate card" : ""}{/GHOST/.test(j.flags) ? " · possible double bill" : ""}{j.under_dlp === "Y" ? " · under warranty" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className={`num small ${j.rate_ratio > 1.3 ? "red bold" : ""}`}>{inr(j.cost_inr)}</div>
                    <Link href={`/rights?wo=${j.work_order_id}#rti`} className="linkbtn tiny">RTI</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
