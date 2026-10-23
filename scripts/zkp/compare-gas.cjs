const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

async function main() {
  const root = process.cwd();
  const build = path.join(root, "zkp", "build");
  const credentialDir = path.join(root, "zkp", "credentials");
  const providedPath = process.argv[2];
  const defaultCredential = fs.existsSync(credentialDir)
    ? fs.readdirSync(credentialDir).find((name) => name.endsWith(".json"))
    : null;
  const credentialPath = providedPath || (defaultCredential ? path.join(credentialDir, defaultCredential) : "");
  const wasm = path.join(build, "LifeInsuranceEligibility_js", "LifeInsuranceEligibility.wasm");
  const grothZkey = path.join(build, "LifeInsuranceEligibility_final.zkey");
  const plonkZkey = path.join(build, "LifeInsuranceEligibility_plonk.zkey");
  if (!credentialPath || !fs.existsSync(credentialPath) || ![wasm, grothZkey, plonkZkey].every(fs.existsSync)) {
    throw new Error("Credential or ZKP artifacts missing. Run zkp:setup and issue a credential first.");
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
  const snarkjsModule = await import("snarkjs");
  const snarkjs = snarkjsModule.default || snarkjsModule;
  const [groth, plonk] = await Promise.all([
    snarkjs.groth16.fullProve(input, wasm, grothZkey),
    snarkjs.plonk.fullProve(input, wasm, plonkZkey),
  ]);
  if (groth.publicSignals[0] !== "1" || plonk.publicSignals[0] !== "1") throw new Error("Benchmark credential is not eligible under this statement.");

  const [signer] = await hre.ethers.getSigners();
  const grothVerifier = await (await hre.ethers.getContractFactory("Groth16Verifier", signer)).deploy();
  await grothVerifier.waitForDeployment();
  const plonkVerifier = await (await hre.ethers.getContractFactory("PlonkVerifier", signer)).deploy();
  await plonkVerifier.waitForDeployment();

  const toBigInt = (item) => BigInt(item);
  const grothA = groth.proof.pi_a.slice(0, 2).map(toBigInt);
  const grothB = [
    [toBigInt(groth.proof.pi_b[0][1]), toBigInt(groth.proof.pi_b[0][0])],
    [toBigInt(groth.proof.pi_b[1][1]), toBigInt(groth.proof.pi_b[1][0])],
  ];
  const grothC = groth.proof.pi_c.slice(0, 2).map(toBigInt);
  const grothSignals = groth.publicSignals.map(toBigInt);
  if (!(await grothVerifier.verifyProof.staticCall(grothA, grothB, grothC, grothSignals))) throw new Error("Groth16 Solidity verifier rejected its generated proof.");
  const grothGas = await grothVerifier.verifyProof.estimateGas(grothA, grothB, grothC, grothSignals);

  const plonkCallData = await snarkjs.plonk.exportSolidityCallData(plonk.proof, plonk.publicSignals);
  const [proofJson, publicJson] = plonkCallData.split("][");
  const plonkProof = JSON.parse(`${proofJson}]`).map(toBigInt);
  const plonkSignals = JSON.parse(`[${publicJson}`).map(toBigInt);
  if (!(await plonkVerifier.verifyProof.staticCall(plonkProof, plonkSignals))) throw new Error("PLONK Solidity verifier rejected its generated proof.");
  const plonkGas = await plonkVerifier.verifyProof.estimateGas(plonkProof, plonkSignals);

  const report = {
    generatedAt: new Date().toISOString(),
    network: "ephemeral Hardhat EVM",
    note: "Gas values are estimates from this local EVM and generated verifier bytecode; they are not network fee predictions.",
    verificationGas: { Groth16: grothGas.toString(), PLONK: plonkGas.toString() },
  };
  const output = path.join(build, "proof-comparison-gas.json");
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
