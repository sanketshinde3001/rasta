import "server-only";

// Real street addresses from OpenStreetMap's Nominatim (free; max ~1 request/second; cached here).
const UA = "Rasta-civic-prototype/1.0 (hackathon demo)";
const MUMBAI_VIEWBOX = "72.77,19.30,73.05,18.88"; // left,top,right,bottom
const rev = new Map<string, any>();
const fwd = new Map<string, any[]>();

export async function reverseGeocode(lat: number, lon: number) {
  const k = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (rev.has(k)) return rev.get(k);
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=en`, {
      headers: { "User-Agent": UA }, signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const a = j.address || {};
    const out = {
      road: a.road || a.pedestrian || a.footway || a.neighbourhood || null,
      area: a.suburb || a.neighbourhood || a.quarter || a.city_district || null,
      landmark: j.name && j.name !== a.road ? j.name : null,
      display: [a.road || j.name, a.neighbourhood, a.suburb].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(", "),
    };
    rev.set(k, out);
    return out;
  } catch {
    return null;
  }
}

export async function searchPlaces(q: string) {
  const k = q.toLowerCase().trim();
  if (fwd.has(k)) return fwd.get(k)!;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&viewbox=${MUMBAI_VIEWBOX}&bounded=1&limit=6&countrycodes=in&accept-language=en`, {
      headers: { "User-Agent": UA }, signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const out = j.map((p: any) => ({
      name: p.name || String(p.display_name).split(",")[0], sub: String(p.display_name).split(",").slice(1, 4).join(",").trim(),
      lat: +p.lat, lon: +p.lon, kind: p.category === "highway" ? "road" : p.type === "hospital" ? "hospital" : p.type === "school" ? "school" : "area",
    }));
    fwd.set(k, out);
    return out;
  } catch {
    return [];
  }
}
