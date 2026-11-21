"use client";
import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { LANGS, detectLang, needsTranslation, type Lang } from "@/lib/lang";
import { tr } from "@/lib/i18n";
import { Ico } from "./Ico";

const Ctx = createContext<Lang>("en");
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
export const useT = () => tr(useContext(Ctx));

export function LangSwitch() {
  const lang = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const cur = LANGS.find((l) => l.code === lang)!;
  return (
    <div className="lang-dd">
      <button className="lang-btn" onClick={() => setOpen(!open)} aria-label="Language / भाषा" aria-expanded={open}>
        <Ico name="globe" size={18} />
        <span>{cur.short}</span>
        <span className="lang-caret"><Ico name="down" size={14} /></span>
      </button>
      {open && (
        <>
          <div className="lang-scrim" onClick={() => setOpen(false)} />
          <div className="lang-menu" role="menu">
            {LANGS.map((l) => (
              <button
                key={l.code}
                role="menuitem"
                className={lang === l.code ? "on" : ""}
                onClick={() => {
                  document.cookie = `rasta_lang=${l.code}; path=/; max-age=31536000`;
                  setOpen(false);
                  router.refresh();
                }}
              >
                <span>{l.label}</span>
                {lang === l.code && <Ico name="check" size={16} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const cache = new Map<string, string>();

// Text with a Twitter-style "Translate" link when it is not in the reader's language.
export function Tx({ text, lang: known, className, as = "p" }: { text: string; lang?: string | null; className?: string; as?: "p" | "span" | "div" }) {
  const ui = useLang();
  const t = tr(ui);
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const Tag = as;
  const need = needsTranslation(text, ui, known);
  const src = known && known !== "unknown" ? known : detectLang(text);

  async function go() {
    const k = `${ui}|${text}`;
    if (cache.has(k)) {
      setOut(cache.get(k)!);
      setShow(true);
      return;
    }
    setBusy(true);
    const r = await fetch("/api/translate", { method: "POST", body: JSON.stringify({ text, to: ui }) }).then((x) => x.json()).catch(() => null);
    setBusy(false);
    if (r?.text) {
      cache.set(k, r.text);
      setOut(r.text);
      setShow(true);
    }
  }

  return (
    <Tag className={className}>
      {show && out ? out : text}
      {need && (
        <span className="tx-link">
          {busy ? (
            <span className="muted">{t("tr.busy")}</span>
          ) : show ? (
            <button className="linkbtn" onClick={() => setShow(false)}>{t("tr.orig")}</button>
          ) : (
            <button className="linkbtn" onClick={go}><Ico name="globe" size={13} /> {t("tr.to")}</button>
          )}
          {show && out && <span className="muted"> · {t("tr.from", { l: src ? t(`lang.${src}`) : "—" })}</span>}
        </span>
      )}
    </Tag>
  );
}
