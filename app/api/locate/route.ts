import { NextResponse } from "next/server";
import { demoSpot, locate } from "@/lib/data";
import { reverseGeocode } from "@/lib/geocode";

export async function POST(req: Request) {
  const b = await req.json();
  const p = b.demo ? demoSpot(b.demo) : { lat: Number(b.lat), lon: Number(b.lon) };
  const l = locate(p.lat, p.lon);
  const addr = await reverseGeocode(p.lat, p.lon);
  // Show the real street name; keep the dataset road only when the pin is really on it (for linking repair records)
  const onKnownRoad = l.road_dist_m != null && l.road_dist_m <= 60;
  return NextResponse.json({
    ...l,
    road_id: onKnownRoad ? l.road_id : null,
    road_name: addr?.road || (onKnownRoad ? l.road_name : null),
    locality: addr?.area || l.locality,
    address: addr?.display || null,
    landmark_hint: addr?.landmark || null,
  });
}
