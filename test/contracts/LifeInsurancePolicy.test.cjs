const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LifeInsurancePolicy ZKP context checks", function () {
  let owner;
  let holder;
  let verifier;
  let policy;

  const ROOT = 987654321n;
  const ISSUER_AX = 2n;
  const ISSUER_AY = 3n;
  const MIN_INCOME = 50000n;
  const MIN_CREDIT = 650n;
  const MAX_RISK = 100n;

  beforeEach(async function () {
    [owner, holder] = await ethers.getSigners();
    const Mock = await ethers.getContractFactory("MockZKPVerifier", owner);
    verifier = await Mock.deploy();
    const Policy = await ethers.getContractFactory("LifeInsurancePolicy", owner);
    policy = await Policy.deploy(await verifier.getAddress(), ISSUER_AX, ISSUER_AY, ROOT);
  });

  async function createPolicy() {
    const tx = await policy.connect(holder).createPolicy(MIN_INCOME, MIN_CREDIT, MAX_RISK);
    await tx.wait();
    return (await policy.getPolicyIds(holder.address)).at(-1);
  }

  function validSignals(id, overrides = {}) {
    const values = [
      1n, 123n, MIN_INCOME, MIN_CREDIT, MAX_RISK,
      BigInt(holder.address), BigInt(id), 0n, ROOT,
      BigInt(Math.floor(Date.now() / 1000) + 3600), ISSUER_AX, ISSUER_AY,
    ];
    for (const [index, value] of Object.entries(overrides)) values[Number(index)] = BigInt(value);
    return values;
  }

  async function submit(id, signals) {
    return policy.connect(holder).submitEligibilityProof(
      id,
      [1n, 2n],
      [[3n, 4n], [5n, 6n]],
      [7n, 8n],
      signals,
    );
  }

  it("accepts a mock verifier proof only when policy context matches", async function () {
    const id = await createPolicy();
    await expect(submit(id, validSignals(id))).to.emit(policy, "EligibilityProofAccepted");
    const savedPolicy = await policy.policies(id);
    expect(savedPolicy.status).to.equal(2n);
    expect(savedPolicy.proofNonce).to.equal(1n);
  });

  for (const [label, index, value] of [
    ["eligibility", 0, 0n],
    ["nullifier", 1, 0n],
    ["income threshold", 2, MIN_INCOME + 1n],
    ["credit threshold", 3, MIN_CREDIT + 1n],
    ["medical threshold", 4, MAX_RISK + 1n],
    ["holder", 5, 999n],
    ["policy ID", 6, 999n],
    ["policy nonce", 7, 1n],
    ["credential root", 8, ROOT + 1n],
    ["issuer key", 10, ISSUER_AX + 1n],
    ["second issuer coordinate", 11, ISSUER_AY + 1n],
  ]) {
    it(`rejects a mismatched ${label}`, async function () {
      const id = await createPolicy();
      await expect(submit(id, validSignals(id, { [index]: value }))).to.be.reverted;
    });
  }

  it("rejects expired credentials", async function () {
    const id = await createPolicy();
    await expect(submit(id, validSignals(id, { 9: 1n }))).to.be.revertedWith("credential expired");
  });

  it("does not accept a proof rejected by the verifier", async function () {
    const id = await createPolicy();
    await verifier.setAcceptProofs(false);
    await expect(submit(id, validSignals(id))).to.be.revertedWith("invalid ZK proof");
  });

  it("prevents a credential nullifier from being replayed on another policy", async function () {
    const first = await createPolicy();
    const replayValue = 777n;
    await submit(first, validSignals(first, { 1: replayValue }));
    const second = await createPolicy();
    await expect(submit(second, validSignals(second, { 1: replayValue }))).to.be.revertedWith("credential already used");
  });

  it("allows only the owner to publish a revocation root", async function () {
    await expect(policy.connect(holder).updateCredentialRoot(ROOT + 1n)).to.be.revertedWith("not registry owner");
    await expect(policy.connect(owner).updateCredentialRoot(ROOT + 1n))
      .to.emit(policy, "CredentialRootUpdated").withArgs(ROOT, ROOT + 1n);
  });
});
