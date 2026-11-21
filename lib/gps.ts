// Precise location: watch GPS for a few seconds and keep the most accurate fix (like delivery apps do).
export type Fix = { lat: number; lon: number; acc: number };

export function bestFix(onUpdate: (f: Fix) => void, opts: { maxMs?: number; goodM?: number } = {}): Promise<Fix | null> {
  const maxMs = opts.maxMs ?? 12000, goodM = opts.goodM ?? 20;
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    let best: Fix | null = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      navigator.geolocation.clearWatch(id);
      clearTimeout(t);
      resolve(best);
    };
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const f = { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy) };
        if (!best || f.acc < best.acc) {
          best = f;
          onUpdate(f);
        }
        if (f.acc <= goodM) finish();
      },
      () => finish(),
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxMs }
    );
    const t = setTimeout(finish, maxMs);
  });
}
