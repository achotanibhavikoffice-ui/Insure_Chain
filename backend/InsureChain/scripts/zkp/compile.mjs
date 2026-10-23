import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "zkp", "build");
fs.mkdirSync(out, { recursive: true });

const args = [
  "circuits/LifeInsuranceEligibility.circom",
  "--r1cs", "--wasm", "--sym", "--inspect", "--O2",
  "-l", "node_modules",
  "--output", `"${out}"`
];

console.log("Compiling Circom circuit...");
// This optional setup flow expects the native Circom CLI to be installed.
execFileSync(process.env.CIRCOM_BIN || "circom", args, { stdio: "inherit", shell: true });
console.log(`Circuit compiled to ${out}`);
