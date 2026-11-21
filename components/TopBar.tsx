import Link from "next/link";
import { Ico } from "./Ico";
import { Logout } from "./Logout";
import type { Session } from "@/lib/session";

const NAV = {
  citizen: [
    { href: "/citizen", label: "Home", icon: "inbox" },
    { href: "/map", label: "Map", icon: "map" },
    { href: "/contractors", label: "Contractors", icon: "hardhat" },
    { href: "/rights", label: "Your rights", icon: "shield" },
  ],
  officer: [
    { href: "/officer", label: "Complaints", icon: "inbox" },
    { href: "/officer/budget", label: "Smart budget", icon: "wallet" },
    { href: "/officer/tenders", label: "Tenders", icon: "gavel" },
    { href: "/map", label: "Map", icon: "map" },
  ],
};

export function TopBar({ session, active, wide }: { session: Session | null; active?: string; wide?: boolean }) {
  const nav = session ? NAV[session.role] : [];
  const initials = session?.name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <header className="topbar">
      <div className="topbar-in" style={{ maxWidth: wide || session?.role === "officer" ? 1120 : 900 }}>
        <Link href={session ? (session.role === "officer" ? "/officer" : "/citizen") : "/"} className="brand">
          <span className="brand-mark"><Ico name="road" size={18} stroke={2.2} /></span>
          Rasta
        </Link>
        <nav className="topnav">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={active === n.href ? "on" : ""}>
              <Ico name={n.icon} size={17} /> <span className="lbl">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="spacer" />
        {session ? (
          <div className="who">
            <span className="hide-sm">{session.role === "officer" ? `Ward ${session.ward} office` : session.name}</span>
            <span className="avatar">{initials}</span>
            <Logout />
          </div>
        ) : (
          <Link href="/" className="btn sm">Log in</Link>
        )}
      </div>
    </header>
  );
}
