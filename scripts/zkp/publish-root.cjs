const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

async function main() {
  const envPath = path.resolve(process.cwd(), ".env");
  const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const policyAddress = process.env.VITE_POLICY_CONTRACT_ADDRESS || envText.match(/^\s*VITE_POLICY_CONTRACT_ADDRESS\s*=\s*(\S+)/m)?.[1];
  if (!policyAddress) throw new Error("VITE_POLICY_CONTRACT_ADDRESS is missing from .env.");
  const rootPath = path.resolve(process.cwd(), "zkp/credential-registry-public.json");
  if (!fs.existsSync(rootPath)) throw new Error("Credential registry root is missing. Run the issuer init/issue/revoke command first.");
  const { root } = JSON.parse(fs.readFileSync(rootPath, "utf8"));
  const signers = await hre.ethers.getSigners();
  const owner = signers[1];
  if (!owner) throw new Error("Hardhat account #1 is unavailable.");
  const policy = await hre.ethers.getContractAt("LifeInsurancePolicy", policyAddress, owner);
  const tx = await policy.updateCredentialRoot(BigInt(root));
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error("Credential root transaction failed.");
  console.log("Published credential root:", root);
  console.log("Transaction:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
