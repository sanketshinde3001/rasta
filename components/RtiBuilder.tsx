"use client";
import { useMemo, useState } from "react";
import { Ico } from "./Ico";

export type RtiRow = {
  id: string; road: string; ward: string; contractor: string; method: string; cost: number; expected: number;
  completed: string | null; flags: string[]; dlp: boolean;
};

const rs = (v: number) => "Rs " + Math.round(v).toLocaleString("en-IN");
const day = (s: string | null) =>
  s ? new Date(s.replace(" ", "T")).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "the completion date";

const FLAG_LABEL: Record<string, string> = {
  OVERBILLED: "Billed above rate",
  GHOST_DUPLICATE: "Possible double bill",
  DLP_PAID: "Should have been free",
  FAILED_WITHIN_30D: "Broke within a month",
  SLA_MISSED: "Late",
  DLP_REVIEW: "Guarantee check",
};

export function rtiLetter(r: RtiRow, name = "", address = "") {
  const qs: string[] = [];
  if (r.flags.includes("OVERBILLED"))
    qs.push(`The reason ${rs(r.cost)} was paid for this work when the rate-card cost for the measured area is about ${rs(r.expected)}, and the officer who approved the bill.`);
  if (r.flags.includes("DLP_PAID") || (r.dlp && /patch|paver|asphalt|PQC/i.test(r.method)))
    qs.push(`Whether ${r.road} was under a Defect Liability Period on ${day(r.completed)}. If yes, why BMC paid for this repair instead of the original contractor doing it at their own cost, and whether the amount has been recovered.`);
  if (r.flags.includes("GHOST_DUPLICATE"))
    qs.push(`Details of the earlier work order for the same repair on ${r.road} within 7 days before this one, and proof that both jobs were carried out separately (site photos, measurement entries).`);
  if (r.flags.includes("FAILED_WITHIN_30D"))
    qs.push(`Whether the repair failed again within 30 days, and whether the contractor re-did the work at their own cost under the contract's guarantee clause.`);
  if (r.flags.includes("SLA_MISSED")) qs.push(`The deadline for this repair, the actual completion date, and any penalty levied for the delay.`);

  const base = [
    `Certified copy of work order ${r.id} (${r.method}, ${r.road}), with the estimate and sanction.`,
    `Measurement book entries for this work.`,
    `Bills and payment vouchers for this work, with the amount paid to ${r.contractor}.`,
    `Before and after photographs and the completion certificate.`,
    `The Defect Liability Period status of ${r.road}: the contractor responsible and its end date.`,
  ];
  const all = [...base, ...qs];
  return `To,
The Public Information Officer,
Ward ${r.ward} Office, Brihanmumbai Municipal Corporation, Mumbai

Subject: Request for information under Section 6(1) of the RTI Act, 2005 – work order ${r.id}, ${r.road}

Sir/Madam,

Please provide the following information about road repair work order ${r.id} carried out by ${r.contractor} on ${r.road} (completed ${day(r.completed)}):

${all.map((q, i) => `${i + 1}. ${q}`).join("\n")}

I am a citizen of India. The application fee of Rs 10 is paid by ____________. Please send the information by post/email within 30 days as required under the Act.

Name: ${name || "____________"}
Address: ${address || "____________"}
Date: ${new Date().toLocaleDateString("en-IN")}`;
}

export function RtiBuilder({ rows, preset }: { rows: RtiRow[]; preset?: string }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<RtiRow | null>(preset ? rows.find((r) => r.id === preset) || null : null);
  const [copied, setCopied] = useState(false);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return rows
      .filter((r) => r.id.toLowerCase().includes(s) || r.road.toLowerCase().includes(s) || r.contractor.toLowerCase().includes(s))
      .sort((a, b) => b.flags.filter((f) => f !== "SLA_MISSED").length - a.flags.filter((f) => f !== "SLA_MISSED").length)
      .slice(0, 6);
  }, [q, rows]);

  const letter = sel ? rtiLetter(sel) : "";

  if (!sel)
    return (
      <div className="stack">
        <div>
          <label className="fl">Which repair do you want to ask about?</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Road name, work order (WO25-…) or contractor" />
        </div>
        {hits.map((r) => (
          <button key={r.id} className="card flat tight rti-hit" onClick={() => setSel(r)}>
            <div className="between" style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div className="small bold">{r.road} · {r.method}</div>
                <div className="tiny muted">{r.id} · Ward {r.ward} · {r.contractor} · {day(r.completed)}</div>
              </div>
              <span className="num small bold" style={{ flex: "none" }}>{rs(r.cost)}</span>
            </div>
            {r.flags.some((f) => f !== "SLA_MISSED") && (
              <div className="chips" style={{ marginTop: 8 }}>
                {r.flags.filter((f) => FLAG_LABEL[f] && f !== "SLA_MISSED").map((f) => <span key={f} className="pill p-High" style={{ height: 22, fontSize: 12 }}>{FLAG_LABEL[f]}</span>)}
              </div>
            )}
          </button>
        ))}
        {q.trim().length >= 2 && !hits.length && <p className="small muted">No repair matches “{q}”.</p>}
      </div>
    );

  return (
    <div className="stack">
      <div className="between">
        <div style={{ minWidth: 0 }}>
          <div className="small bold">{sel.id} · {sel.road}</div>
          <div className="tiny muted">{sel.contractor} · Ward {sel.ward}</div>
        </div>
        {!preset && <button className="linkbtn small" onClick={() => setSel(null)}>Change</button>}
      </div>
      <pre className="rti-letter">{letter}</pre>
      <div className="grid2">
        <button
          className="btn primary"
          onClick={async () => {
            try { await navigator.clipboard.writeText(letter); } catch {}
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          <Ico name={copied ? "check" : "copy"} size={18} /> {copied ? "Copied" : "Copy letter"}
        </button>
        <button
          className="btn"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([letter], { type: "text/plain" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `RTI-${sel.id}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Ico name="file" size={18} /> Download
        </button>
      </div>
    </div>
  );
}

// Small button that opens the builder for one job
export function RtiButton({ row }: { row: RtiRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn sm" onClick={() => setOpen(true)}><Ico name="file" size={15} /> RTI</button>
      {open && (
        <div className="overlay" style={{ textAlign: "left" }} onClick={() => setOpen(false)}>
          <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
            <div className="between">
              <h2>RTI request</h2>
              <button className="btn ghost sm" onClick={() => setOpen(false)}><Ico name="x" /></button>
            </div>
            <p className="small ink2">Ready to send to the ward&apos;s Public Information Officer. Fee: ₹10. They must reply in 30 days.</p>
            <RtiBuilder rows={[row]} preset={row.id} />
          </div>
        </div>
      )}
    </>
  );
}
