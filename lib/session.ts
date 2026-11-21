import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_CITIZEN } from "./store";

export type Session =
  | { role: "citizen"; id: string; name: string; ward: string; area: string; phone: string }
  | { role: "officer"; id: string; name: string; ward: string; title: string };

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get("rasta_session")?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString());
  } catch {
    return null;
  }
}

export function encodeSession(s: Session) {
  return Buffer.from(JSON.stringify(s)).toString("base64url");
}

export async function requireRole(role: "citizen" | "officer") {
  const s = await getSession();
  if (!s || s.role !== role) redirect(`/login?role=${role}`);
  return s as any;
}

export function demoCitizen(): Session {
  return { role: "citizen", ...DEMO_CITIZEN };
}
