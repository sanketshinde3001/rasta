"use client";
import { useState } from "react";
import { Ico } from "./Ico";

export function SupportButton({ id, supporters, already }: { id: string; supporters: number; already: boolean }) {
  const [n, setN] = useState(supporters);
  const [on, setOn] = useState(already);
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`btn block ${on ? "" : "primary"}`}
      disabled={on || busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch(`/api/complaints/${id}/support`, { method: "POST" });
        if (r.status === 401) { location.href = "/login?role=citizen"; return; }
        const j = await r.json();
        setN(j.supporters); setOn(true); setBusy(false);
      }}
    >
      <Ico name={on ? "check" : "thumbs"} size={18} /> {on ? `You support this · ${n}` : `I face this too · ${n}`}
    </button>
  );
}
