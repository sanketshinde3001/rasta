import { NextResponse } from "next/server";
import { encodeSession, type Session } from "@/lib/session";
import { DEMO_CITIZEN } from "@/lib/store";
import { db } from "@/lib/data";

export async function POST(req: Request) {
  const body = await req.json();
  let s: Session;
  if (body.role === "officer") {
    const ward = db().wardMap.has(body.ward) ? body.ward : "L";
    s = { role: "officer", id: body.employee_id || "AE-L-0412", name: "R. Deshmukh", ward, title: `Assistant Engineer, Ward ${ward}` };
  } else {
    s = { role: "citizen", ...DEMO_CITIZEN, phone: body.phone || DEMO_CITIZEN.phone };
  }
  const res = NextResponse.json({ ok: true, next: s.role === "officer" ? "/officer" : "/citizen" });
  res.cookies.set("rasta_session", encodeSession(s), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("rasta_session");
  return res;
}
