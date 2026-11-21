import { NextResponse } from "next/server";
import { demoSpot, locate } from "@/lib/data";

export async function POST(req: Request) {
  const b = await req.json();
  if (b.demo) {
    const p = demoSpot(b.demo);
    return NextResponse.json(locate(p.lat, p.lon));
  }
  return NextResponse.json(locate(Number(b.lat), Number(b.lon)));
}
