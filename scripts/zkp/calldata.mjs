import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const build = path.join(process.cwd(), "zkp", "build");
execFileSync("npx", ["snarkjs", "zkey", "export", "soliditycalldata", path.join(build, "public.json"), path.join(build, "proof.json")], { stdio: "inherit" });
