import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { CopyButton } from "@/components/CopyButton";
import { SupportButton } from "@/components/SupportButton";
import { Feedback } from "@/components/Feedback";
import { getSession } from "@/lib/session";
import { getComplaint } from "@/lib/store";
import { db } from "@/lib/data";
import { jobFor, FLAG_TEXT } from "@/lib/views";
import { BUCKET_STYLE, SLA_HOURS, bucketOf, fmtDate, fmtDateTime, inr, photoOf, statusNote } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function ComplaintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; supported?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await getSession();
  const c = getComplaint(decodeURIComponent(id).toUpperCase());
  if (!c) notFound();
  const ward = c.ward_code ? db().wardMap.get(c.ward_code) : null;
  const b = bucketOf(c.status);
  const job = jobFor(c);
  const mine = s?.role === "citizen" && c.complainant_id === s.id;
  const supported = s ? (c.supporters || []).includes(s.id) : false;
  const supporters = (c.upvotes || 0) + (c.supporters?.length || 0);

  // service deadline
  const sla = SLA_HOURS[c.category_reported] ?? 72;
  const start = new Date(c.received_at.replace(" ", "T"));
  const due = new Date(start.getTime() + sla * 3600e3);
  const endAt = c.resolved_at ? new Date(c.resolved_at.replace(" ", "T")) : job?.completed_at ? new Date(job.completed_at.replace(" ", "T")) : null;
  const open = b === "Registered" || b === "In progress";
  const overdueDays = open ? Math.floor((Date.now() - due.getTime()) / 864e5) : 0;
  const metDeadline = endAt ? endAt <= due : null;

  // timeline
  type St = { t: string; d: string; state: "done" | "now" | "todo" | "bad" };
  const steps: St[] = [{ t: "Registered", d: `${fmtDateTime(c.received_at)} · via ${c.channel}`, state: "done" }];
  if (b === "Invalid") {
    steps.push({ t: "Marked invalid", d: c.decision?.note || statusNote(c.status) || "The ward office could not act on this complaint.", state: "bad" });
  } else {
    const verified = b !== "Registered";
    steps.push({
      t: "Checked by ward office",
      d: verified ? (c.decision?.note || "Confirmed as a valid complaint.") : `Waiting for Ward ${c.ward_code || ""} office to review it.`,
      state: verified ? "done" : "now",
    });
    steps.push({
      t: "Repair work",
      d: job
        ? `${job.contractor_name.replace(" (synthetic)", "")} assigned on ${fmtDate(job.assigned_at)} · ${job.repair_method}`
        : [...(c.history || [])].reverse().find((h) => h.text.startsWith("Repair awarded"))?.text || (b === "In progress" ? "Queued for repair." : "Not started yet."),
      state: b === "Closed" ? "done" : b === "In progress" ? "now" : "todo",
    });
    steps.push({
      t: b === "Closed" ? (c.status === "Resolved" ? "Fixed" : "Closed") : "Fixed",
      d: b === "Closed" ? (c.status === "Resolved" ? `Closed on ${fmtDate(c.resolved_at || job?.completed_at)}` : statusNote(c.status)) : "",
      state: b === "Closed" ? "done" : "todo",
    });
  }

  const escalation = `To the Assistant Commissioner, Ward ${c.ward_code} (${ward?.ward_name || ""}),
My complaint #${c.complaint_id} (${c.category_reported}${c.road_name ? ` on ${c.road_name}` : ""}) was registered on ${fmtDate(c.received_at)}. The service deadline for this problem is ${sla} hours, but it is still ${c.status.toLowerCase()}. Please get it inspected and repaired, and share the work order number.
– ${s?.name || "A resident"}`;

  return (
    <>
      <TopBar session={s} active={s?.role === "citizen" ? "/citizen" : "/map"} />
      <main className="wrap stack-lg">
        <div>
          <Link href={s?.role === "citizen" ? "/citizen" : "/map"} className="back"><Ico name="back" size={18} /> Back</Link>
          {sp.new && (
            <div className="banner ok" style={{ marginBottom: 18 }}>
              <Ico name="check" />
              <div><b>Complaint registered: #{c.complaint_id}</b><div className="small">Sent to the Ward {c.ward_code} office. Updates will show up on this page.</div></div>
            </div>
          )}
          {sp.supported && (
            <div className="banner ok" style={{ marginBottom: 18 }}>
              <Ico name="thumbs" />
              <div><b>Thanks, your support is added</b><div className="small">It now shows in your complaints. Complaints with more support move up the ward&apos;s list.</div></div>
            </div>
          )}
          <div className="between" style={{ alignItems: "flex-start" }}>
            <div>
              <h1>{c.category_reported}</h1>
              <p className="ink2" style={{ marginTop: 4 }}>{c.road_name || c.locality_text || "Shared location"}{ward ? ` · Ward ${c.ward_code}` : ""}</p>
              <p className="tiny muted num" style={{ marginTop: 2 }}>#{c.complaint_id} · {supporters} supporter{supporters === 1 ? "" : "s"}</p>
            </div>
            <span className={`pill ${BUCKET_STYLE[b]}`} style={{ height: 30, fontSize: 14 }}>{b}</span>
          </div>
        </div>

        <section className="card">
          <div className="steps">
            {steps.map((st, i) => (
              <div key={i} className={`step ${st.state}`}>
                <span className="dot">{st.state === "bad" ? <Ico name="x" size={15} /> : st.state === "done" ? <Ico name="check" size={15} /> : <span style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}</span>}</span>
                <div><div className="t">{st.t}</div>{st.d && <div className="d">{st.d}</div>}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Deadline / rights */}
        {b !== "Invalid" && (
          <section className={`banner ${open && overdueDays > 0 ? "bad" : metDeadline === false ? "warn" : "info"}`}>
            <Ico name="clock" />
            <div style={{ flex: 1 }}>
              {open ? (
                overdueDays > 0 ? (
                  <><b>Overdue by {overdueDays} day{overdueDays === 1 ? "" : "s"}</b><div className="small">This kind of problem should be fixed within {sla} hours (by {fmtDateTime(due.toISOString())}). You can escalate to the Assistant Commissioner.</div></>
                ) : (
                  <><b>Should be fixed by {fmtDateTime(due.toISOString())}</b><div className="small">The service deadline for {c.category_reported.toLowerCase()} is {sla} hours.</div></>
                )
              ) : metDeadline === null ? (
                <><b>Deadline: {sla} hours</b><div className="small">{statusNote(c.status) || "Closed."}</div></>
              ) : (
                <><b>{metDeadline ? "Fixed within the deadline" : "Fixed after the deadline"}</b><div className="small">Deadline was {sla} hours; it took {Math.max(1, Math.round((endAt!.getTime() - start.getTime()) / 3600e3))} hours.</div></>
              )}
            </div>
          </section>
        )}

        <section className="card stack">
          {photoOf(c) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoOf(c)!} alt="" className="photo" style={{ maxHeight: 320 }} />
          )}
          {!c.photo && c.source !== "app" && <p className="tiny muted" style={{ marginTop: 6 }}>Sample photo. {c.photo_description ? `Citizen's photo showed: ${c.photo_description}` : ""}</p>}
          <p>{c.description}</p>
          {c.landmark && <p className="small ink2"><Ico name="pin" size={14} /> {c.landmark}</p>}
          {c.ai && (
            <div className="chips">
              <span className="pill ai-tag"><Ico name="sparkles" size={13} /> AI: {c.ai.subcategory}, {c.ai.severity} severity</span>
              {c.ai.hazards?.map((h) => <span key={h} className="pill ai-tag">{h}</span>)}
            </div>
          )}
          {c.override_reason && <p className="small ink2"><b>Filed separately from #{c.similar_to}:</b> {c.override_reason}</p>}
        </section>

        {job && (
          <section>
            <div className="section-title"><h2>Who fixed it, and what it cost</h2></div>
            <div className="card stack">
              <div className="between">
                <Link href={`/contractors/${job.contractor_id}`} className="row">
                  <span className="ico-circle" style={{ background: "var(--line-2)" }}><Ico name="hardhat" /></span>
                  <div><div className="bold">{job.contractor_name.replace(" (synthetic)", "")}</div><div className="small muted">Work order {job.work_order_id} · {job.repair_method}</div></div>
                </Link>
                <Ico name="chevron" className="muted" />
              </div>
              <div className="grid3">
                <div className="stat"><b className={job.rate_ratio > 1.3 ? "red" : ""}>{inr(job.cost_inr)}</b><span>billed</span></div>
                <div className="stat"><b>{inr(job.expected_inr)}</b><span>fair price (rate card)</span></div>
                <div className="stat"><b className={job.reopened_within_30d === "Y" ? "red" : "green"}>{job.reopened_within_30d === "Y" ? "No" : "Yes"}</b><span>held 30 days</span></div>
              </div>
              {job.flagList.filter((f) => f !== "SLA_MISSED").map((f) => FLAG_TEXT[f] && (
                <div key={f} className={`banner ${FLAG_TEXT[f].money ? "bad" : "warn"} small`}>
                  <Ico name="alert" size={18} /><div><b>{FLAG_TEXT[f].title}.</b> {FLAG_TEXT[f].text}</div>
                </div>
              ))}
              {job.afterPhoto && (
                <div className="grid2">
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoOf(c) || "/samples/pothole.jpg"} alt="" className="photo" style={{ height: 130 }} />
                    <p className="tiny muted" style={{ marginTop: 4 }}>Before · citizen</p>
                  </div>
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={job.afterPhoto} alt="" className="photo" style={{ height: 130 }} />
                    <p className="tiny muted" style={{ marginTop: 4 }}>After · contractor, {fmtDate(job.completed_at)} (sample)</p>
                  </div>
                </div>
              )}
              {job.engineer_remark && <p className="small ink2">Engineer&apos;s note: “{job.engineer_remark}”</p>}
              <Link href={`/rights?wo=${job.work_order_id}#rti`} className="btn block"><Ico name="file" size={18} /> Ask for this bill (RTI)</Link>
            </div>
          </section>
        )}

        {c.history && c.history.length > 1 && (
          <section className="card tight">
            <p className="small bold" style={{ marginBottom: 8 }}>Updates</p>
            {c.history.map((h, i) => <p key={i} className="small ink2">{fmtDateTime(h.at)} · {h.text}</p>)}
          </section>
        )}

        {mine && b === "Closed" && c.status !== "Closed - Duplicate" && <Feedback id={c.complaint_id} rating={c.rating} />}

        <section className="stack">
          {!mine && open && s?.role === "citizen" && <SupportButton id={c.complaint_id} supporters={supporters} already={supported} />}
          {open && overdueDays > 0 && <CopyButton text={escalation} label="Copy escalation letter" className={`btn block ${mine ? "primary" : ""}`} />}
          {ward && <Link href={`/map?ward=${encodeURIComponent(c.ward_code!)}&c=${c.complaint_id}`} className="btn ghost block"><Ico name="map" size={18} /> See it on the map</Link>}
        </section>
      </main>
    </>
  );
}
