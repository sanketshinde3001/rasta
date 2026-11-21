import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { requireRole } from "@/lib/session";
import { getComplaint } from "@/lib/store";
import { db } from "@/lib/data";
import { priorityOf, WEIGHTS } from "@/lib/priority";
import { similarOpen } from "@/lib/triage";
import { BUCKET_STYLE, SEASONS, bucketOf, currentSeason, fmtDate, fmtDateTime, inr, photoOf } from "@/lib/taxonomy";
import { FLAG_TEXT } from "@/lib/views";
import { AiReview, Decision } from "./Client";
import { Tx } from "@/components/I18n";

export const dynamic = "force-dynamic";

const PART_LABEL: Record<string, string> = { severity: "Severity", safety: "Accident risk", access: "Hospital / school", flood: "Flood risk", traffic: "Traffic", demand: "Public demand" };

export default async function OfficerComplaint({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("officer");
  const c = getComplaint(decodeURIComponent((await params).id));
  if (!c) notFound();
  const season = currentSeason();
  const p = priorityOf(c, season);
  const b = bucketOf(c.status);
  const road = c.road_id ? db().roadMap.get(c.road_id) : null;
  const past = road ? (db().woByRoad.get(road.road_id) || []).slice().reverse().slice(0, 5) : [];
  const sims = c.lat && c.lon ? similarOpen(c.lat, c.lon, c.category_reported, c.complaint_id).slice(0, 3) : [];

  return (
    <>
      <TopBar session={s} active="/officer" />
      <main className="wrap-wide">
        <Link href="/officer" className="back"><Ico name="back" size={18} /> Complaints</Link>
        <div className="between wrap-gap" style={{ marginBottom: 20 }}>
          <div>
            <h1>{c.category_reported}</h1>
            <p className="ink2" style={{ marginTop: 4 }}>
              {c.road_name || c.locality_text || "–"}{road ? ` · ${road.road_type} road` : ""} · #{c.complaint_id} · {fmtDateTime(c.received_at)} via {c.channel}
            </p>
          </div>
          <span className={`pill ${BUCKET_STYLE[b]}`} style={{ height: 30, fontSize: 14 }}>{c.status === "Verified" ? "Verified" : b}</span>
        </div>

        <div className="officer-grid">
          <div className="stack-lg">
            <section className="card stack">
              {photoOf(c) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoOf(c)!} alt="" className="photo" style={{ maxHeight: 360 }} />
              )}
              {!c.photo && c.source !== "app" && <p className="tiny muted">Sample photo. Citizen&apos;s photo: {c.photo_description || "none"}</p>}
              <Tx text={c.description} lang={c.language} />
              <div className="chips">
                {c.landmark && <span className="pill s-inv"><Ico name="pin" size={13} /> {c.landmark}</span>}
                <span className="pill s-inv"><Ico name="users" size={13} /> {(c.upvotes || 0) + (c.supporters?.length || 0)} supporters</span>
                {c.citizen_name && <span className="pill s-inv">{c.citizen_name}</span>}
                {c.ai && <span className="pill ai-tag"><Ico name="sparkles" size={13} /> Photo: {c.ai.subcategory}, {c.ai.severity}</span>}
                {c.ai?.hazards?.map((h) => <span key={h} className="pill ai-tag">{h}</span>)}
              </div>
              {c.override_reason && <div className="banner warn small"><Ico name="info" size={18} /><div>Citizen filed this separately from #{c.similar_to}: “{c.override_reason}”</div></div>}
              <Link href={`/map?ward=${encodeURIComponent(c.ward_code || "")}&c=${c.complaint_id}`} className="linkbtn small"><Ico name="map" size={16} /> See on map</Link>
            </section>

            {sims.length > 0 && (
              <section>
                <div className="section-title"><h2>Same problem within 100 m</h2></div>
                <div className="card" style={{ padding: "4px 16px" }}>
                  <div className="list">
                    {sims.map(({ c: x, d }) => (
                      <Link key={x.complaint_id} href={`/officer/complaints/${x.complaint_id}`} className="between" style={{ padding: "11px 0" }}>
                        <div><div className="small bold">{x.category_reported} · {Math.round(d)} m away</div><div className="tiny muted">#{x.complaint_id} · {fmtDate(x.received_at)} · {x.status}</div></div>
                        <Ico name="chevron" size={16} className="muted" />
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <div className="section-title"><h2>Past repairs on this road <Link href={`/roads/${road?.road_id}`} className="linkbtn small" style={{ marginLeft: 8 }}>Road history</Link></h2><span className="small muted">{road?.under_dlp === "Y" ? "Road is under guarantee (DLP)" : ""}</span></div>
                <div className="card" style={{ padding: "4px 16px" }}>
                  <div className="list">
                    {past.map((w) => (
                      <div key={w.work_order_id} className="between" style={{ padding: "11px 0" }}>
                        <div>
                          <div className="small bold">{w.repair_method} · {w.contractor_name.replace(" (synthetic)", "")}</div>
                          <div className="tiny muted">
                            {w.work_order_id} · {fmtDate(w.completed_at)} · {w.reopened_within_30d === "Y" ? "failed within 30 days" : "held"}
                            {w.flags.split("|").filter((f) => FLAG_TEXT[f]?.money).map((f) => ` · ${FLAG_TEXT[f].title}`).join("")}
                          </div>
                        </div>
                        <span className={`num small ${w.rate_ratio > 1.3 ? "red bold" : ""}`}>{inr(w.cost_inr)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="stack-lg">
            <section className="card stack">
              <div className="row">
                <span className={`score ${p.level}`} style={{ width: 56, height: 56, fontSize: 22 }}>{p.score}</span>
                <div>
                  <h2>{p.level} priority</h2>
                  <p className="tiny muted">{SEASONS[season].label} weighting · score out of 100</p>
                </div>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {(Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => (
                  <div key={k} className="factor">
                    <span className="ink2">{PART_LABEL[k]}</span>
                    <div className="bar"><i style={{ width: `${Math.round(p.parts[k] * 100)}%`, background: p.parts[k] > 0.66 ? "var(--red)" : "var(--accent)" }} /></div>
                    <span className="num tiny muted" style={{ textAlign: "right" }}>{Math.round(WEIGHTS[k] * 100)}%</span>
                  </div>
                ))}
              </div>
              {p.reasons.length > 0 && (
                <div className="stack" style={{ gap: 6 }}>
                  {p.reasons.map((r, i) => <div key={i} className="row small" style={{ alignItems: "flex-start" }}><Ico name={r.icon} size={16} className="muted" /> <span>{r.text}</span></div>)}
                </div>
              )}
            </section>

            <AiReview id={c.complaint_id} initial={c.triage || null} />
            <Decision id={c.complaint_id} status={c.status} decision={c.decision || null} />
          </div>
        </div>
      </main>
    </>
  );
}
