import fs from "node:fs";
import path from "node:path";
import snarkjs from "snarkjs";

const root = process.cwd();
const credentialPath = process.argv[2];
const build = path.join(root, "zkp", "build");
const credentialDir = path.join(root, "zkp", "credentials");
const wasm = path.join(build, "LifeInsuranceEligibility_js", "LifeInsuranceEligibility.wasm");
const zkey = path.join(build, "LifeInsuranceEligibility_final.zkey");
const vkeyPath = path.join(build, "verification_key.json");
const proofPath = path.join(build, "proof.json");
const publicPath = path.join(build, "public.json");

if (!fs.existsSync(wasm) || !fs.existsSync(zkey) || !fs.existsSync(vkeyPath)) {
  throw new Error("ZKP artifacts missing. Run: npm run zkp:setup");
}

let selectedCredential = credentialPath;
if (!selectedCredential) {
  const files = fs.existsSync(credentialDir) ? fs.readdirSync(credentialDir).filter((name) => name.endsWith(".json")) : [];
  if (!files.length) throw new Error("No credential found. Run `npm run zkp:issuer:init`, then issue a credential.");
  selectedCredential = path.join(credentialDir, files[0]);
}
const credential = JSON.parse(fs.readFileSync(path.resolve(root, selectedCredential), "utf8"));
const claims = credential.claims;
const circuitInput = {
  income: claims.income,
  creditScore: claims.creditScore,
  medicalRisk: claims.medicalRisk,
  credentialId: claims.credentialId,
  merkleIndex: String(credential.merkle.index),
  merkleSiblings: credential.merkle.siblings,
  signatureR8x: credential.signature.R8x,
  signatureR8y: credential.signature.R8y,
  signatureS: credential.signature.S,
  minIncome: claims.income,
  minCreditScore: claims.creditScore,
  maxMedicalRisk: claims.medicalRisk,
  holderAddress: claims.holderAddress,
  policyId: "1",
  policyNonce: "0",
  credentialRoot: credential.merkle.root,
  credentialExpiry: claims.credentialExpiry,
  issuerAx: credential.issuer.Ax,
  issuerAy: credential.issuer.Ay,
};

const { proof, publicSignals } = await snarkjs.groth16.fullProve(circuitInput, wasm, zkey);
const vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf8"));
const valid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
if (!valid) throw new Error("Generated Groth16 proof failed local verification.");
fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
fs.writeFileSync(publicPath, JSON.stringify(publicSignals, null, 2));
console.log("Proof written:", proofPath);
console.log("Public signals written:", publicPath);
console.log("Groth16 proof verified locally.");
console.log(JSON.stringify(publicSignals, null, 2));
