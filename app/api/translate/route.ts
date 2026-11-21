import { NextResponse } from "next/server";
import { translate } from "@/lib/ai";

const memo = new Map<string, string>();

export async function POST(req: Request) {
  const { text, to } = await req.json();
  const lang = to === "hi" || to === "mr" ? to : "en";
  if (!text?.trim()) return NextResponse.json({ text: "" });
  const k = `${lang}|${text}`;
  if (memo.has(k)) return NextResponse.json({ text: memo.get(k) });
  try {
    const out = await translate(String(text).slice(0, 4000), lang);
    memo.set(k, out);
    return NextResponse.json({ text: out });
  } catch {
    return NextResponse.json({ error: "Translation failed" }, { status: 502 });
  }
}
