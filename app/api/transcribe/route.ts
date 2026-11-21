import { NextResponse } from "next/server";

export const maxDuration = 60;

// Sarvam detects the language, including code-mixed speech, from the audio.
export async function GET() {
  return NextResponse.json({ sarvam: !!process.env.SARVAM_API_KEY });
}

export async function POST(req: Request) {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return NextResponse.json({ error: "Sarvam key not set. Add SARVAM_API_KEY to .env.local." }, { status: 501 });
  const audio = await req.arrayBuffer();
  if (audio.byteLength < 2000) return NextResponse.json({ error: "Recording was too short. Tap the microphone and speak for a few seconds." }, { status: 400 });
  const type = (req.headers.get("content-type") || "audio/webm").split(";")[0].trim();
  const extensions: Record<string, string> = {
    "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg",
    "audio/wav": "wav", "audio/x-wav": "wav", "audio/mpeg": "mp3",
  };
  const extension = extensions[type];
  if (!extension) return NextResponse.json({ error: "Unsupported audio format. Try another browser." }, { status: 415 });
  const body = new FormData();
  body.append("file", new Blob([audio], { type }), `recording.${extension}`);
  body.append("model", "saaras:v4");
  body.append("language_code", "unknown");
  body.append("mode", "codemix");

  try {
    const r = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": key },
      body,
      signal: AbortSignal.timeout(50_000),
    });
    if (!r.ok) {
      const error = r.status === 401 || r.status === 403
        ? "Sarvam could not authenticate. Check the API key."
        : r.status === 402 || r.status === 429
          ? "Sarvam's usage limit was reached. Check credits or try again shortly."
          : "Sarvam could not transcribe this recording. Try a shorter recording or type below.";
      return NextResponse.json({ error }, { status: 502 });
    }
    const j = await r.json();
    if (typeof j.transcript !== "string") throw new Error("Invalid transcription response");
    return NextResponse.json({ transcript: j.transcript.trim(), language: j.language_code ?? null });
  } catch {
    return NextResponse.json({ error: "Could not reach Sarvam or read its response. Please try again or type below." }, { status: 502 });
  }
}
