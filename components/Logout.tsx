"use client";
import { Ico } from "./Ico";

export function Logout() {
  return (
    <button
      className="btn ghost sm"
      title="Log out"
      onClick={async () => {
        await fetch("/api/auth", { method: "DELETE" });
        location.href = "/";
      }}
    >
      <Ico name="logout" size={18} />
    </button>
  );
}
