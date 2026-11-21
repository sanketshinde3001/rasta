import { NextResponse } from "next/server";
import { getLang } from "@/lib/serverLang";
import { analyzePhoto } from "@/lib/ai";
import { savePhoto } from "@/lib/photos";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { image, hint } = await req.json();
  let saved;
  try {
    saved = await savePhoto(image);
  } catch {
    return NextResponse.json({ error: "Please upload a JPG or PNG photo." }, { status: 400 });
  }
  try {
    const ai = await analyzePhoto(saved.data, saved.type, hint || "", await getLang());
    return NextResponse.json({ photo: saved.url, ai });
  } catch (e: any) {
    return NextResponse.json({ photo: saved.url, ai: null, error: `AI could not read the photo (${e?.status || e?.name || "error"}). Please fill the form yourself.` });
  }
}
