import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import snarkjs from "snarkjs";

const root = process.cwd();
const build = path.join(root, "zkp", "build");
const credentialDir = path.join(root, "zkp", "credentials");
const credentialPath = process.argv[2] || (fs.existsSync(credentialDir)
  ? path.join(credentialDir, fs.readdirSync(credentialDir).find((name) => name.endsWith(".json")) || "")
  : "");
const grothZkey = path.join(build, "LifeInsuranceEligibility_final.zkey");
const plonkZkey = path.join(build, "LifeInsuranceEligibility_plonk.zkey");
const wasm = path.join(build, "LifeInsuranceEligibility_js", "LifeInsuranceEligibility.wasm");
if (!credentialPath || !fs.existsSync(credentialPath) || !fs.existsSync(wasm) || !fs.existsSync(grothZkey) || !fs.existsSync(plonkZkey)) {
  throw new Error("Credential or protocol artifacts missing. Run zkp:setup and issue a credential first.");
}

const credential = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
const claims = credential.claims;
const input = {
  income: claims.income,
  creditScore: claims.creditScore,
  medicalRisk: claims.medicalRisk,
  credentialId: claims.credentialId,
  merkleIndex: String(credential.merkle.index),
  merkleSiblings: credential.merkle.siblings.map(String),
  signatureR8x: credential.signature.R8x,
  signatureR8y: credential.signature.R8y,
  signatureS: credential.signature.S,
  minIncome: claims.income,
  minCreditScore: claims.creditScore,
  maxMedicalRisk: claims.medicalRisk,
  holderAddress: claims.holderAddress,
  policyId: "77",
  policyNonce: "0",
  credentialRoot: credential.merkle.root,
  credentialExpiry: claims.credentialExpiry,
  issuerAx: credential.issuer.Ax,
  issuerAy: credential.issuer.Ay,
};

async function measure(name, protocol, zkey, vkeyPath) {
  const proveStart = performance.now();
  const { proof, publicSignals } = await protocol.fullProve(input, wasm, zkey);
  const provingMs = performance.now() - proveStart;
  const vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf8"));
  const verifyStart = performance.now();
  const valid = await protocol.verify(vkey, publicSignals, proof);
  const verifyingMs = performance.now() - verifyStart;
  if (!valid || publicSignals[0] !== "1") throw new Error(`${name} proof failed local verification.`);
  return {
    protocol: name,
    proofBytes: Buffer.byteLength(JSON.stringify(proof)),
    publicSignalCount: publicSignals.length,
    provingMs: Number(provingMs.toFixed(2)),
    verifyingMs: Number(verifyingMs.toFixed(2)),
    verification: "valid",
  };
}

const results = [
  await measure("Groth16", snarkjs.groth16, grothZkey, path.join(build, "verification_key.json")),
  await measure("PLONK", snarkjs.plonk, plonkZkey, path.join(build, "plonk_verification_key.json")),
];
const report = {
  generatedAt: new Date().toISOString(),
  note: "Single local run for coursework comparison; proving time depends on machine load. Gas is measured separately on a local EVM.",
  results,
};
const jsonPath = path.join(build, "proof-comparison.json");
const markdownPath = path.join(build, "proof-comparison.md");
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownPath, [
  "# Groth16 vs PLONK (local run)",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  "| Protocol | Proof bytes | Public signals | Proving (ms) | Verify (ms) | Result |",
  "|---|---:|---:|---:|---:|---|",
  ...results.map((item) => `| ${item.protocol} | ${item.proofBytes} | ${item.publicSignalCount} | ${item.provingMs} | ${item.verifyingMs} | ${item.verification} |`),
  "",
  report.note,
  "",
].join("\n"));
console.log(fs.readFileSync(markdownPath, "utf8"));
