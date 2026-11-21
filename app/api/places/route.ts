import { NextResponse } from "next/server";
import { db } from "@/lib/data";

// Offline place search over the city's localities, roads, hospitals and schools.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ results: [] });
  const { ctx, roads, wardMap } = db();
  const out: { name: string; sub: string; lat: number; lon: number; kind: string }[] = [];
  const seen = new Set<string>();
  for (const l of ctx.localities) {
    const hay = `${l.locality};${l.aliases || ""}`.toLowerCase();
    if (hay.includes(q) && !seen.has(l.locality)) {
      seen.add(l.locality);
      out.push({ name: l.locality, sub: `Area · Ward ${l.ward_code}, ${wardMap.get(l.ward_code)?.ward_name || ""}`, lat: l.lat, lon: l.lon, kind: "area" });
    }
  }
  for (const r of roads) {
    if (r.road_name.toLowerCase().includes(q) && !seen.has(r.road_name + r.ward_code)) {
      seen.add(r.road_name + r.ward_code);
      out.push({ name: r.road_name, sub: `Road · Ward ${r.ward_code}`, lat: r.lat, lon: r.lon, kind: "road" });
    }
  }
  for (const f of ctx.facilities) {
    const n = String(f.name).replace(" (synthetic)", "");
    if (n.toLowerCase().includes(q)) out.push({ name: n, sub: `${f.type} · Ward ${f.ward_code}`, lat: f.lat, lon: f.lon, kind: f.type === "Hospital" ? "hospital" : "school" });
  }
  return NextResponse.json({ results: out.slice(0, 8) });
}
