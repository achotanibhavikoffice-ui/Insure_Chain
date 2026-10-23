const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy the Groth16Verifier contract generated during setup
  console.log("Deploying Groth16Verifier...");
  const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("Groth16Verifier deployed to:", verifierAddress);

  // 2. Deploy the LifeInsurancePolicy contract using the deployed verifier address
  console.log("Deploying LifeInsurancePolicy...");
  const LifeInsurancePolicy = await hre.ethers.getContractFactory("LifeInsurancePolicy");
  const policy = await LifeInsurancePolicy.deploy(verifierAddress);
  await policy.waitForDeployment();
  const policyAddress = await policy.getAddress();

  console.log("LifeInsurancePolicy deployed to:", policyAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});