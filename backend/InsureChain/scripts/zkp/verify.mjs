import fs from "node:fs";
import path from "node:path";
import snarkjs from "snarkjs";

const root = process.cwd();
const build = path.join(root, "zkp", "build");
const vkey = JSON.parse(fs.readFileSync(path.join(build, "verification_key.json"), "utf8"));
const proof = JSON.parse(fs.readFileSync(path.join(build, "proof.json"), "utf8"));
const publicSignals = JSON.parse(fs.readFileSync(path.join(build, "public.json"), "utf8"));
const valid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
console.log(valid ? "ZKP verification: OK" : "ZKP verification: FAILED");
process.exit(valid ? 0 : 1);
