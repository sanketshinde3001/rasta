import Link from "next/link";
import { Ico } from "@/components/Ico";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/data";
import { clawbackTotals } from "@/lib/clawback";
import { inrShort } from "@/lib/taxonomy";
import { getT } from "@/lib/serverLang";
import { LangSwitch } from "@/components/I18n";
import { BrandLogo } from "@/components/BrandLogo";

export default async function Landing() {
  const s = await getSession();
  if (s) redirect(s.role === "officer" ? "/officer" : "/citizen");
  const sum = db().summary;
  const { t } = await getT();
  const recoverable = clawbackTotals().city.total;
  return (
    <main className="wrap" style={{ paddingTop: 56 }}>
      <div className="between" style={{ marginBottom: 34 }}>
        <div className="brand" style={{ fontSize: 22 }}>
          <BrandLogo large />
        </div>
        <LangSwitch />
      </div>
      <h1 style={{ fontSize: 30 }}>{t("land.title")}</h1>
      <p className="ink2" style={{ marginTop: 10, fontSize: 17 }}>{t("land.sub")}</p>
      <div className="leak">
        <div><b>{inrShort(sum.total_spend_inr)}</b><span>{t("land.spent")}</span></div>
        <div className="red"><b>{inrShort(recoverable)}</b><span>{t("land.recover")}</span></div>
        <div className="amber"><b>₹3.07 cr</b><span>{t("land.failed")}</span></div>
      </div>

      <p className="fl" style={{ marginTop: 34, marginBottom: 10, color: "var(--muted)", fontSize: 14 }}>{t("land.continue")}</p>
      <div className="stack">
        <Link href="/login?role=citizen" className="card card-link row" style={{ padding: 20, gap: 16 }}>
          <span className="tile-ico" style={{ width: 52, height: 52 }}><Ico name="users" size={26} /></span>
          <span style={{ flex: 1 }}>
            <b style={{ fontSize: 18 }}>{t("land.citizen")}</b>
            <span className="muted" style={{ display: "block", fontSize: 14.5 }}>{t("land.citizen.d")}</span>
          </span>
          <Ico name="chevron" className="muted" />
        </Link>
        <Link href="/login?role=officer" className="card card-link row" style={{ padding: 20, gap: 16 }}>
          <span className="tile-ico" style={{ width: 52, height: 52, background: "#eef0ed", color: "var(--ink)" }}><Ico name="building" size={26} /></span>
          <span style={{ flex: 1 }}>
            <b style={{ fontSize: 18 }}>{t("land.officer")}</b>
            <span className="muted" style={{ display: "block", fontSize: 14.5 }}>{t("land.officer.d")}</span>
          </span>
          <Ico name="chevron" className="muted" />
        </Link>
      </div>

      <Link href="/map" className="row" style={{ marginTop: 26, color: "var(--accent)", fontWeight: 560 }}>
        <Ico name="map" size={18} /> {t("land.look")}
      </Link>

      <p className="tiny muted" style={{ marginTop: 30 }}>{t("land.synthetic")}</p>
    </main>
  );
}
