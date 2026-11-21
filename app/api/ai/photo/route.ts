import { NextResponse } from "next/server";
import { getLang } from "@/lib/serverLang";
import { analyzePhoto } from "@/lib/ai";
import { savePhoto } from "@/lib/photos";
import { hydrate, recordPhotoReview, flush } from "@/lib/store";
import { isAcceptedPhoto, PHOTO_UNRELATED, PHOTO_UNVERIFIED } from "@/lib/photo-validation";

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
    await hydrate();
    recordPhotoReview(saved.url, ai);
    await flush();
    if (!isAcceptedPhoto(ai)) return NextResponse.json({ photo: saved.url, ai, error: PHOTO_UNRELATED }, { status: 422 });
    return NextResponse.json({ photo: saved.url, ai });
  } catch {
    return NextResponse.json({ photo: saved.url, ai: null, error: PHOTO_UNVERIFIED }, { status: 503 });
  }
}
