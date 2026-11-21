import { TopBar } from "@/components/TopBar";
import { Ico } from "@/components/Ico";
import { requireRole } from "@/lib/session";
import { getT } from "@/lib/serverLang";
import { db } from "@/lib/data";
import { clawByContractor, clawbackTotals, dlpExpiring } from "@/lib/clawback";
import { clawState, inspections } from "@/lib/store";
import { inrShort } from "@/lib/taxonomy";
import { gradeOf } from "@/app/contractors/grade";
import { ClawDesk, ExpiringList } from "./ClawDesk";

export const dynamic = "force-dynamic";

export default async function Clawback() {
  const s = await requireRole("officer");
  const { t, lang } = await getT();
  const w = db().wardMap.get(s.ward)!;
  const tot = clawbackTotals(s.ward);
  const groups = clawByContractor(s.ward).map((g) => {
    const c = db().contractors.find((x) => x.contractor_id === g.contractor_id);
    return { ...g, grade: c ? gradeOf(c) : null, state: clawState(`${s.ward}|${g.contractor_id}`) };
  });
  let expiring = dlpExpiring(90, s.ward);
  const cityWide = !expiring.length;
  if (cityWide) expiring = dlpExpiring(90).slice(0, 6);
  const ward = tot.ward!;
  return (
    <>
      <TopBar session={s} active="/officer/clawback" />
      <main className="wrap-wide stack-lg">
        <div>
          <p className="muted small">Ward {s.ward} · {w.ward_name}</p>
          <h1 style={{ marginTop: 2 }}>{t("cb.title")}</h1>

        </div>

        <div className="cb-hero">
          <div>
            <b className="red">{inrShort(ward.total)}</b>
            <span>{t("cb.recoverable")} · {ward.jobs} work orders</span>
            <span className="tiny muted">{inrShort(tot.city.total)} {t("cb.city")} · {Math.round((100 * ward.total) / Math.max(1, w.spend_inr))}% of this ward&apos;s repair spend</span>
          </div>
          <div className="cb-split">
            <div><Ico name="shield" size={18} /><b>{inrShort(ward.dlp.amount)}</b><span>{t("cb.dlp")} · {ward.dlp.jobs}</span></div>
            <div><Ico name="alert" size={18} /><b>{inrShort(ward.over.amount)}</b><span>{t("cb.over")} · {ward.over.jobs}</span></div>
            <div><Ico name="copy" size={18} /><b>{inrShort(ward.ghost.amount)}</b><span>{t("cb.ghost")} · {ward.ghost.jobs}</span></div>
          </div>
        </div>
        <p className="small ink2" style={{ marginTop: -8 }}><Ico name="scale" size={14} /> Bombay High Court, 13 Oct 2025 (Suo Motu PIL 71/2013): repairs within 48 hours, and compensation recovered from responsible officers and contractors.</p>

        <ExpiringList rows={expiring} cityWide={cityWide} done={inspections()} title={t("cb.expiring")} />

        <ClawDesk groups={groups} lang={lang} />
      </main>
    </>
  );
}
