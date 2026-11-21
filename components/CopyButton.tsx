"use client";
import { useState } from "react";
import { Ico } from "./Ico";

export function CopyButton({ text, label, className = "btn block" }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className={className}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); } catch {}
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
    >
      <Ico name={done ? "check" : "copy"} size={18} /> {done ? "Copied" : label}
    </button>
  );
}
