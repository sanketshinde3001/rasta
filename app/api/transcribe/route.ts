import { NextResponse } from "next/server";

// Voice -> text with Deepgram. The client says which language was spoken:
//   en: nova-3 "multi" (handles English mixed with Hindi, i.e. Hinglish)
//   hi: nova-2 Hindi
//   mr: Deepgram has no Marathi model, so the browser's own recogniser (mr-IN) is used instead (see VoiceSheet)
export async function GET() {
  return NextResponse.json({ deepgram: !!process.env.DEEPGRAM_API_KEY, langs: ["en", "hi"] });
}

export const maxDuration = 60;

export async function POST(req: Request) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return NextResponse.json({ error: "Deepgram key not set" }, { status: 501 });
  const lang = new URL(req.url).searchParams.get("lang") || "en";
  const qs = lang === "hi" ? "model=nova-2&language=hi&smart_format=true" : "model=nova-3&language=multi&smart_format=true";
  const audio = await req.arrayBuffer();
  if (audio.byteLength < 2000) return NextResponse.json({ error: "Recording was too short. Hold the button and speak for a few seconds." }, { status: 400 });
  const type = (req.headers.get("content-type") || "audio/webm").split(";")[0];
  const r = await fetch(`https://api.deepgram.com/v1/listen?${qs}`, {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": type },
    body: audio,
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    return NextResponse.json({ error: `Deepgram error ${r.status}: ${msg.slice(0, 160)}` }, { status: 502 });
  }
  const j = await r.json();
  const alt = j?.results?.channels?.[0]?.alternatives?.[0];
  return NextResponse.json({ transcript: (alt?.transcript || "").trim(), confidence: alt?.confidence ?? null });
}
