import { NextResponse } from "next/server";
import { roadFacts } from "@/lib/kundli";
import { roadVerdict } from "@/lib/ai";
import { getLang } from "@/lib/serverLang";
import { getVerdict, setVerdict } from "@/lib/store";

export const maxDuration = 60;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const lang = await getLang();
  const k = `${id}|${lang}`;
  const cached = getVerdict(k);
  if (cached) return NextResponse.json({ text: cached });
  const f = roadFacts(id);
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const text = await roadVerdict(f.summary, lang);
    if (text) setVerdict(k, text);
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: "" });
  }
}
