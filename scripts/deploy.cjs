const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

async function main() {
  const issuerPath = path.resolve(process.cwd(), "zkp/issuer-public.json");
  const registryPath = path.resolve(process.cwd(), "zkp/credential-registry-public.json");
  if (!fs.existsSync(issuerPath) || !fs.existsSync(registryPath)) {
    throw new Error("Initialize and issue/revoke credentials first with `npm run zkp:issuer:init` and `npm run zkp:issuer:issue`.");
  }
  const issuer = JSON.parse(fs.readFileSync(issuerPath, "utf8"));
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

  const signers = await hre.ethers.getSigners();
  const deployer = signers[1];
  if (!deployer) throw new Error("Hardhat account #1 is unavailable.");
  console.log("Deploying contracts with Hardhat account #1:", deployer.address);

  console.log("Deploying Groth16Verifier...");
  const Verifier = await hre.ethers.getContractFactory("Groth16Verifier", deployer);
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("Groth16Verifier deployed to:", verifierAddress);

  console.log("Deploying LifeInsurancePolicy...");
  const LifeInsurancePolicy = await hre.ethers.getContractFactory("LifeInsurancePolicy", deployer);
  const policy = await LifeInsurancePolicy.deploy(
    verifierAddress,
    BigInt(issuer.Ax),
    BigInt(issuer.Ay),
    BigInt(registry.root)
  );
  await policy.waitForDeployment();
  const policyAddress = await policy.getAddress();

  const envPath = path.resolve(process.cwd(), ".env");
  const currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const addressLine = `VITE_POLICY_CONTRACT_ADDRESS=${policyAddress}`;
  const nextEnv = /^\s*VITE_POLICY_CONTRACT_ADDRESS\s*=.*$/m.test(currentEnv)
    ? currentEnv.replace(/^\s*VITE_POLICY_CONTRACT_ADDRESS\s*=.*$/m, addressLine)
    : `${currentEnv.trimEnd()}${currentEnv.trim() ? "\n" : ""}${addressLine}\n`;
  fs.writeFileSync(envPath, nextEnv);

  console.log("LifeInsurancePolicy deployed to:", policyAddress);
  console.log("Updated VITE_POLICY_CONTRACT_ADDRESS in .env.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


