import { execFileSync } from "node:child_process";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "zkp", "build");
fs.mkdirSync(out, { recursive: true });

const args = [
  "circuits/LifeInsuranceEligibility.circom",
  "--r1cs", "--wasm", "--sym", "--inspect", "--O2",
  "-l", "node_modules",
  "--output", out
];

console.log("Compiling Circom circuit...");
if (process.env.CIRCOM_BIN) {
  execFileSync(process.env.CIRCOM_BIN, args, { stdio: "inherit", shell: true });
} else {
  // Prefer native Circom when installed. The circom2 WASM fallback can need
  // filesystem access to the host home directory on some Windows setups.
  const native = spawnSync("circom", ["--version"], { stdio: "ignore", shell: true });
  if (native.status === 0) execFileSync("circom", args, { stdio: "inherit", shell: true });
  else execFileSync(process.execPath, [path.join(root, "node_modules", "circom2", "cli.js"), ...args], { stdio: "inherit" });
}
console.log(`Circuit compiled to ${out}`);
