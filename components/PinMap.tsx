"use client";
import { useEffect, useRef } from "react";

export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function pinIcon(L: any, color = "#0e6878") {
  return L.divIcon({
    className: "",
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    html: `<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39s13-13.3 13-23.5C28 7.5 22.2 2 15 2S2 7.5 2 15.5C2 25.7 15 39 15 39z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15.5" r="5" fill="#fff"/></svg>`,
  });
}

// Small map with a draggable pin, used on the complaint form.
export function PinMap({ lat, lon, onMove, height = 200 }: { lat: number; lon: number; onMove: (lat: number, lon: number) => void; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const cb = useRef(onMove);
  cb.current = onMove;

  useEffect(() => {
    let alive = true;
    import("leaflet").then((L) => {
      if (!alive || !el.current || map.current) return;
      map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([lat, lon], 17);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map.current);
      marker.current = L.marker([lat, lon], { draggable: true, icon: pinIcon(L) }).addTo(map.current);
      marker.current.on("dragend", () => {
        const p = marker.current.getLatLng();
        cb.current(p.lat, p.lng);
      });
      map.current.on("click", (e: any) => {
        marker.current.setLatLng(e.latlng);
        cb.current(e.latlng.lat, e.latlng.lng);
      });
    });
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !marker.current) return;
    const cur = marker.current.getLatLng();
    if (Math.abs(cur.lat - lat) > 1e-6 || Math.abs(cur.lng - lon) > 1e-6) {
      marker.current.setLatLng([lat, lon]);
      map.current.setView([lat, lon], 17);
    }
  }, [lat, lon]);

  return <div ref={el} style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }} />;
}
