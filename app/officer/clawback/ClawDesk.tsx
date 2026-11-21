"use client";
import { useState } from "react";
import Link from "next/link";
import { Ico } from "@/components/Ico";
import { useT } from "@/components/I18n";
import { fmtDate, inr, inrShort } from "@/lib/taxonomy";

const REASON: Record<string, { label: string; cls: string }> = {
  dlp: { label: "Under warranty", cls: "s-done" },
  dlp_review: { label: "Warranty: check scope", cls: "s-reg" },
  over: { label: "Above rate card", cls: "p-High" },
  ghost: { label: "Possible double bill", cls: "p-High" },
};

export function ExpiringList({ rows, cityWide, done, title }: { rows: any[]; cityWide: boolean; done: Record<string, string>; title: string }) {
  const [marked, setMarked] = useState<Record<string, string>>(done);
  if (!rows.length) return null;
  return (
    <section className="card stack">
      <div className="row"><span className="tile-ico" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}><Ico name="clock" /></span>
        <div><h2>{title}</h2><p className="small muted">{cityWide ? "None in your ward. Across the city:" : "Inspect in the last 3 months, before the contractor's liability ends (as in the UK's Street Manager)."}</p></div>
      </div>
      <div className="list">
        {rows.map((r) => (
          <div key={r.road_id} className="between" style={{ padding: "10px 0" }}>
            <div style={{ minWidth: 0 }}>
              <Link href={`/roads/${r.road_id}`} className="small bold">{r.road_name} · part {r.segment}</Link>
              <div className="tiny muted">Ward {r.ward} · warranty ends {fmtDate(r.end)} ({r.daysLeft} days) · {r.repairs} repairs{r.contractor ? ` · mostly ${r.contractor}` : ""}</div>
            </div>
            {marked[r.road_id] ? (
              <span className="pill s-done mini"><Ico name="check" size={12} /> Inspection booked</span>
            ) : (
              <button className="btn sm" onClick={async () => {
                const j = await fetch("/api/officer/clawback", { method: "POST", body: JSON.stringify({ action: "inspect", road_id: r.road_id }) }).then((x) => x.json());
                setMarked({ ...marked, [r.road_id]: j.at });
              }}>Book inspection</button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ClawDesk({ groups, lang }: { groups: any[]; lang: string }) {
  const t = useT();
  const [state, setState] = useState<Record<string, any>>(Object.fromEntries(groups.map((g) => [g.contractor_id, g.state])));
  const [open, setOpen] = useState<string | null>(groups[0]?.contractor_id || null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function act(contractor_id: string, body: object) {
    setBusy(contractor_id);
    setErr("");
    const r = await fetch("/api/officer/clawback", { method: "POST", body: JSON.stringify({ contractor_id, ...body }) });
    const j = await r.json();
    setBusy(null);
    if (!r.ok) return setErr(j.error);
    setState((s) => ({ ...s, [contractor_id]: j }));
  }

  return (
    <section className="stack">
      <div className="section-title"><h2>By contractor</h2><span className="small muted">{groups.length} contractors</span></div>
      {err && <div className="banner bad small">{err}</div>}
      {groups.map((g) => {
        const st = state[g.contractor_id] || { excluded: [] };
        const included = g.items.filter((i: any) => !st.excluded.includes(i.wo));
        const amount = included.reduce((a: number, i: any) => a + i.amount, 0);
        const status = st.sent_at ? "sent" : st.notice ? "drafted" : st.reviewed_at ? "reviewed" : "review";
        const isOpen = open === g.contractor_id;
        return (
          <div key={g.contractor_id} className="card stack">
            <button className="between" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left", width: "100%" }} onClick={() => setOpen(isOpen ? null : g.contractor_id)}>
              <div className="row">
                {g.grade && <span className={`grade sm ${g.grade.tone}`}>{g.grade.letter}</span>}
                <div>
                  <b>{g.contractor}</b>
                  <div className="tiny muted">{included.length} of {g.items.length} work orders · warranty {g.dlp.jobs} · over-billed {g.over.jobs} · double {g.ghost.jobs}</div>
                </div>
              </div>
              <div className="row">
                <span className={`pill mini ${status === "sent" ? "s-done" : status === "review" ? "s-reg" : "s-prog"}`}>
                  {status === "sent" ? t("cb.sent") : status === "review" ? t("cb.review") : status === "drafted" ? "Notice drafted" : t("cb.approved")}
                </span>
                <b className="num red">{inrShort(amount)}</b>
                <Ico name="chevron" size={18} className="muted" />
              </div>
            </button>

            {isOpen && (
              <>
                <div className="cb-items">
                  {g.items.map((i: any) => {
                    const on = !st.excluded.includes(i.wo);
                    return (
                      <label key={i.wo} className={`cb-item ${on ? "" : "off"}`}>
                        <input type="checkbox" checked={on} disabled={!!st.sent_at} onChange={(e) => act(g.contractor_id, { action: "toggle", wo: i.wo, include: e.target.checked })} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="small"><b>{i.wo}</b> · <Link href={`/roads/${i.road_id}`} className="ink2" style={{ textDecoration: "underline" }}>{i.road_name}</Link> · {i.method}</div>
                          <div className="chips" style={{ gap: 5, marginTop: 4 }}>
                            {i.reasons.map((r: string) => <span key={r} className={`pill mini ${REASON[r].cls}`}>{REASON[r].label}</span>)}
                            <span className="tiny muted">{fmtDate(i.date)} · billed {inr(i.cost)} · rate card {inr(i.expected)}</span>
                          </div>
                        </div>
                        <b className="num small">{inr(i.amount)}</b>
                      </label>
                    );
                  })}
                </div>

                {!st.reviewed_at ? (
                  <div className="row wrap-gap">
                    <button className="btn primary" disabled={busy === g.contractor_id || !included.length} onClick={() => act(g.contractor_id, { action: "review" })}>
                      <Ico name="check" size={18} /> I have reviewed these {included.length} items
                    </button>
                    <span className="small muted">Untick anything that doesn&apos;t hold up. Nothing leaves without your review.</span>
                  </div>
                ) : !st.notice ? (
                  <button className="btn primary" disabled={busy === g.contractor_id} onClick={() => act(g.contractor_id, { action: "notice" })}>
                    {busy === g.contractor_id ? <span className="spin" /> : <><Ico name="sparkles" size={18} /> {t("cb.draft")}</>}
                  </button>
                ) : (
                  <div className="stack">
                    <div className="notice">{st.notice.text}</div>
                    <div className="row wrap-gap">
                      <button className="btn sm" onClick={() => navigator.clipboard.writeText(st.notice.text)}><Ico name="copy" size={15} /> Copy</button>
                      <a className="btn sm" download={`recovery-notice-${g.contractor_id}-ward-${g.items[0].ward.replace("/", "")}.txt`} href={`data:text/plain;charset=utf-8,${encodeURIComponent(st.notice.text)}`}><Ico name="file" size={15} /> Download</a>
                      <button className="btn sm" disabled={busy === g.contractor_id} onClick={() => act(g.contractor_id, { action: "notice" })}>{busy === g.contractor_id ? <span className="spin" /> : "Redraft"}</button>
                      {!st.sent_at ? (
                        <button className="btn sm primary" onClick={() => act(g.contractor_id, { action: "sent" })}><Ico name="send" size={15} /> Mark as sent</button>
                      ) : (
                        <span className="pill s-done"><Ico name="check" size={13} /> Sent {st.sent_at}</span>
                      )}
                    </div>
                    <p className="tiny muted">Drafted by Claude from the items above, in {lang === "hi" ? "Hindi" : lang === "mr" ? "Marathi" : "English"}. Switch the language at the top and redraft for another version.</p>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
