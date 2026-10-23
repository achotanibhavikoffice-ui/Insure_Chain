import fs from "node:fs";
import path from "node:path";
import snarkjs from "snarkjs";

const root = process.cwd();
const build = path.join(root, "zkp", "build");
const wasm = path.join(build, "LifeInsuranceEligibility_js", "LifeInsuranceEligibility.wasm");
const zkey = path.join(build, "LifeInsuranceEligibility_final.zkey");
const vkey = JSON.parse(fs.readFileSync(path.join(build, "verification_key.json"), "utf8"));
const credentialDir = path.join(root, "zkp", "credentials");
const defaultCredential = fs.existsSync(credentialDir) ? fs.readdirSync(credentialDir).find((name) => name.endsWith(".json")) : null;
const credentialPath = process.argv[2] || (defaultCredential ? path.join(credentialDir, defaultCredential) : "");
if (!fs.existsSync(wasm) || !fs.existsSync(zkey) || !fs.existsSync(credentialPath)) {
  throw new Error("Circuit artifacts or credential missing. Run zkp:setup and issue a credential first.");
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

const valid = await snarkjs.groth16.fullProve(input, wasm, zkey);
if (valid.publicSignals.length !== 12 || valid.publicSignals[0] !== "1") throw new Error("Eligible boundary case did not output the expected 12 signals.");
if (!(await snarkjs.groth16.verify(vkey, valid.publicSignals, valid.proof))) throw new Error("Valid proof did not verify.");
console.log("PASS eligible boundary values and valid issuer/Merkle proofs");

const tamperedSignals = [...valid.publicSignals];
tamperedSignals[5] = (BigInt(tamperedSignals[5]) + 1n).toString();
if (await snarkjs.groth16.verify(vkey, tamperedSignals, valid.proof)) throw new Error("A proof verified after its wallet public signal was changed.");
console.log("PASS public-signal tampering is rejected");

const ineligible = await snarkjs.groth16.fullProve({ ...input, minIncome: (BigInt(claims.income) + 1n).toString() }, wasm, zkey);
if (ineligible.publicSignals[0] !== "0" || !(await snarkjs.groth16.verify(vkey, ineligible.publicSignals, ineligible.proof))) {
  throw new Error("An ineligible credential did not produce a valid proof of eligible=0.");
}
console.log("PASS threshold boundary proves ineligible=0");

for (const [label, changed] of [
  ["issuer signature", { ...input, signatureS: (BigInt(input.signatureS) + 1n).toString() }],
  ["registry Merkle path", { ...input, merkleSiblings: [(BigInt(input.merkleSiblings[0]) + 1n).toString(), ...input.merkleSiblings.slice(1)] }],
  ["wallet binding", { ...input, holderAddress: (BigInt(input.holderAddress) + 1n).toString() }],
]) {
  let rejected = false;
  try { await snarkjs.groth16.fullProve(changed, wasm, zkey); }
  catch { rejected = true; }
  if (!rejected) throw new Error(`Circuit accepted a tampered ${label}.`);
  console.log(`PASS tampered ${label} is rejected by constraints`);
}
