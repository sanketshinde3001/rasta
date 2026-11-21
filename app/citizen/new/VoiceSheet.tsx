"use client";
import { useEffect, useRef, useState } from "react";
import { Ico } from "@/components/Ico";

const LANGS = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिंदी" },
  { code: "mr-IN", label: "मराठी" },
];
const SAMPLE = "Kurla station ke bahar LBS Marg pe bahut bada khadda hai, kal raat ek bike wala gir gaya. Bus stop ke saamne hai, please jaldi theek karo.";

// Voice complaint: Deepgram if the server has a key, otherwise the browser's speech recognition.
export function VoiceSheet({ onClose, onResult }: { onClose: () => void; onResult: (r: any, transcript: string) => void }) {
  const [lang, setLang] = useState("hi-IN");
  const [state, setState] = useState<"idle" | "rec" | "busy" | "done">("idle");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [deepgram, setDeepgram] = useState(false);
  const rec = useRef<any>(null);
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    fetch("/api/transcribe").then((r) => r.json()).then((j) => setDeepgram(j.deepgram)).catch(() => {});
    return () => { rec.current?.stop?.(); media.current?.state === "recording" && media.current.stop(); };
  }, []);

  async function start() {
    setErr("");
    setText("");
    if (deepgram) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        chunks.current = [];
        mr.ondataavailable = (e) => chunks.current.push(e.data);
        mr.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          setState("busy");
          const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
          const r = await fetch("/api/transcribe", { method: "POST", headers: { "content-type": blob.type }, body: blob }).then((r) => r.json());
          setText(r.transcript || "");
          if (!r.transcript) setErr(r.error || "We didn't catch that. Try again or type below.");
          setState("done");
        };
        mr.start();
        media.current = mr;
        setState("rec");
      } catch {
        setErr("Microphone is blocked. Allow it in the browser, or type below.");
      }
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setErr("Voice isn't supported in this browser. Type below or use the sample.");
      setState("done");
      return;
    }
    const r = new SR();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = true;
    let finalText = "";
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setText((finalText + interim).trim());
    };
    r.onerror = (e: any) => {
      setErr(e.error === "not-allowed" ? "Microphone is blocked. Allow it, or type below." : "Voice stopped. Type below or try again.");
      setState("done");
    };
    r.onend = () => setState((s) => (s === "rec" ? "done" : s));
    r.start();
    rec.current = r;
    setState("rec");
  }

  function stop() {
    if (media.current?.state === "recording") media.current.stop();
    rec.current?.stop();
    if (!deepgram) setState("done");
  }

  async function use() {
    setState("busy");
    const r = await fetch("/api/ai/voice", { method: "POST", body: JSON.stringify({ transcript: text }) }).then((r) => r.json());
    if (r.error) {
      setErr(r.error);
      setState("done");
      return;
    }
    onResult(r, text);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
        <div className="between">
          <h2>Tell us what&apos;s wrong</h2>
          <button className="btn ghost sm" onClick={onClose}><Ico name="x" /></button>
        </div>
        <p className="small ink2">Speak in any language. AI fills the form for you.</p>
        {!deepgram && (
          <div className="seg">
            {LANGS.map((l) => <button key={l.code} className={lang === l.code ? "on" : ""} onClick={() => setLang(l.code)}>{l.label}</button>)}
          </div>
        )}
        <div style={{ display: "grid", placeItems: "center", padding: "10px 0" }}>
          <button
            onClick={state === "rec" ? stop : start}
            disabled={state === "busy"}
            style={{
              width: 92, height: 92, borderRadius: "50%", border: "none", cursor: "pointer", display: "grid", placeItems: "center",
              background: state === "rec" ? "var(--red)" : "var(--accent)", color: "#fff",
              boxShadow: state === "rec" ? "0 0 0 10px var(--red-soft)" : "0 0 0 10px var(--accent-soft)",
            }}
          >
            {state === "busy" ? <span className="spin" /> : <Ico name={state === "rec" ? "stop" : "mic"} size={36} />}
          </button>
          <p className="small muted" style={{ marginTop: 14 }}>{state === "rec" ? "Listening… tap to stop" : state === "busy" ? "Working…" : "Tap to speak"}</p>
        </div>
        <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your words appear here. You can also type." />
        {err && <div className="banner warn small">{err}</div>}
        <button className="btn primary big" disabled={!text.trim() || state === "busy" || state === "rec"} onClick={use}>
          {state === "busy" ? <span className="spin" /> : <><Ico name="sparkles" /> Fill the form</>}
        </button>
        <button className="linkbtn small" onClick={() => { setText(SAMPLE); setState("done"); setErr(""); }}>Use a sample voice note (Hinglish)</button>
      </div>
    </div>
  );
}
