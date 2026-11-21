"use client";
import { useEffect, useRef, useState } from "react";
import { Ico } from "@/components/Ico";

const SAMPLE = "Kurla station ke bahar LBS Marg pe bahut bada khadda hai, kal raat ek bike wala gir gaya. Bus stop ke saamne hai, please jaldi theek karo.";
// Leave a small margin below Sarvam's 30-second REST limit.
const RECORDING_LIMIT_MS = 29_000;

export function VoiceSheet({ onClose, onResult }: { onClose: () => void; onResult: (r: any, transcript: string) => void }) {
  const [state, setState] = useState<"idle" | "rec" | "busy" | "done">("idle");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const media = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      request.current?.abort();
      if (media.current) {
        media.current.onstop = null;
        if (media.current.state !== "inactive") media.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setErr("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErr("Voice isn't supported in this browser. Type below or use the sample.");
      return;
    }
    setState("busy");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m));
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        if (timer.current) clearTimeout(timer.current);
        stream.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        setState("busy");
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        const controller = new AbortController();
        request.current = controller;
        try {
          const response = await fetch("/api/transcribe", { method: "POST", headers: { "content-type": blob.type }, body: blob, signal: controller.signal });
          const r = await response.json();
          if (!mounted.current) return;
          if (!response.ok || !r.transcript) {
            setErr(r.error || "We didn't catch that. Try again or type below.");
          } else {
            setText(r.transcript);
          }
        } catch {
          if (mounted.current) setErr("Transcription failed. Check your connection and try again, or type below.");
        } finally {
          if (mounted.current) setState("done");
        }
      };
      mr.onerror = () => {
        mr.onstop = null;
        if (timer.current) clearTimeout(timer.current);
        stream.getTracks().forEach((t) => t.stop());
        if (mounted.current) {
          setErr("Recording failed. Try again or type below.");
          setState("done");
        }
      };
      mr.start(250);
      media.current = mr;
      timer.current = setTimeout(() => { if (mr.state === "recording") mr.stop(); }, RECORDING_LIMIT_MS);
      setState("rec");
    } catch {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (mounted.current) {
        setErr("Could not start the microphone. Allow microphone access, or type below.");
        setState("done");
      }
    }
  }

  function stop() {
    if (media.current?.state === "recording") {
      setState("busy");
      media.current.stop();
    }
  }

  async function use() {
    setErr("");
    setState("busy");
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/ai/voice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript: text }), signal: controller.signal });
      const r = await response.json();
      if (!mounted.current) return;
      if (!response.ok || r.error) {
        setErr(r.error || "Could not fill the form. Please try again.");
        setState("done");
        return;
      }
      onResult(r, text);
    } catch {
      if (mounted.current) {
        setErr("Could not fill the form. Check your connection and try again.");
        setState("done");
      }
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
        <div className="between">
          <h2>Tell us what&apos;s wrong</h2>
          <button className="btn ghost sm" onClick={onClose}><Ico name="x" /></button>
        </div>
        <p className="small ink2">Speak in your language — Gujarati, Marathi, Telugu, Hindi, English and more. We detect it automatically.</p>
        <div style={{ display: "grid", placeItems: "center", padding: "10px 0" }}>
          <button
            onClick={state === "rec" ? stop : start}
            disabled={state === "busy"}
            aria-label={state === "rec" ? "Stop recording" : "Start recording"}
            style={{
              width: 92, height: 92, borderRadius: "50%", border: "none", cursor: "pointer", display: "grid", placeItems: "center",
              background: state === "rec" ? "var(--red)" : "var(--accent)", color: "#fff",
              boxShadow: state === "rec" ? "0 0 0 10px var(--red-soft)" : "0 0 0 10px var(--accent-soft)",
            }}
          >
            {state === "busy" ? <span className="spin" /> : <Ico name={state === "rec" ? "stop" : "mic"} size={36} />}
          </button>
          <p className="small muted" style={{ marginTop: 14 }}>{state === "rec" ? "Listening… tap to stop (stops automatically at 29 seconds)" : state === "busy" ? "Working…" : "Tap to speak · up to 29 seconds"}</p>
        </div>
        <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} disabled={state === "busy" || state === "rec"} placeholder="Your words appear here. You can also type." />
        {err && <div className="banner warn small">{err}</div>}
        <button className="btn primary big" disabled={!text.trim() || state === "busy" || state === "rec"} onClick={use}>
          {state === "busy" ? <span className="spin" /> : <><Ico name="sparkles" /> Fill the form</>}
        </button>
        <button className="linkbtn small" disabled={state === "busy" || state === "rec"} onClick={() => { setText(SAMPLE); setState("done"); setErr(""); }}>Use a sample voice note (Hinglish)</button>
      </div>
    </div>
  );
}
