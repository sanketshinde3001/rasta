"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ico } from "@/components/Ico";
import { LocationPicker, type Loc } from "@/components/LocationPicker";
import { CATEGORIES, SAMPLES, SUB_TO_CAT, fmtDate, photoOf } from "@/lib/taxonomy";
import { VoiceSheet } from "./VoiceSheet";
import { bestFix } from "@/lib/gps";
import { useT, useLang } from "@/components/I18n";
import { isAcceptedPhoto, PHOTO_UNRELATED, PHOTO_UNVERIFIED } from "@/lib/photo-validation";

type Similar = { source?: string; complaint_id: string; category_reported: string; description: string; status: string; received_at: string; road_name: string | null; locality_text: string | null; photo: string | null; supporters: number; distance_m: number };
export type Prefill = { subcategory: string; lat: number; lon: number; renew_of: string } | null;

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
const locateAt = (lat: number, lon: number): Promise<Loc> => fetch("/api/locate", { method: "POST", body: JSON.stringify({ lat, lon }) }).then((r) => r.json());

export function NewComplaint({ phone, prefill }: { phone: string; prefill: Prefill }) {
  const t = useT();
  const uiLang = useLang();
  const [loc, setLoc] = useState<Loc | null>(null);
  const [locSource, setLocSource] = useState("");
  const [acc, setAcc] = useState<number | null>(null);
  const locSourceRef = useRef("");
  locSourceRef.current = locSource;
  const [picker, setPicker] = useState<{ lat: number; lon: number } | null | false>(false);
  const [gpsState, setGpsState] = useState<"asking" | "ok" | "denied">("asking");
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [aiState, setAiState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [ai, setAi] = useState<any>(null);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const photoRequest = useRef(0);
  const [note, setNote] = useState<{ kind: "info" | "warn"; text: string } | null>(null);
  const [filled, setFilled] = useState<"photo" | "voice" | null>(null);
  const [category, setCategory] = useState("");
  const [sub, setSub] = useState("");
  const [desc, setDesc] = useState("");
  const [landmark, setLandmark] = useState("");
  const [language, setLanguage] = useState("en");
  const [anon, setAnon] = useState(false);
  const [usePhone, setUsePhone] = useState(true);
  const [useEmail, setUseEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [similar, setSimilar] = useState<Similar[] | null>(null);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Ask for location as soon as the form opens (ward is captured automatically)
  useEffect(() => {
    if (prefill) {
      setSub(prefill.subcategory);
      setCategory(SUB_TO_CAT[prefill.subcategory] || "");
      locateAt(prefill.lat, prefill.lon).then((l) => { setLoc(l); setLocSource("renew"); setGpsState("ok"); });
      return;
    }
    if (!navigator.geolocation) return setGpsState("denied");
    const mine = () => locSourceRef.current === "" || locSourceRef.current === "device"; // don't override a photo tag or a map pin
    let last = 0;
    const apply = (f: { lat: number; lon: number; acc: number }) =>
      locateAt(f.lat, f.lon).then((l) => {
        if (!mine()) return;
        setLoc(l);
        setLocSource("device");
        setGpsState("ok");
      });
    bestFix((f) => {
      setAcc(f.acc);
      if (Date.now() - last > 1500) {
        last = Date.now();
        apply(f);
      }
    }).then((f) => {
      if (!f) return setGpsState((g) => (g === "ok" ? g : "denied"));
      setAcc(f.acc);
      apply(f);
    });
  }, [prefill]);

  const photoBlocked = !!preview && (aiState !== "done" || !isAcceptedPhoto(ai));

  function clearPhotoFields() {
    if (filled !== "photo") return;
    if (category === ai?.category) setCategory("");
    if (sub === ai?.subcategory) setSub("");
    if (desc === ai?.description?.slice(0, 250)) setDesc("");
    setFilled(null);
  }

  function removePhoto() {
    photoRequest.current++;
    clearPhotoFields();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPhoto(null);
    setAi(null);
    setAiState("idle");
    setPhotoWarning(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function analyze(dataUrl: string, requestId: number) {
    try {
      const r = await fetch("/api/ai/photo", { method: "POST", body: JSON.stringify({ image: dataUrl, hint: desc, lang: uiLang }) }).then((r) => r.json());
      if (requestId !== photoRequest.current) return;
      if (r.photo) setPhoto(r.photo);
      if (!isAcceptedPhoto(r.ai)) {
        setAi(null);
        setAiState("error");
        setPhotoWarning(r.ai?.by === "claude" ? PHOTO_UNRELATED : PHOTO_UNVERIFIED);
        return;
      }
      setAi(r.ai);
      setCategory(r.ai.category);
      setSub(r.ai.subcategory);
      if (!desc.trim() || filled === "photo") setDesc(r.ai.description.slice(0, 250));
      setFilled("photo");
      setAiState("done");
      setPhotoWarning(null);
      setMissing((m) => m.filter((x) => x !== "problem type" && x !== "description"));
    } catch {
      if (requestId !== photoRequest.current) return;
      setAi(null);
      setAiState("error");
      setPhotoWarning(PHOTO_UNVERIFIED);
    }
  }

  async function onFile(file: File, demoKind?: string) {
    const requestId = ++photoRequest.current;
    clearPhotoFields();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setPhoto(null);
    setAi(null);
    setAiState("busy");
    setPhotoWarning(null);
    setNote(null);
    try {
    if (demoKind) {
      const r = await fetch("/api/locate", { method: "POST", body: JSON.stringify({ demo: demoKind }) }).then((r) => r.json());
      if (requestId !== photoRequest.current) return;
      setLoc(r);
      setLocSource("photo");
    } else {
      try {
        const exifr = (await import("exifr")).default;
        const gps = await exifr.gps(file);
        if (gps?.latitude) {
          const photoLoc = await locateAt(gps.latitude, gps.longitude);
          if (requestId !== photoRequest.current) return;
          setLoc(photoLoc);
          setLocSource("photo");
        }
      } catch {}
    }
    const dataUrl = await resize(file);
    if (requestId !== photoRequest.current) return;
    await analyze(dataUrl, requestId);
    } catch {
      if (requestId !== photoRequest.current) return;
      setAiState("error");
      setPhotoWarning("This image could not be read. Please choose a JPG or PNG site photo, or remove the attachment.");
    }
  }

  async function pickSample(s: (typeof SAMPLES)[number]) {
    setSamplesOpen(false);
    const blob = await fetch(s.src).then((r) => r.blob());
    onFile(new File([blob], `${s.kind}.jpg`, { type: "image/jpeg" }), s.kind);
  }

  async function fromVoice(r: any, transcript: string) {
    setVoiceOpen(false);
    setCategory(r.category);
    setSub(r.subcategory);
    setDesc(String(r.description).slice(0, 250));
    setLanguage(r.language || "en");
    setFilled("voice");
    const miss: string[] = [...(r.missing || [])];
    if (r.landmark) setLandmark(r.landmark);
    // place the pin from what they said, if we know the place
    if (!loc && r.landmark) {
      for (const q of [r.landmark, ...String(r.landmark).split(/,| near | opposite /i)]) {
        const t = q.trim();
        if (t.length < 3) continue;
        const j = await fetch(`/api/places?q=${encodeURIComponent(t)}`).then((x) => x.json());
        if (j.results?.length) {
          setPicker({ lat: j.results[0].lat, lon: j.results[0].lon });
          break;
        }
      }
    }
    if (!loc && !miss.includes("location")) miss.push("location");
    if (!preview) miss.push("photo");
    setMissing(miss);
    setNote({ kind: "info", text: `You said: “${transcript}”` });
  }

  async function submit(opts: { force?: boolean } = {}) {
    setErr("");
    if (photoBlocked) return setErr(photoWarning || "Wait for photo verification, or remove the attachment before submitting.");
    const miss: string[] = [];
    if (!loc) miss.push("location");
    if (!sub) miss.push("problem type");
    if (miss.length) {
      setMissing(miss);
      return setErr(`Please add: ${miss.join(", ")}.`);
    }
    if (!desc.trim() && !preview) {
      setMissing(["description"]);
      return setErr("Add a photo or a short description so the ward office knows what to fix.");
    }
    setBusy(true);
    if (!opts.force) {
      const r = await fetch("/api/complaints/similar", { method: "POST", body: JSON.stringify({ lat: loc!.lat, lon: loc!.lon, subcategory: sub }) }).then((r) => r.json());
      if (r.similar?.length) {
        setSimilar(r.similar);
        setBusy(false);
        return;
      }
    }
    const r = await fetch("/api/complaints", {
      method: "POST",
      body: JSON.stringify({
        lat: loc!.lat, lon: loc!.lon, road_name: loc!.road_name, locality: loc!.locality, subcategory: sub, description: desc.trim() || ai?.description || sub, landmark, photo, ai, language,
        location_source: locSource, similar_to: opts.force ? similar?.[0]?.complaint_id : prefill?.renew_of || null,
        override_reason: opts.force ? reason : prefill ? `Renewed: earlier complaint #${prefill.renew_of} was closed but the problem is back.` : "",
        anonymous: anon, notify_phone: !anon && usePhone, notify_email: !anon && useEmail ? email : "",
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

  const need = (f: string) => missing.includes(f);
  const aiNote = filled && (
    <div className="field-note"><Ico name="sparkles" size={13} /> {filled === "photo" ? t("f.fromphoto") : t("f.fromvoice")}</div>
  );

  return (
    <div className="stack-lg">
      {/* Voice shortcut */}
      {!filled && (
        <button className="voice-cta" onClick={() => setVoiceOpen(true)}>
          <span className="ico-circle" style={{ background: "var(--accent)", color: "#fff", width: 48, height: 48 }}><Ico name="mic" size={24} /></span>
          <span style={{ flex: 1, textAlign: "left" }}>
            <b>{t("f.say")}</b>
            <span className="small ink2" style={{ display: "block" }}>{t("f.say.d")}</span>
          </span>
          <Ico name="chevron" className="muted" />
        </button>
      )}
      {note && <div className={`banner small ${note.kind}`}><Ico name={note.kind === "warn" ? "alert" : "mic"} size={18} /><div>{note.text}</div></div>}
      {missing.length > 0 && filled === "voice" && (
        <div className="banner warn small"><Ico name="info" size={18} /><div><b>{t("f.almost")}</b> {missing.join(", ")}.</div></div>
      )}

      <div className="card stack form">
        {/* Location */}
        <div>
          <label className="fl">{t("f.location")} <span className="req">*</span></label>
          {loc ? (
            <button className="loc-row" onClick={() => setPicker({ lat: loc.lat, lon: loc.lon })}>
              <Ico name="pin" size={20} className="green" />
              <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <b className="ellipsis" style={{ display: "block" }}>{loc.road_name || loc.locality || "Pinned spot"}</b>
                <span className="tiny muted">{loc.address ? `${loc.address} · ` : ""}{landmark ? `${landmark} · ` : ""}{locSource === "photo" ? "from photo's location tag" : locSource === "device" ? `your location${acc ? ` (±${acc} m)` : ""}` : "set on map"}</span>
              </span>
              <span className="linkbtn small">{t("f.change")}</span>
            </button>
          ) : (
            <button className={`loc-row empty ${need("location") ? "need" : ""}`} onClick={() => setPicker(null)}>
              {gpsState === "asking" ? <span className="spin" style={{ color: "var(--accent)" }} /> : <Ico name="pin" size={20} />}
              <span style={{ flex: 1, textAlign: "left" }}>{gpsState === "asking" ? t("f.finding") : t("f.setloc")}</span>
              <Ico name="chevron" size={18} className="muted" />
            </button>
          )}
        </div>

        {loc && locSource === "device" && acc != null && acc > 60 && (
          <div className="banner warn small">
            <Ico name="nav" size={18} />
            <div style={{ flex: 1 }}>Your phone&apos;s location is approximate (±{acc} m). Drag the pin to the exact spot.</div>
            <button className="btn sm" onClick={() => setPicker({ lat: loc.lat, lon: loc.lon })}>Adjust</button>
          </div>
        )}

        <div className="grid2">
          <div>
            <label className="fl">{t("f.ward")} <span className="muted">{t("f.auto")}</span></label>
            <div className="input muted" style={{ display: "flex", alignItems: "center" }}>{loc?.ward_code ? `Ward ${loc.ward_code}` : "Ward"}</div>
          </div>
          <div>
            <label className="fl">{t("f.area")}</label>
            <div className="input muted ellipsis" style={{ display: "flex", alignItems: "center" }}>{loc?.locality || loc?.ward_name || "–"}</div>
          </div>
        </div>
        {loc?.road_type === "Highway" && <div className="banner info small">Expressways are often MMRDA/PWD roads. The ward office will forward it if so.</div>}

        {/* Photo */}
        <div>
          <label className="fl">{t("f.photo")} <span className="muted">{t("f.photo.why")}</span></label>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          {preview ? (
            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Your photo" className="photo" style={{ maxHeight: 260 }} />
              {aiState === "busy" && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.75)", borderRadius: 12, display: "grid", placeItems: "center" }}>
                  <div className="row bold" style={{ color: "var(--accent)" }}><span className="spin" /> {t("f.reading")}</div>
                </div>
              )}
              <div className="row" style={{ position: "absolute", top: 10, right: 10 }}>
                <button className="btn sm" onClick={() => fileRef.current?.click()}>Change</button>
                <button className="btn sm" onClick={removePhoto}>Remove photo</button>
              </div>
            </div>
          ) : (
            <div className="row wrap-gap">
              <button className={`btn ${need("photo") ? "need" : ""}`} onClick={() => fileRef.current?.click()} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                <Ico name="camera" size={19} /> {t("f.upload")}
              </button>
              <button className="linkbtn small" onClick={() => setSamplesOpen(true)}><Ico name="image" size={16} /> {t("f.sample")}</button>
            </div>
          )}
          {photoWarning && <div className="banner warn small" role="alert" style={{ marginTop: 12 }}>
            <Ico name="alert" size={18} />
            <div><b>Photo not accepted</b><p>{photoWarning}</p><p style={{ marginTop: 8 }}>For other civic concerns in Mumbai, call BMC on <a href="tel:1916" style={{ fontWeight: 700, textDecoration: "underline" }}>1916</a>. Outside Mumbai, contact your local municipal authority.</p></div>
          </div>}
          {aiState === "done" && isAcceptedPhoto(ai) && (
            <div className="chips" style={{ marginTop: 10 }}>
              <span className="pill ai-tag"><Ico name="sparkles" size={13} /> {ai.subcategory} · {ai.severity} severity</span>
              {ai.hazards?.slice(0, 3).map((h: string) => <span key={h} className="pill ai-tag">{h}</span>)}
            </div>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="fl">{t("f.type")} <span className="req">*</span></label>
          <div className="type-grid">
            {Object.entries(CATEGORIES).map(([c, v]) => (
              <button key={c} className={`type-btn ${category === c ? "on" : ""} ${need("problem type") && !category ? "need" : ""}`} onClick={() => { setCategory(c); if (SUB_TO_CAT[sub] !== c) setSub(v.subs[0]); setMissing((m) => m.filter((x) => x !== "problem type")); }}>
                <Ico name={v.icon} size={22} />
                <span>{t(`cat.${c}`)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="fl">{t("f.subtype")} <span className="req">*</span></label>
          <select className={`input ${filled ? "ai-filled" : ""}`} value={sub} disabled={!category} onChange={(e) => setSub(e.target.value)}>
            {!category && <option>{t("f.pickfirst")}</option>}
            {category && CATEGORIES[category].subs.map((s) => <option key={s} value={s}>{t(`sub.${s}`)}</option>)}
          </select>
          {aiNote}
        </div>

        <div>
          <div className="between"><label className="fl">{t("f.desc")} <span className="muted">{t("f.optional")}</span></label><span className="tiny muted num">{desc.length}/250</span></div>
          <textarea className={`input ${filled ? "ai-filled" : ""} ${need("description") ? "need" : ""}`} maxLength={250} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Deep pothole near the bus stop, bikes are swerving" />
        </div>

        {/* Acknowledgement */}
        <div>
          <label className="fl">{t("f.ack")}</label>
          <div className="stack" style={{ gap: 8 }}>
            <label className="check"><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> {t("f.anon")} <span className="tiny muted">{t("f.anon.d")}</span></label>
            {!anon && (
              <>
                <label className="check"><input type="checkbox" checked={usePhone} onChange={(e) => setUsePhone(e.target.checked)} /> <span className="input num" style={{ minHeight: 42, padding: "9px 12px", flex: 1 }}>+91 {phone}</span></label>
                <label className="check"><input type="checkbox" checked={useEmail} onChange={(e) => setUseEmail(e.target.checked)} /> <input className="input" style={{ minHeight: 42, padding: "9px 12px", flex: 1 }} placeholder={t("f.email")} value={email} onChange={(e) => { setEmail(e.target.value); setUseEmail(!!e.target.value); }} /></label>
              </>
            )}
          </div>
        </div>
      </div>

      {err && <div className="banner bad">{err}</div>}
      <button className="btn primary big" disabled={busy || photoBlocked} onClick={() => submit()}>
        {busy ? <span className="spin" /> : t("f.submit")}
      </button>

      {picker !== false && (
        <LocationPicker
          start={picker}
          onClose={() => setPicker(false)}
          onConfirm={(l, lm) => {
            setLoc(l);
            setLocSource("map");
            if (lm) setLandmark(lm);
            setPicker(false);
            setMissing((m) => m.filter((x) => x !== "location"));
          }}
        />
      )}

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
            <h2>This is already reported, {similar[0].distance_m} m away</h2>
            <p className="ink2 small">Instead of a new complaint, add your support. More supporters = higher priority for the ward. You&apos;ll get its updates too.</p>
            {similar.slice(0, 1).map((s) => (
              <Link key={s.complaint_id} href={`/citizen/complaints/${s.complaint_id}`} target="_blank" className="card flat tight row-top">
                {photoOf(s) ? <img src={photoOf(s)!} alt="" className="thumb" /> : <span className="thumb"><Ico name="mic" size={20} /></span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bold">{s.category_reported}</div>
                  <div className="small ink2" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</div>
                  <div className="tiny muted">Reported {fmtDate(s.received_at)} · {s.supporters} people support it · {s.status}</div>
                </div>
              </Link>
            ))}
            {!override ? (
              <>
                <button className="btn primary big" disabled={busy} onClick={() => support(similar[0].complaint_id)}>
                  <Ico name="thumbs" /> Yes, same problem. Add my support
                </button>
                <button className="btn block" onClick={() => setOverride(true)}>No, mine is a different problem</button>
                <button className="btn ghost block" onClick={() => setSimilar(null)}>Go back and edit</button>
              </>
            ) : (
              <>
                <div>
                  <label className="fl">What&apos;s different about yours?</label>
                  <textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Mine is on the other side of the road, near the school gate" />
                </div>
                <button className="btn primary big" disabled={busy || photoBlocked || reason.trim().length < 5} onClick={() => submit({ force: true })}>
                  {busy ? <span className="spin" /> : "File my complaint"}
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
