import { NextResponse } from "next/server";

// Voice -> text with Deepgram (free tier). Without a key the browser's speech recognition is used instead.
export async function GET() {
  return NextResponse.json({ deepgram: !!process.env.DEEPGRAM_API_KEY });
}

export async function POST(req: Request) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return NextResponse.json({ error: "Deepgram key not set" }, { status: 501 });
  const audio = await req.arrayBuffer();
  const r = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&detect_language=true", {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": req.headers.get("content-type") || "audio/webm" },
    body: audio,
  });
  if (!r.ok) return NextResponse.json({ error: `Deepgram error ${r.status}` }, { status: 502 });
  const j = await r.json();
  const alt = j?.results?.channels?.[0]?.alternatives?.[0];
  return NextResponse.json({ transcript: alt?.transcript || "", language: j?.results?.channels?.[0]?.detected_language || "" });
}
