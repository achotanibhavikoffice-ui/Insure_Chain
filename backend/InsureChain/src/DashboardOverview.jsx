import React from "react";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, ChevronRight, CircleHelp, FileCheck2,
  Fingerprint, LockKeyhole, ShieldCheck, Sparkles, Wallet,
} from "lucide-react";
import { INSURANCE_PROVIDERS } from "./providers";

const journey = [
  [Wallet, "Connect a wallet", "Choose the wallet that will hold your policy."],
  [LockKeyhole, "Enter your details privately", "Your eligibility inputs are processed on your device."],
  [Fingerprint, "Generate your proof", "Create a cryptographic proof without exposing the inputs."],
  [BadgeCheck, "Verify your policy", "Submit the proof for smart-contract verification."],
];

export default function DashboardOverview({ account, wrongNetwork, networkError, onSwitchNetwork, onStart, onLogout, userPolicies = [], policiesLoading = false, policiesError = "" }) {
  const shortened = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Wallet connected";
  return (
    <div className="dashboard-shell overview-shell">
      <header className="dashboard-topbar overview-topbar">
        <a className="brand" href="#overview"><span className="brand-mark"><ShieldCheck size={20} /></span><span><strong className="brand-name">InsureChain</strong><small className="brand-sub">MEMBER DASHBOARD</small></span></a>
        <div className="overview-nav"><span className="wallet-pill"><Wallet size={15} />{shortened}</span><button className="button button-outline button-small" onClick={onLogout}>Log out</button></div>
      </header>
      <main className="overview-content" id="overview">
        <div className="overview-welcome"><div><span className="eyebrow section-eyebrow">YOUR INSURECHAIN OVERVIEW</span><h1>Good to have you here.</h1><p>Understand how your application works, what stays private, and what happens next.</p></div><div className="overview-status"><span className="status-pulse" /> ACCOUNT READY</div></div>

        {wrongNetwork && <div className="network-warning overview-network-warning" role="alert"><div><strong>MetaMask is connected to a different network</strong><span>Switch to the local InsureChain network before sending a transaction.</span>{networkError && <span className="network-error-text">{networkError}</span>}</div><button className="button button-primary button-small" onClick={onSwitchNetwork}>Switch network <ArrowRight size={14}/></button></div>}

        <section className="my-policies-section" aria-labelledby="my-policies-title">
          <div className="my-policies-heading"><div><span className="eyebrow section-eyebrow">YOUR WALLET RECORDS</span><h2 id="my-policies-title">My InsureChain policy records</h2><p>Eligibility records and their on-chain status for this connected wallet.</p></div><span className="provider-count">{userPolicies.length} {userPolicies.length === 1 ? "RECORD" : "RECORDS"}</span></div>
          {policiesLoading ? <div className="my-policies-empty">Loading policy records from the local network…</div> : policiesError ? <div className="my-policies-empty policy-load-error">{policiesError}</div> : userPolicies.length ? <div className="my-policies-grid">{userPolicies.map((policy) => <article className="owned-policy-card" key={policy.id}>
            <div className="owned-policy-top"><span className="provider-monogram" style={{ "--provider-accent": policy.accent || "#526aca", "--provider-soft": policy.soft || "#eff2ff" }}>{policy.initials || "ZKP"}</span><span className={`owned-policy-status status-${policy.status.toLowerCase()}`}>{policy.status}</span></div>
            <h3>{policy.providerName}</h3><span className="owned-policy-plan-label">DEMO PLAN SELECTED</span><strong>{policy.planName}</strong><p>InsureChain policy #{policy.id}{policy.createdAt ? ` · Created ${new Date(policy.createdAt * 1000).toLocaleDateString()}` : ""}</p>
            <div className="owned-policy-thresholds"><span>Income ≥ {policy.minIncome}</span><span>Credit ≥ {policy.minCreditScore}</span><span>Medical risk ≤ {policy.maxMedicalRisk}</span></div>
            <details className="policy-terms-details">
              <summary>{policy.termsAcceptedAt ? `Plan terms accepted ${new Date(policy.termsAcceptedAt).toLocaleString()}` : "Terms acceptance not recorded"}</summary>
              {policy.acceptedTerms?.length ? <ul>{policy.acceptedTerms.map((term, index) => <li key={`${policy.id}-term-${index}`}>{term}</li>)}</ul> : <p>No terms acknowledgement is saved for this policy record.</p>}
              {policy.termsVersion && <small>Terms version: {policy.termsVersion}</small>}
              {policy.termsSourceUrl && <a href={policy.termsSourceUrl} target="_blank" rel="noreferrer">Open insurer’s official terms source <ArrowUpRight size={13}/></a>}
            </details>
          </article>)}</div> : <div className="my-policies-empty"><div><strong>No policy records yet</strong><span>Choose a provider and featured plan to start an eligibility demo. Your on-chain record will appear here.</span></div><button className="button button-primary button-small" onClick={() => onStart()}>Choose a plan <ArrowRight size={14}/></button></div>}
          <p className="my-policies-disclaimer">These are on-chain eligibility demo records. InsureChain does not purchase, issue, or bind insurance coverage with the listed insurers.</p>
        </section>

        <section className="overview-hero-card">
          <div className="overview-hero-copy"><span className="overview-tag"><Sparkles size={14} /> PRIVACY FIRST ONBOARDING</span><h2>Life insurance eligibility,<br /><em>without exposing your records.</em></h2><p>InsureChain lets you prove that your information meets a policy’s requirements. Your browser creates the proof, and a smart contract checks it.</p><button className="button button-primary" onClick={() => onStart()}>Start policy onboarding <ArrowRight size={17} /></button></div>
          <div className="overview-hero-art"><div className="overview-art-ring ring-a"/><div className="overview-art-ring ring-b"/><div className="overview-shield"><ShieldCheck size={49}/></div><div className="art-pill art-private"><LockKeyhole size={14}/> PRIVATE INPUT</div><div className="art-pill art-verified"><BadgeCheck size={15}/> PROOF VERIFIED</div></div>
        </section>

        <section className="provider-section" id="providers">
          <div className="provider-heading"><div><span className="eyebrow section-eyebrow">LIFE INSURANCE DIRECTORY</span><h2>Explore providers and plans</h2><p>Compare life cover options, then visit the insurer for current details and purchase.</p></div><span className="provider-count">{INSURANCE_PROVIDERS.length} PROVIDERS</span></div>
          <div className="provider-grid">{INSURANCE_PROVIDERS.map((provider, index) => <article className={`provider-card provider-${provider.id}`} key={provider.name} style={{ "--provider-accent": provider.accent, "--provider-soft": provider.soft, "--provider-delay": `${index * 90}ms` }}>
            <div className="provider-card-top"><span className="provider-monogram">{provider.initials}</span><span className="provider-type"><span/> LIFE COVER</span></div>
            <h3>{provider.name}</h3><div className="provider-divider"/><span className="provider-plan-label">FEATURED TERM PLAN</span><strong className="provider-plan">{provider.plan}</strong>
            <p>View current coverage options, eligibility, and terms on the insurer’s official website.</p>
            <div className="provider-actions"><a className="provider-visit" href={provider.href} target="_blank" rel="noreferrer">Visit provider <ArrowUpRight size={14}/></a><button className="provider-demo" onClick={() => onStart(provider.id)}>Try eligibility demo <ArrowRight size={14}/></button></div>
          </article>)}</div>
          <div className="provider-disclaimer"><ShieldCheck size={15}/><span>Provider links lead to their official websites. InsureChain is not affiliated with these providers and does not sell policies or provide live quotes. The eligibility demo below is a prototype, not an application for insurance.</span></div>
        </section>

        <section className="overview-section-heading"><div><span className="eyebrow section-eyebrow">THE JOURNEY</span><h2>Four steps to a verified policy</h2></div><button className="overview-text-button" onClick={() => onStart()}>Begin now <ChevronRight size={15}/></button></section>
        <section className="journey-grid">{journey.map(([Icon, title, text], index) => <article className="journey-card" key={title}><div className="journey-card-top"><span className="journey-icon"><Icon size={19}/></span><span className="journey-index">0{index + 1}</span></div><h3>{title}</h3><p>{text}</p>{index < journey.length - 1 && <span className="journey-connector"><ChevronRight size={14}/></span>}</article>)}</section>

        <section className="overview-details-grid">
          <article className="overview-info-card"><span className="info-icon mint"><LockKeyhole size={19}/></span><div><h3>What stays private?</h3><p>Your income, credit score, and medical risk inputs are used to generate a proof in your browser. The proof demonstrates that they meet the thresholds without revealing the values themselves.</p></div></article>
          <article className="overview-info-card"><span className="info-icon blue"><FileCheck2 size={19}/></span><div><h3>What is recorded?</h3><p>The policy thresholds, proof verification result, wallet address, and transaction details are recorded by the smart contract. Blockchain activity is public.</p></div></article>
          <article className="overview-help-card"><div className="help-title"><span className="info-icon lavender"><CircleHelp size={19}/></span><span><small>NEED A QUICK RECAP?</small><h3>How the proof works</h3></span></div><p>A zero-knowledge proof lets the contract verify a statement about your data while keeping the underlying values out of the transaction.</p><button type="button" onClick={() => onStart()}>Explore the guided flow <ArrowRight size={15}/></button></article>
        </section>
        <div className="overview-footnote"><ShieldCheck size={15}/><span>InsureChain is a demonstration of privacy-preserving policy onboarding. It does not provide an insurance quote or bind coverage.</span></div>
      </main>
      <footer className="overview-footer"><span>INSURECHAIN · PRIVATE COVER, CLEAR PROOF</span><button onClick={onLogout}>Sign out</button></footer>
    </div>
  );
}
