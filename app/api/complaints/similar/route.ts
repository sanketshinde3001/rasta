import { NextResponse } from "next/server";
import { similarOpen, complaintCardData } from "@/lib/triage";

export async function POST(req: Request) {
  const { lat, lon, subcategory } = await req.json();
  const sims = similarOpen(Number(lat), Number(lon), subcategory).slice(0, 3);
  return NextResponse.json({ similar: sims.map((s) => complaintCardData(s.c, s.d)) });
}
