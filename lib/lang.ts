// Language helpers shared by client and server: UI language, detection, labels.
export type Lang = "en" | "hi" | "mr";
export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिंदी", short: "हिं" },
  { code: "mr", label: "मराठी", short: "मरा" },
];
export const LANG_NAME: Record<string, string> = { en: "English", hi: "Hindi", mr: "Marathi", "hi-en": "Hinglish" };

const MR = /(आहे|नाही|झाला|झाली|कधी|रस्त्या|खड्डा|खड्डे|पाणी|साचले|च्या|मध्ये|आणि|करा|लवकर|झाकण)/;
const HI = /(है|हैं|नहीं|में|पर|गड्ढा|गड्ढे|पानी|भरा|सड़क|का|की|को|कृपया|जल्दी|ढक्कन)/;
const HINGLISH = /\b(hai|hain|nahi|nahin|mein|pe|par|paani|pani|khadda|gadda|gaya|gayi|kab|bhar|bahut|kar|karo|ke|ki|ka|ho|raha|rahi|yahan|wala|jaldi|sadak)\b/gi;

// Best-effort language detection for short civic texts. Returns en | hi | mr | hi-en.
export function detectLang(text: string): string {
  const t = text || "";
  const deva = (t.match(/[ऀ-ॿ]/g) || []).length;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  if (deva > latin) {
    const m = (t.match(new RegExp(MR, "g")) || []).length;
    const h = (t.match(new RegExp(HI, "g")) || []).length;
    return m > h ? "mr" : "hi";
  }
  const hits = (t.match(HINGLISH) || []).length;
  const words = t.split(/\s+/).length || 1;
  return hits >= 2 && hits / words > 0.12 ? "hi-en" : "en";
}

// Does this text need a translate button for a reader of `ui`?
export function needsTranslation(text: string, ui: Lang, known?: string | null): boolean {
  if (!text || text.trim().length < 6) return false;
  const l = known && known !== "unknown" ? known : detectLang(text);
  if (l === "hi-en") return true; // Hinglish: offer a clean version in any UI language
  return l !== ui;
}
