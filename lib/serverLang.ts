import "server-only";
import { cookies } from "next/headers";
import type { Lang } from "./lang";
import { tr } from "./i18n";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("rasta_lang")?.value;
  return v === "hi" || v === "mr" ? v : "en";
}
export async function getT() {
  const lang = await getLang();
  return { lang, t: tr(lang) };
}
