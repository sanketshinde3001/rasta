import Link from "next/link";
import { Ico } from "./Ico";
import { Logout } from "./Logout";
import type { Session } from "@/lib/session";
import { LangSwitch } from "./I18n";
import { getT } from "@/lib/serverLang";

const NAV = {
  citizen: [
    { href: "/citizen", label: "nav.home", icon: "inbox" },
    { href: "/map", label: "nav.map", icon: "map" },
    { href: "/contractors", label: "nav.contractors", icon: "hardhat" },
    { href: "/rights", label: "nav.rights", icon: "shield" },
  ],
  officer: [
    { href: "/officer", label: "nav.complaints", icon: "inbox" },
    { href: "/officer/clawback", label: "nav.clawback", icon: "rupee" },
    { href: "/officer/budget", label: "nav.budget", icon: "wallet" },
    { href: "/officer/tenders", label: "nav.tenders", icon: "gavel" },
    { href: "/map", label: "nav.map", icon: "map" },
  ],
};

export async function TopBar({ session, active, wide }: { session: Session | null; active?: string; wide?: boolean }) {
  const { t } = await getT();
  const nav = session ? NAV[session.role] : [];
  const initials = session?.name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <header className="topbar">
      <div className="topbar-in" style={{ maxWidth: wide || session?.role === "officer" ? 1120 : 900 }}>
        <Link href={session ? (session.role === "officer" ? "/officer" : "/citizen") : "/"} className="brand" style={{ flex: "none" }}>
          <span className="brand-mark"><Ico name="road" size={18} stroke={2.2} /></span>
          Rasta
        </Link>
        <nav className="topnav">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={active === n.href ? "on" : ""}>
              <Ico name={n.icon} size={17} /> <span className="lbl">{t(n.label)}</span>
            </Link>
          ))}
        </nav>
        <div className="spacer" />
        <LangSwitch />
        {session ? (
          <div className="who">
            <span className="hide-sm">{session.role === "officer" ? t("ward.office", { w: session.ward }) : session.name}</span>
            <span className="avatar">{initials}</span>
            <Logout />
          </div>
        ) : (
          <Link href="/" className="btn sm">{t("login")}</Link>
        )}
      </div>
    </header>
  );
}
