import React, { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";

export default function Register({ setView, onHome }) {
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      const response = await fetch("http://localhost:3000/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aadhaarNumber, dob }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed");
      setSuccess("Your account is ready. Sign in to continue.");
    } catch (err) { setError(err.message || "Unable to reach authentication server"); }
    finally { setBusy(false); }
  };

  return <div className="auth-page"><button className="auth-back" onClick={onHome}><ArrowLeft size={15}/> Back to home</button><section className="auth-card"><div className="auth-card-mark"><ShieldCheck size={23}/></div><span className="eyebrow section-eyebrow">GET STARTED</span><h1>Create your account</h1><p className="auth-intro">Set up your InsureChain account, then explore your policy dashboard.</p><form onSubmit={handleRegister}>
    <label className="field-label">Aadhaar number<input className="form-input" type="text" inputMode="numeric" maxLength="12" pattern="\d{12}" title="Enter exactly 12 digits" placeholder="Enter your 12-digit number" value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, ""))} required /></label>
    <label className="field-label">Date of birth<span className="input-with-icon"><CalendarDays size={16}/><input className="form-input" type="date" value={dob} onChange={e => setDob(e.target.value)} required /></span></label>
    {error && <div className="form-error">{error}</div>}{success && <div className="form-success">{success}</div>}
    <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}<ArrowRight size={16}/></button>
  </form><div className="auth-switch">Already registered? <button onClick={() => setView("login")}>Sign in</button></div><div className="auth-privacy"><ShieldCheck size={16}/> Your date of birth is stored as a one-way password hash.</div></section></div>;
}
