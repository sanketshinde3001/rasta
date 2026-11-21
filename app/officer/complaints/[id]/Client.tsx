"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ico } from "@/components/Ico";
import { fmtDateTime } from "@/lib/taxonomy";

const VSTYLE: Record<string, string> = { "Likely valid": "s-done", "Likely invalid": "p-High", "Needs more info": "s-reg" };

export function AiReview({ id, initial }: { id: string; initial: any }) {
  const [t, setT] = useState<any>(initial);
  const [busy, setBusy] = useState(!initial);
  const [err, setErr] = useState("");

  async function run(force = false) {
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/officer/complaints/${id}/triage`, { method: "POST", body: JSON.stringify({ force }) });
    const j = await r.json();
    if (r.ok) setT(j);
    else setErr(j.error || "AI review failed.");
    setBusy(false);
  }
  useEffect(() => {
    if (!initial) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card stack">
      <div className="between">
        <div className="row"><Ico name="sparkles" size={18} className="green" /><h2>AI review</h2></div>
        {t && !busy && <button className="linkbtn small" onClick={() => run(true)}>Re-run</button>}
      </div>
      {busy && <div className="row ink2 small"><span className="spin" style={{ color: "var(--accent)" }} /> Reading the complaint, photo and location…</div>}
      {err && <div className="banner warn small">{err}</div>}
      {t && !busy && (
        <>
          <div className="row wrap-gap">
            <span className={`pill ${VSTYLE[t.validity]}`}>{t.validity}</span>
            <span className="pill s-inv">Evidence: {t.severity_from_evidence} severity</span>
          </div>
          <p className="small"><b>{t.validity_reason}</b></p>
          <p className="small ink2">{t.summary}</p>
          <p className="small"><span className="muted">Suggested next step:</span> {t.suggested_action}</p>
          {t.flags?.length > 0 && <div className="chips">{t.flags.map((f: string) => <span key={f} className="pill s-reg">{f}</span>)}</div>}
          <p className="tiny muted">{t.by === "claude" ? "Claude" : "Rules (no AI key)"} · {t.at ? fmtDateTime(new Date(new Date(t.at).getTime() + 330 * 60000).toISOString().slice(0, 16)) : ""} · AI suggests, you decide.</p>
        </>
      )}
    </section>
  );
}

export function Decision({ id, status, decision }: { id: string; status: string; decision: any }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "invalid">("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function act(action: string) {
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/officer/complaints/${id}/decision`, { method: "POST", body: JSON.stringify({ action, note }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error);
    setMode("idle");
    setNote("");
    router.refresh();
  }

  const open = ["Open", "Registered"].includes(status);
  const inProgress = ["Verified", "In Progress"].includes(status);

  return (
    <section className="card stack">
      <h2>Your decision</h2>
      {decision && (
        <div className="banner ok small"><Ico name="check" size={18} /><div><b>{decision.action === "verify" ? "Verified" : decision.action === "invalid" ? "Marked invalid" : "Marked fixed"}</b> · {fmtDateTime(decision.at)}<div>{decision.note}</div></div></div>
      )}
      {open && mode === "idle" && (
        <>
          <button className="btn primary big" disabled={busy} onClick={() => act("verify")}><Ico name="check" /> Confirm valid</button>
          <button className="btn block" disabled={busy} onClick={() => setMode("invalid")}>Mark invalid</button>
        </>
      )}
      {mode === "invalid" && (
        <>
          <label className="fl">Reason (the citizen will see this)</label>
          <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. This stretch is an MMRDA road; forwarded to MMRDA." />
          <button className="btn primary block" disabled={busy || !note.trim()} onClick={() => act("invalid")}>Mark invalid</button>
          <button className="btn ghost block" onClick={() => setMode("idle")}>Cancel</button>
        </>
      )}
      {inProgress && <button className="btn primary block" disabled={busy} onClick={() => act("resolve")}><Ico name="check" /> Mark as fixed</button>}
      {!open && !inProgress && !decision && <p className="small muted">This complaint is closed.</p>}
      {err && <div className="banner bad small">{err}</div>}
    </section>
  );
}
