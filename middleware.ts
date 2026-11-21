import { NextResponse, type NextRequest } from "next/server";

// Dummy auth: just checks the role cookie and routes people to the right login.
export function middleware(req: NextRequest) {
  const raw = req.cookies.get("rasta_session")?.value;
  let role: string | null = null;
  try {
    role = raw ? JSON.parse(atob(raw.replace(/-/g, "+").replace(/_/g, "/"))).role : null;
  } catch {}
  const p = req.nextUrl.pathname;
  const need = p.startsWith("/officer") ? "officer" : p.startsWith("/citizen") && !p.startsWith("/citizen/complaints") ? "citizen" : null;
  if (need && role !== need) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?role=${need}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/citizen/:path*", "/officer/:path*"] };
