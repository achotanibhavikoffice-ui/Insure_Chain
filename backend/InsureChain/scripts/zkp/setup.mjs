import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const build = path.join(root, "zkp", "build");
fs.mkdirSync(build, { recursive: true });

function run(args) {
  execFileSync(process.execPath, [path.join(root, "node_modules", "snarkjs", "build", "cli.cjs"), ...args], { stdio: "inherit" });
}

console.log("== 1. Compile circuit ==");
execFileSync("node", ["scripts/zkp/compile.mjs"], { stdio: "inherit" });

const ptau0 = path.join(build, "powersOfTau28_hez_12_0000.ptau");
const ptau1 = path.join(build, "powersOfTau28_hez_12_contributed.ptau");
const ptau2 = path.join(build, "powersOfTau28_hez_12_final.ptau");
const zkey0 = path.join(build, "LifeInsuranceEligibility_0000.zkey");
const zkey = path.join(build, "LifeInsuranceEligibility_final.zkey");
const vkey = path.join(build, "verification_key.json");
const verifier = path.join(root, "contracts", "Groth16Verifier.sol");

console.log("== 2. Create local Powers of Tau (development setup) ==");
run(["powersoftau", "new", "bn128", "12", ptau0, "-v"]);
run(["powersoftau", "contribute", ptau0, ptau1, "--name=InsureChain local development contribution", `-e=${randomBytes(32).toString("hex")}`]);
run(["powersoftau", "prepare", "phase2", ptau1, ptau2, "-v"]);

console.log("== 3. Circuit-specific Groth16 setup ==");
run(["groth16", "setup", path.join(build, "LifeInsuranceEligibility.r1cs"), ptau2, zkey0]);
run(["zkey", "contribute", zkey0, zkey, "--name=InsureChain student contribution", "-v", `-e=${randomBytes(32).toString("hex")}`]);
run(["zkey", "verify", path.join(build, "LifeInsuranceEligibility.r1cs"), ptau2, zkey]);
run(["zkey", "export", "verificationkey", zkey, vkey]);
run(["zkey", "export", "solidityverifier", zkey, verifier]);

console.log("== 4. Final verifier generated ==");
console.log(verifier);
console.log("IMPORTANT: a local single-party setup is suitable for development/demo only. For a security-sensitive deployment use an appropriate public ceremony/MPC setup.");
