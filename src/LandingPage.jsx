import React from "react";
import {
  ArrowRight, ArrowUpRight, Check, ChevronRight, Fingerprint,
  LockKeyhole, ShieldCheck, Sparkles, Wallet,
} from "lucide-react";

const steps = [
  { number: "01", title: "Set your policy", text: "Choose eligibility thresholds and connect the wallet that will own your policy." },
  { number: "02", title: "Prove privately", text: "Your browser checks your information locally and creates a zero-knowledge proof." },
  { number: "03", title: "Verify on-chain", text: "A smart contract verifies the proof and records your policy status on-chain." },
];

export default function LandingPage({ onLogin, onRegister }) {
  return (
    <div className="site-shell">
      <header className="site-nav">
        <a className="brand" href="#top" aria-label="InsureChain home">
          <span className="brand-mark"><ShieldCheck size={20} /></span>
          <span><strong className="brand-name">InsureChain</strong><small className="brand-sub">PRIVATE COVER, CLEAR PROOF</small></span>
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a><a href="#privacy">Privacy</a>
        </nav>
        <div className="nav-actions">
          <button className="nav-login" onClick={onLogin}>Log in</button>
          <button className="button button-small button-dark" onClick={onRegister}>Get started <ArrowRight size={15} /></button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow light-eyebrow"><span className="live-dot" /> PRIVATE INSURANCE ON ETHEREUM</div>
            <h1>Get covered.<br /><span>Keep your data yours.</span></h1>
            <p className="hero-description">InsureChain uses zero-knowledge proofs to check policy eligibility without putting your sensitive financial or health details on a public blockchain.</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={onRegister}>Explore your coverage <ArrowRight size={17} /></button>
              <a className="text-link" href="#how-it-works">See how it works <ChevronRight size={16} /></a>
            </div>
            <div className="hero-proof-points">
              <span><Check size={15} /> Proof generated in your browser</span>
              <span><Check size={15} /> Eligibility verified by smart contract</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Illustration of a private eligibility proof being verified">
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
            <div className="float-chip chip-lock"><LockKeyhole size={15} /> PRIVATE DATA</div>
            <div className="float-chip chip-proof"><Fingerprint size={16} /> ZK PROOF <span className="chip-check"><Check size={11} /></span></div>
            <div className="visual-card">
              <div className="visual-card-top"><span className="visual-brand"><ShieldCheck size={17} /></span><span className="verified-label"><i /> VERIFIED</span></div>
              <div className="visual-title">Eligibility check</div>
              <div className="visual-subtitle">Your details stay private</div>
              <div className="visual-check-row"><span className="check-icon"><Check size={14} /></span><span>Income threshold</span><b>PASS</b></div>
              <div className="visual-check-row"><span className="check-icon"><Check size={14} /></span><span>Credit requirement</span><b>PASS</b></div>
              <div className="visual-check-row"><span className="check-icon"><Check size={14} /></span><span>Risk threshold</span><b>PASS</b></div>
              <div className="visual-divider" />
              <div className="proof-signature"><span className="signature-mark"><Fingerprint size={19} /></span><span><b>Groth16 proof</b><small>Verified on-chain</small></span><span className="signature-badge"><Check size={14} /></span></div>
            </div>
            <div className="visual-sparkle sparkle-one"><Sparkles size={18} /></div><div className="visual-sparkle sparkle-two"><Sparkles size={13} /></div>
            <div className="orbit-dot" />
          </div>
        </section>

        <section className="trust-strip" id="privacy">
          <div><span className="strip-icon"><LockKeyhole size={19} /></span><span><b>Your records stay with you</b><small>Proof generation runs locally in your browser.</small></span></div>
          <div><span className="strip-icon"><Fingerprint size={19} /></span><span><b>Only the proof is shared</b><small>Thresholds are public; personal metrics are private.</small></span></div>
          <div><span className="strip-icon"><ShieldCheck size={19} /></span><span><b>Rules verified by code</b><small>Smart contracts check proof and policy conditions.</small></span></div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading"><span className="eyebrow section-eyebrow">A CLEARER WAY TO APPLY</span><h2>From private records to<br />a verified policy.</h2><p>InsureChain connects a familiar onboarding experience with privacy-preserving proof technology.</p></div>
          <div className="process-grid">{steps.map((item, index) => <article className="process-card" key={item.number} style={{ "--card-delay": `${index * 120}ms` }}><span className="process-number">{item.number}</span><span className="process-arrow"><ArrowUpRight size={17} /></span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          <div className="bottom-cta"><div><span className="eyebrow section-eyebrow">START WITH A CLEAR OVERVIEW</span><h2>See what private onboarding feels like.</h2><p>Sign in to explore your dashboard and begin the guided policy flow.</p></div><button className="button button-dark" onClick={onRegister}>Create your account <ArrowRight size={16} /></button></div>
        </section>
      </main>
      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark"><ShieldCheck size={18} /></span><span><strong className="brand-name">InsureChain</strong></span></a><span>Private eligibility. Verifiable outcomes.</span><button className="footer-login" onClick={onLogin}>Account login <ArrowUpRight size={14} /></button></footer>
    </div>
  );
}
