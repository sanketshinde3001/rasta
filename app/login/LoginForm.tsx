"use client";
import { useState } from "react";
import Link from "next/link";
import { Ico } from "@/components/Ico";

export function LoginForm({ role, wards }: { role: "citizen" | "officer"; wards: { code: string; name: string }[] }) {
  const [step, setStep] = useState<"id" | "otp">("id");
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("98200 12345");
  const [otp, setOtp] = useState("");
  const [emp, setEmp] = useState("AE-L-0412");
  const [pass, setPass] = useState("demo-pass");
  const [ward, setWard] = useState("L");

  async function login() {
    setBusy(true);
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, phone, employee_id: emp, ward }),
    }).then((r) => r.json());
    location.href = r.next;
  }

  return (
    <main className="wrap" style={{ paddingTop: 40, maxWidth: 440 }}>
      <Link href="/" className="back"><Ico name="back" size={18} /> Back</Link>
      <span className="tile-ico" style={{ width: 52, height: 52, marginBottom: 18 }}>
        <Ico name={role === "officer" ? "building" : "users"} size={26} />
      </span>
      <h1>{role === "officer" ? "Ward officer login" : "Log in with your phone"}</h1>
      <p className="ink2" style={{ marginTop: 6 }}>
        {role === "officer" ? "Use your BMC employee ID." : "We'll send a one-time code by SMS."}
      </p>

      <div className="stack" style={{ marginTop: 26 }}>
        {role === "citizen" ? (
          step === "id" ? (
            <>
              <div>
                <label className="fl">Mobile number</label>
                <div className="row">
                  <span className="input" style={{ width: 70, flex: "none", display: "grid", placeItems: "center" }}>+91</span>
                  <input className="input num" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
                </div>
              </div>
              <button className="btn primary big" onClick={() => { setStep("otp"); setOtp("123456"); }}>Send code</button>
            </>
          ) : (
            <>
              <div>
                <label className="fl">Enter the 6-digit code sent to +91 {phone}</label>
                <input className="input num" style={{ letterSpacing: 6, fontSize: 20 }} value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} inputMode="numeric" />
              </div>
              <button className="btn primary big" disabled={busy || otp.length < 4} onClick={login}>
                {busy ? <span className="spin" /> : "Verify and continue"}
              </button>
            </>
          )
        ) : (
          <>
            <div>
              <label className="fl">Employee ID</label>
              <input className="input" value={emp} onChange={(e) => setEmp(e.target.value)} />
            </div>
            <div>
              <label className="fl">Password</label>
              <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </div>
            <div>
              <label className="fl">Your ward</label>
              <select className="input" value={ward} onChange={(e) => setWard(e.target.value)}>
                {wards.map((w) => <option key={w.code} value={w.code}>Ward {w.code} · {w.name}</option>)}
              </select>
            </div>
            <button className="btn primary big" disabled={busy} onClick={login}>
              {busy ? <span className="spin" /> : "Log in"}
            </button>
          </>
        )}
        <p className="tiny muted row" style={{ gap: 6 }}><Ico name="info" size={14} /> Demo login. Details are pre-filled; nothing is checked.</p>
      </div>
    </main>
  );
}
