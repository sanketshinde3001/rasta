"use client";
import { useEffect, useState } from "react";
import { Ico } from "@/components/Ico";
import { useLang } from "@/components/I18n";

export function Verdict({ id }: { id: string }) {
  const lang = useLang();
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    setT(null);
    fetch(`/api/roads/${id}/verdict`).then((r) => r.json()).then((j) => setT(j.text || ""));
  }, [id, lang]);
  if (t === "") return null;
  return (
    <div className="banner info">
      <Ico name="sparkles" size={18} />
      <div>{t === null ? <span className="row" style={{ gap: 8 }}><span className="spin" /> Reading this road&apos;s history…</span> : <b style={{ fontWeight: 560 }}>{t}</b>}</div>
    </div>
  );
}
