import React, { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Fingerprint, ShieldCheck } from "lucide-react";

export default function Login({ setView, onLoginSuccess, onHome }) {
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("http://localhost:3000/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aadhaarNumber, dob }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid credentials");
      localStorage.setItem("authToken", data.token); onLoginSuccess();
    } catch (err) { setError(err.message || "Unable to reach authentication server"); }
    finally { setBusy(false); }
  };

  return <div className="auth-page"><button className="auth-back" onClick={onHome}><ArrowLeft size={15}/> Back to home</button><section className="auth-card"><div className="auth-card-mark"><ShieldCheck size={23}/></div><span className="eyebrow section-eyebrow">WELCOME BACK</span><h1>Sign in to InsureChain</h1><p className="auth-intro">Continue to your private policy onboarding dashboard.</p><form onSubmit={handleLogin}>
    <label className="field-label">Aadhaar number<input className="form-input" type="text" inputMode="numeric" maxLength="12" pattern="\d{12}" placeholder="Enter your 12-digit number" value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, ""))} required /></label>
    <label className="field-label">Date of birth<span className="input-with-icon"><CalendarDays size={16}/><input className="form-input" type="date" value={dob} onChange={e => setDob(e.target.value)} required /></span></label>
    {error && <div className="form-error">{error}</div>}
    <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}<ArrowRight size={16}/></button>
  </form><div className="auth-switch">New to InsureChain? <button onClick={() => setView("register")}>Create account</button></div><div className="auth-privacy"><Fingerprint size={16}/> Your policy metrics stay separate from account sign-in.</div></section></div>;
}
