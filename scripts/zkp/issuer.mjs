import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildCredentialTree, credentialMessageFields, createCredentialCrypto, TREE_DEPTH } from "./credential-lib.mjs";

const root = process.cwd();
const zkpDir = path.join(root, "zkp");
const credentialDir = path.join(zkpDir, "credentials");
const privatePath = path.join(zkpDir, "issuer-private.json");
const publicPath = path.join(zkpDir, "issuer-public.json");
const registryPath = path.join(zkpDir, "credential-registry.json");
const registryPublicPath = path.join(zkpDir, "credential-registry-public.json");
const command = process.argv[2];

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function requireInteger(label, value, bits) {
  if (!/^[0-9]+$/.test(String(value))) throw new Error(`${label} must be a non-negative whole number.`);
  const parsed = BigInt(value);
  if (parsed >= 2n ** BigInt(bits)) throw new Error(`${label} must fit in ${bits} bits.`);
  return parsed.toString();
}

async function updateRegistryArtifacts(registry, crypto) {
  const active = registry.credentials.filter((item) => item.active);
  const { root: merkleRoot, paths } = buildCredentialTree(active.map((item) => item.claims.credentialId), crypto.hash);
  const publicIssuer = readJson(publicPath);
  writeJson(registryPublicPath, { root: merkleRoot, activeCount: active.length, treeDepth: TREE_DEPTH });

  for (const item of active) {
    const merkle = paths.get(item.claims.credentialId);
    writeJson(path.join(credentialDir, `${item.claims.credentialId}.json`), {
      version: 1,
      claims: item.claims,
      signature: item.signature,
      issuer: publicIssuer,
      merkle: { root: merkleRoot, index: merkle.index, siblings: merkle.siblings },
    });
  }
  writeJson(registryPath, registry);
  console.log(`Active credential root: ${merkleRoot}`);
  console.log(`Active credentials: ${active.length}; tree depth: ${TREE_DEPTH}`);
  console.log(`Registry root file: ${path.relative(root, registryPublicPath)}`);
}

async function main() {
  if (command === "init") {
    if (fs.existsSync(privatePath)) throw new Error("Issuer already initialized. Back up the local key before rotating it.");
    const crypto = await createCredentialCrypto();
    const privateKey = randomBytes(32);
    const [ax, ay] = crypto.eddsa.prv2pub(privateKey);
    writeJson(privatePath, { privateKey: privateKey.toString("hex") });
    writeJson(publicPath, { Ax: crypto.toFieldString(ax), Ay: crypto.toFieldString(ay) });
    writeJson(registryPath, { version: 1, credentials: [] });
    await updateRegistryArtifacts(readJson(registryPath), crypto);
    console.log(`Issuer key created locally. Keep ${path.relative(root, privatePath)} secret and out of source control.`);
    return;
  }

  if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath) || !fs.existsSync(registryPath)) {
    throw new Error("Initialize the local issuer first: node scripts/zkp/issuer.mjs init");
  }

  const crypto = await createCredentialCrypto();
  const privateKey = Buffer.from(readJson(privatePath).privateKey, "hex");
  const registry = readJson(registryPath);

  if (command === "issue") {
    const [, , , holderInput, incomeInput, creditInput, riskInput, expiryInput] = process.argv;
    if (!/^0x[0-9a-fA-F]{40}$/.test(holderInput || "")) throw new Error("Usage: issuer.mjs issue <wallet-address> <income> <credit-score> <medical-risk> <expiry-unix-seconds>");
    const expiry = requireInteger("Expiry", expiryInput, 64);
    if (BigInt(expiry) <= BigInt(Math.floor(Date.now() / 1000))) throw new Error("Expiry must be a future Unix timestamp in seconds.");
    const credentialId = BigInt(`0x${randomBytes(31).toString("hex")}`).toString();
    const claims = {
      income: requireInteger("Income", incomeInput, 64),
      creditScore: requireInteger("Credit score", creditInput, 16),
      medicalRisk: requireInteger("Medical risk", riskInput, 16),
      holderAddress: BigInt(holderInput).toString(),
      credentialExpiry: expiry,
      credentialId,
    };
    const message = crypto.poseidon(credentialMessageFields(claims));
    const signature = crypto.eddsa.signPoseidon(privateKey, message);
    if (!crypto.eddsa.verifyPoseidon(message, signature, crypto.eddsa.prv2pub(privateKey))) {
      throw new Error("Local issuer signature self-check failed.");
    }
    registry.credentials.push({
      claims,
      signature: {
        R8x: crypto.toFieldString(signature.R8[0]),
        R8y: crypto.toFieldString(signature.R8[1]),
        S: signature.S.toString(),
      },
      active: true,
    });
    await updateRegistryArtifacts(registry, crypto);
    console.log(`Credential issued: ${path.join("zkp", "credentials", `${credentialId}.json`)}`);
    console.log("Import this file in the application. Its attributes and membership path are private witness data.");
    return;
  }

  if (command === "revoke") {
    const credentialId = process.argv[3];
    if (!/^\d+$/.test(credentialId || "")) throw new Error("Usage: issuer.mjs revoke <credential-id>");
    const credential = registry.credentials.find((item) => item.claims.credentialId === credentialId && item.active);
    if (!credential) throw new Error("No active credential with that ID was found.");
    credential.active = false;
    await updateRegistryArtifacts(registry, crypto);
    console.log("Credential revoked in the local registry. Publish the new root through the owner-only contract function before accepting proofs.");
    return;
  }

  throw new Error("Commands: init | issue <wallet> <income> <credit> <risk> <expiry> | revoke <credential-id>");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
