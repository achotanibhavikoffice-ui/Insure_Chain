import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const build = path.join(root, "zkp", "build");
const browserArtifacts = path.join(root, "public", "zkp");
const power = Number(process.env.ZKP_PTAU_POWER || 16);
if (!Number.isInteger(power) || power < 16 || power > 20) throw new Error("ZKP_PTAU_POWER must be an integer from 16 to 20 so PLONK fits this circuit.");
fs.mkdirSync(build, { recursive: true });
fs.mkdirSync(browserArtifacts, { recursive: true });

function run(args) {
  execFileSync(process.execPath, [path.join(root, "node_modules", "snarkjs", "build", "cli.cjs"), ...args], { stdio: "inherit" });
}

console.log("== 1. Compile circuit ==");
execFileSync(process.execPath, [path.join(root, "scripts", "zkp", "compile.mjs")], { stdio: "inherit" });

const ptau0 = path.join(build, `powersoftau28_hez_${power}_0000.ptau`);
const ptau1 = path.join(build, `powersoftau28_hez_${power}_contributed.ptau`);
const ptau2 = path.join(build, `powersoftau28_hez_${power}_final.ptau`);
const r1cs = path.join(build, "LifeInsuranceEligibility.r1cs");
const grothZkey0 = path.join(build, "LifeInsuranceEligibility_0000.zkey");
const grothZkey = path.join(build, "LifeInsuranceEligibility_final.zkey");
const grothVkey = path.join(build, "verification_key.json");
const grothVerifier = path.join(root, "contracts", "Groth16Verifier.sol");
const plonkZkey = path.join(build, "LifeInsuranceEligibility_plonk.zkey");
const plonkVkey = path.join(build, "plonk_verification_key.json");
const plonkVerifier = path.join(root, "contracts", "PlonkVerifier.sol");

console.log(`== 2. Create local Powers of Tau (power ${power}; development setup) ==`);
run(["powersoftau", "new", "bn128", String(power), ptau0]);
run(["powersoftau", "contribute", ptau0, ptau1, "--name=InsureChain local development contribution", `-e=${randomBytes(32).toString("hex")}`]);
run(["powersoftau", "prepare", "phase2", ptau1, ptau2]);

console.log("== 3. Groth16 setup ==");
run(["groth16", "setup", r1cs, ptau2, grothZkey0]);
run(["zkey", "contribute", grothZkey0, grothZkey, "--name=InsureChain student contribution", `-e=${randomBytes(32).toString("hex")}`]);
run(["zkey", "verify", r1cs, ptau2, grothZkey]);
run(["zkey", "export", "verificationkey", grothZkey, grothVkey]);
run(["zkey", "export", "solidityverifier", grothZkey, grothVerifier]);

console.log("== 4. PLONK comparison setup ==");
run(["plonk", "setup", r1cs, ptau2, plonkZkey]);
run(["zkey", "export", "verificationkey", plonkZkey, plonkVkey]);
run(["zkey", "export", "solidityverifier", plonkZkey, plonkVerifier]);

console.log("== 5. Synchronize browser Groth16 artifacts ==");
fs.copyFileSync(path.join(build, "LifeInsuranceEligibility_js", "LifeInsuranceEligibility.wasm"), path.join(browserArtifacts, "LifeInsuranceEligibility.wasm"));
fs.copyFileSync(grothZkey, path.join(browserArtifacts, "LifeInsuranceEligibility_final.zkey"));
fs.copyFileSync(grothVkey, path.join(browserArtifacts, "verification_key.json"));

console.log("== 6. Verifiers generated ==");
console.log(grothVerifier);
console.log(plonkVerifier);
console.log("IMPORTANT: this local setup is for development and comparison only. Use a public multi-party ceremony for a security-sensitive deployment.");
