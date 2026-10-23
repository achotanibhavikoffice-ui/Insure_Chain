import fs from "node:fs";
import path from "node:path";
import snarkjs from "snarkjs";

const root = process.cwd();
const inputPath = process.argv[2] || "circuits/input.example.json";
const input = JSON.parse(fs.readFileSync(path.resolve(root, inputPath), "utf8"));
const wasm = path.join(root, "zkp", "build", "LifeInsuranceEligibility_js", "LifeInsuranceEligibility.wasm");
const zkey = path.join(root, "zkp", "build", "LifeInsuranceEligibility_final.zkey");
const proofPath = path.join(root, "zkp", "build", "proof.json");
const publicPath = path.join(root, "zkp", "build", "public.json");

if (!fs.existsSync(wasm) || !fs.existsSync(zkey)) {
  throw new Error("ZKP artifacts missing. Run: npm run zkp:setup");
}

const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
fs.writeFileSync(publicPath, JSON.stringify(publicSignals, null, 2));
console.log("Proof written:", proofPath);
console.log("Public signals written:", publicPath);
console.log(JSON.stringify(publicSignals, null, 2));
