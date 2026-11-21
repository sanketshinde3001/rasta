import { NextResponse } from "next/server";
import { formFromSpeech, offlineClassify } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { transcript } = await req.json();
  if (!transcript?.trim()) return NextResponse.json({ error: "We didn't catch that. Try again." }, { status: 400 });
  try {
    return NextResponse.json(await formFromSpeech(transcript));
  } catch {
    return NextResponse.json({ ...offlineClassify(transcript), landmark: "", language: "", by: "offline" });
  }
}
