"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Ico } from "@/components/Ico";
import { CATEGORIES, SAMPLES, SUB_TO_CAT, fmtDate, photoOf } from "@/lib/taxonomy";
import { VoiceSheet } from "./VoiceSheet";

const PinMap = dynamic(() => import("@/components/PinMap").then((m) => m.PinMap), { ssr: false });

type Loc = { lat: number; lon: number; ward_code: string | null; ward_name: string | null; road_name: string | null; locality: string | null; inside_bmc: boolean; road_type: string | null };
type Similar = { source?: string; complaint_id: string; category_reported: string; description: string; status: string; received_at: string; road_name: string | null; locality_text: string | null; photo: string | null; supporters: number; distance_m: number };

const KURLA = { lat: 19.0726, lon: 72.8845 };

async function resize(file: Blob, max = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.82);
}

export function NewComplaint() {
  const [loc, setLoc] = useState<Loc | null>(null);
  const [locState, setLocState] = useState<"asking" | "ok" | "denied">("asking");
  const [locSource, setLocSource] = useState("device");
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [aiState, setAiState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [ai, setAi] = useState<any>(null);
  const [aiMsg, setAiMsg] = useState("");
  const [filled, setFilled] = useState<"photo" | "voice" | null>(null);
  const [category, setCategory] = useState("");
  const [sub, setSub] = useState("");
  const [desc, setDesc] = useState("");
  const [landmark, setLandmark] = useState("");
  const [language, setLanguage] = useState("en");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [similar, setSimilar] = useState<Similar[] | null>(null);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function placeAt(lat: number, lon: number, source: string) {
    const r: Loc = await fetch("/api/locate", { method: "POST", body: JSON.stringify({ lat, lon }) }).then((r) => r.json());
    setLoc(r);
    setLocSource(source);
    setLocState("ok");
  }

  function askLocation() {
    setLocState("asking");
    if (!navigator.geolocation) return setLocState("denied");
    navigator.geolocation.getCurrentPosition(
      (p) => placeAt(p.coords.latitude, p.coords.longitude, "device"),
      () => setLocState("denied"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  useEffect(askLocation, []);

  async function analyze(dataUrl: string) {
    setAiState("busy");
    setAiMsg("");
    try {
      const r = await fetch("/api/ai/photo", { method: "POST", body: JSON.stringify({ image: dataUrl, hint: desc }) }).then((r) => r.json());
      if (r.photo) setPhoto(r.photo);
      if (!r.ai) {
        setAiState("error");
        setAiMsg(r.error || "AI could not read the photo. Please fill the form yourself.");
        return;
      }
      setAi(r.ai);
      setCategory(r.ai.category);
      setSub(r.ai.subcategory);
      setDesc(r.ai.description);
      setFilled("photo");
      setAiState("done");
      if (!r.ai.is_road_issue) setAiMsg(`This doesn't look like a road problem${r.ai.note ? `: ${r.ai.note}` : "."} You can still continue.`);
    } catch {
      setAiState("error");
      setAiMsg("Couldn't reach the AI. Please fill the form yourself.");
    }
  }

  async function onFile(file: File, demoKind?: string) {
    setPreview(URL.createObjectURL(file));
    let geotagged = false;
    if (demoKind) {
      const r = await fetch("/api/locate", { method: "POST", body: JSON.stringify({ demo: demoKind }) }).then((r) => r.json());
      setLoc(r);
      setLocSource("photo");
      setLocState("ok");
      geotagged = true;
    } else {
      try {
        const exifr = (await import("exifr")).default;
        const gps = await exifr.gps(file);
        if (gps?.latitude) {
          await placeAt(gps.latitude, gps.longitude, "photo");
          geotagged = true;
        }
      } catch {}
    }
    if (!geotagged && !loc) askLocation();
    analyze(await resize(file));
  }

  async function pickSample(s: (typeof SAMPLES)[number]) {
    setSamplesOpen(false);
    const blob = await fetch(s.src).then((r) => r.blob());
    onFile(new File([blob], `${s.kind}.jpg`, { type: "image/jpeg" }), s.kind);
  }

  function fromVoice(r: any, transcript: string) {
    setVoiceOpen(false);
    setCategory(r.category);
    setSub(r.subcategory);
    setDesc(r.description);
    if (r.landmark) setLandmark(r.landmark);
    setLanguage(r.language || "en");
    setFilled("voice");
    setAiMsg(`You said: “${transcript}”`);
    if (!loc) askLocation();
  }

  async function submit(opts: { force?: boolean } = {}) {
    setErr("");
    if (!loc) return setErr("Add the location first.");
    if (!sub || !desc.trim()) return setErr("Choose the problem type and add a short description.");
    setBusy(true);
    if (!opts.force) {
      const r = await fetch("/api/complaints/similar", { method: "POST", body: JSON.stringify({ lat: loc.lat, lon: loc.lon, subcategory: sub }) }).then((r) => r.json());
      if (r.similar?.length) {
        setSimilar(r.similar);
        setBusy(false);
        return;
      }
    }
    const r = await fetch("/api/complaints", {
      method: "POST",
      body: JSON.stringify({
        lat: loc.lat, lon: loc.lon, subcategory: sub, description: desc, landmark, photo, ai, language,
        location_source: locSource, similar_to: opts.force ? similar?.[0]?.complaint_id : null, override_reason: opts.force ? reason : "",
      }),
    }).then((r) => r.json());
    if (r.id) location.href = `/citizen/complaints/${r.id}?new=1`;
    else {
      setErr(r.error || "Something went wrong.");
      setBusy(false);
    }
  }

  async function support(id: string) {
    setBusy(true);
    await fetch(`/api/complaints/${id}/support`, { method: "POST" });
    location.href = `/citizen/complaints/${id}?supported=1`;
  }

  const aiNote = (field: string) =>
    filled && (
      <div className="field-note"><Ico name="sparkles" size={13} /> {filled === "photo" ? "Filled from your photo" : "Filled from your voice"} · you can change {field}</div>
    );

  return (
    <div className="stack-lg">
      {/* 1. WHERE */}
      <section>
        <div className="section-title"><h2>1 · Where is it?</h2></div>
        <div className="card stack">
          {locState === "asking" && !loc && (
            <div className="row"><span className="spin" style={{ color: "var(--accent)" }} /> <span className="ink2">Finding your location…</span></div>
          )}
          {locState === "denied" && !loc && (
            <div className="stack">
              <div className="banner warn"><Ico name="pin" /> <div>We couldn&apos;t get your location. Allow location access, or drop a pin on the map.</div></div>
              <div className="row wrap-gap">
                <button className="btn" onClick={askLocation}><Ico name="nav" size={18} /> Try again</button>
                <button className="btn" onClick={() => placeAt(KURLA.lat, KURLA.lon, "map")}><Ico name="map" size={18} /> Pick on map</button>
              </div>
            </div>
          )}
          {loc && (
            <>
              <div className="row-top">
                <span className="ico-circle" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><Ico name="pin" /></span>
                <div style={{ flex: 1 }}>
                  <div className="bold">{loc.road_name || loc.locality || "Pinned location"}</div>
                  <div className="small ink2">
                    {loc.ward_code ? `Ward ${loc.ward_code} · ${loc.ward_name}` : "Outside BMC wards"}
                  </div>
                  <div className="tiny muted">
                    {locSource === "photo" ? "From the photo's location tag" : locSource === "map" ? "Pinned on the map" : "From your phone's location"} · drag the pin if it&apos;s off
                  </div>
                </div>
              </div>
              {!loc.inside_bmc && <div className="banner warn small">This spot is outside BMC wards. Move the pin onto the road with the problem.</div>}
              {loc.road_type === "Highway" && <div className="banner info small">This looks like an expressway. These are often maintained by MMRDA/PWD; your ward office will forward it if so.</div>}
              <PinMap lat={loc.lat} lon={loc.lon} onMove={(a, b) => placeAt(a, b, "map")} />
            </>
          )}
        </div>
      </section>

      {/* 2. SHOW US */}
      <section>
        <div className="section-title"><h2>2 · Show or tell us</h2></div>
        <div className="card stack">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          {preview ? (
            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Your photo" className="photo" style={{ maxHeight: 300 }} />
              {aiState === "busy" && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.72)", borderRadius: 12, display: "grid", placeItems: "center" }}>
                  <div className="row bold" style={{ color: "var(--accent)" }}><span className="spin" /> Reading your photo…</div>
                </div>
              )}
              <button className="btn sm" style={{ position: "absolute", top: 10, right: 10 }} onClick={() => fileRef.current?.click()}>Change</button>
            </div>
          ) : (
            <div className="grid2">
              <button className="btn" style={{ height: 96, flexDirection: "column", gap: 6 }} onClick={() => fileRef.current?.click()}>
                <Ico name="camera" size={26} /> Take or upload photo
              </button>
              <button className="btn" style={{ height: 96, flexDirection: "column", gap: 6 }} onClick={() => setVoiceOpen(true)}>
                <Ico name="mic" size={26} /> Say it instead
              </button>
            </div>
          )}
          {!preview && (
            <button className="linkbtn small" onClick={() => setSamplesOpen(true)}><Ico name="image" size={16} /> No photo handy? Use a sample photo</button>
          )}
          {aiState === "done" && ai && (
            <div className="banner info small">
              <Ico name="sparkles" size={18} />
              <div>
                <b>AI tagged this as {ai.subcategory}</b> · {ai.severity} severity{ai.size_estimate ? ` · ${ai.size_estimate}` : ""}
                {ai.hazards?.length > 0 && <div className="chips" style={{ marginTop: 8 }}>{ai.hazards.map((h: string) => <span key={h} className="pill ai-tag">{h}</span>)}</div>}
              </div>
            </div>
          )}
          {aiMsg && <div className={`banner small ${aiState === "error" || (ai && !ai.is_road_issue) ? "warn" : "info"}`}>{aiMsg}</div>}
        </div>
      </section>

      {/* 3. DETAILS */}
      <section>
        <div className="section-title">
          <h2>3 · Check the details</h2>
          {preview && <button className="linkbtn small" onClick={() => setVoiceOpen(true)}><Ico name="mic" size={16} /> Add by voice</button>}
        </div>
        <div className="card stack">
          <div>
            <label className="fl">Problem type</label>
            <div className="grid2">
              {Object.entries(CATEGORIES).map(([c, v]) => (
                <button
                  key={c}
                  className={`btn ${category === c ? "primary" : ""}`}
                  style={{ justifyContent: "flex-start", height: 52 }}
                  onClick={() => { setCategory(c); if (SUB_TO_CAT[sub] !== c) setSub(v.subs[0]); }}
                >
                  <Ico name={v.icon} size={19} /> {c}
                </button>
              ))}
            </div>
          </div>
          {category && (
            <div>
              <label className="fl">What exactly?</label>
              <select className={`input ${filled ? "ai-filled" : ""}`} value={sub} onChange={(e) => setSub(e.target.value)}>
                {CATEGORIES[category].subs.map((s) => <option key={s}>{s}</option>)}
              </select>
              {aiNote("this")}
            </div>
          )}
          <div>
            <label className="fl">Describe it</label>
            <textarea className={`input ${filled ? "ai-filled" : ""}`} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Deep pothole near the bus stop, bikes are swerving into traffic" />
            {aiNote("the text")}
          </div>
          <div>
            <label className="fl">Nearby landmark <span className="muted">(optional)</span></label>
            <input className="input" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. opposite Kurla station bus depot" />
          </div>
        </div>
      </section>

      {err && <div className="banner bad">{err}</div>}
      <button className="btn primary big" disabled={busy || aiState === "busy"} onClick={() => submit()}>
        {busy ? <span className="spin" /> : <>Submit complaint</>}
      </button>

      {voiceOpen && <VoiceSheet onClose={() => setVoiceOpen(false)} onResult={fromVoice} />}

      {samplesOpen && (
        <div className="overlay" onClick={() => setSamplesOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="between"><h2>Pick a sample photo</h2><button className="btn ghost sm" onClick={() => setSamplesOpen(false)}><Ico name="x" /></button></div>
            <p className="small muted" style={{ margin: "4px 0 14px" }}>For the demo. Each sample carries a location tag in Kurla, like a real phone photo.</p>
            <div className="grid3">
              {SAMPLES.map((s) => (
                <button key={s.kind} onClick={() => pickSample(s)} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 0, overflow: "hidden", background: "#fff", cursor: "pointer" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt="" style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                  <div className="small" style={{ padding: 8 }}>{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {similar && (
        <div className="overlay">
          <div className="sheet stack">
            <span className="ico-circle" style={{ background: "var(--amber-soft)", color: "var(--amber)", width: 48, height: 48 }}><Ico name="users" /></span>
            <h2>Someone already reported this nearby</h2>
            <p className="ink2 small">Supporting their complaint pushes it up the ward&apos;s priority list faster than a new one.</p>
            {similar.slice(0, 1).map((s) => (
              <Link key={s.complaint_id} href={`/citizen/complaints/${s.complaint_id}`} target="_blank" className="card flat tight row-top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photoOf(s) ? <img src={photoOf(s)!} alt="" className="thumb" /> : <span className="thumb"><Ico name="mic" size={20} /></span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bold">{s.category_reported} · {s.distance_m} m away</div>
                  <div className="small ink2" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</div>
                  <div className="tiny muted">#{s.complaint_id} · {fmtDate(s.received_at)} · {s.supporters} supporters · {s.status}</div>
                </div>
              </Link>
            ))}
            {!override ? (
              <>
                <button className="btn primary big" disabled={busy} onClick={() => support(similar[0].complaint_id)}>
                  <Ico name="thumbs" /> Support this complaint
                </button>
                <button className="btn ghost block" onClick={() => setOverride(true)}>Mine is a different problem</button>
              </>
            ) : (
              <>
                <div>
                  <label className="fl">Why is yours different?</label>
                  <textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. This is on the other side of the road, near the school gate" />
                </div>
                <button className="btn primary big" disabled={busy || reason.trim().length < 5} onClick={() => submit({ force: true })}>
                  {busy ? <span className="spin" /> : "File my complaint separately"}
                </button>
                <button className="btn ghost block" onClick={() => setOverride(false)}>Back</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
