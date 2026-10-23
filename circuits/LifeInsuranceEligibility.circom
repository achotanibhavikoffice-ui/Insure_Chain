pragma circom 2.1.1;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/eddsaposeidon.circom";

/*
 * Proves that an issuer-signed, non-revoked life-insurance credential
 * satisfies policy thresholds and is bound to this wallet and policy.
 *
 * Private witness: credential metrics, credential ID, Merkle index/path,
 * signature, and expiry value (its signed value is also exposed publicly so
 * the contract can compare it to block.timestamp).
 * Public inputs: policy thresholds, wallet, policy ID/nonce, active
 * credential root, expiry, and issuer BabyJubJub public key.
 */
template LifeInsuranceEligibility() {
    signal input income;
    signal input creditScore;
    signal input medicalRisk;
    signal input credentialId;
    signal input merkleIndex;
    signal input merkleSiblings[4];
    signal input signatureR8x;
    signal input signatureR8y;
    signal input signatureS;

    signal input minIncome;
    signal input minCreditScore;
    signal input maxMedicalRisk;
    signal input holderAddress;
    signal input policyId;
    signal input policyNonce;
    signal input credentialRoot;
    signal input credentialExpiry;
    signal input issuerAx;
    signal input issuerAy;

    signal output eligible;
    signal output nullifier;

    component incomeBits = Num2Bits(64);
    incomeBits.in <== income;
    component creditBits = Num2Bits(16);
    creditBits.in <== creditScore;
    component riskBits = Num2Bits(16);
    riskBits.in <== medicalRisk;
    component minIncomeBits = Num2Bits(64);
    minIncomeBits.in <== minIncome;
    component minCreditBits = Num2Bits(16);
    minCreditBits.in <== minCreditScore;
    component maxRiskBits = Num2Bits(16);
    maxRiskBits.in <== maxMedicalRisk;
    component expiryBits = Num2Bits(64);
    expiryBits.in <== credentialExpiry;
    component credentialIdBits = Num2Bits(248);
    credentialIdBits.in <== credentialId;
    component holderBits = Num2Bits(160);
    holderBits.in <== holderAddress;

    component incomeOk = GreaterEqThan(64);
    incomeOk.in[0] <== income;
    incomeOk.in[1] <== minIncome;
    component creditOk = GreaterEqThan(16);
    creditOk.in[0] <== creditScore;
    creditOk.in[1] <== minCreditScore;
    component riskOk = LessEqThan(16);
    riskOk.in[0] <== medicalRisk;
    riskOk.in[1] <== maxMedicalRisk;

    // The issuer signs a domain-separated hash of every credential claim,
    // including the applicant wallet, expiry, and unique credential ID.
    component signedClaims = Poseidon(7);
    signedClaims.inputs[0] <== 0x494e53555245434841494e01;
    signedClaims.inputs[1] <== income;
    signedClaims.inputs[2] <== creditScore;
    signedClaims.inputs[3] <== medicalRisk;
    signedClaims.inputs[4] <== holderAddress;
    signedClaims.inputs[5] <== credentialExpiry;
    signedClaims.inputs[6] <== credentialId;

    component signatureVerifier = EdDSAPoseidonVerifier();
    signatureVerifier.enabled <== 1;
    signatureVerifier.Ax <== issuerAx;
    signatureVerifier.Ay <== issuerAy;
    signatureVerifier.R8x <== signatureR8x;
    signatureVerifier.R8y <== signatureR8y;
    signatureVerifier.S <== signatureS;
    signatureVerifier.M <== signedClaims.out;

    // Credential IDs form a fixed-depth active-credential Merkle tree. The
    // owner updates the root to revoke credentials; credentials and paths stay private.
    component indexBits = Num2Bits(4);
    indexBits.in <== merkleIndex;
    signal merkleLevel[5];
    merkleLevel[0] <== credentialId;
    component merkleHash[4];
    signal merkleLeft[4];
    signal merkleRight[4];
    for (var i = 0; i < 4; i++) {
        merkleLeft[i] <== merkleLevel[i] + indexBits.out[i] * (merkleSiblings[i] - merkleLevel[i]);
        merkleRight[i] <== merkleSiblings[i] + indexBits.out[i] * (merkleLevel[i] - merkleSiblings[i]);
        merkleHash[i] = Poseidon(2);
        merkleHash[i].inputs[0] <== merkleLeft[i];
        merkleHash[i].inputs[1] <== merkleRight[i];
        merkleLevel[i + 1] <== merkleHash[i].out;
    }
    merkleLevel[4] === credentialRoot;

    signal eligibleFinancial;
    eligibleFinancial <== incomeOk.out * creditOk.out;
    eligible <== eligibleFinancial * riskOk.out;
    eligible * (eligible - 1) === 0;

    // A credential can be used once per policy challenge without exposing a
    // stable identifier that links the holder across different policies.
    component nullifierHash = Poseidon(4);
    nullifierHash.inputs[0] <== credentialId;
    nullifierHash.inputs[1] <== policyId;
    nullifierHash.inputs[2] <== holderAddress;
    nullifierHash.inputs[3] <== policyNonce;
    nullifier <== nullifierHash.out;
}

component main {public [
    minIncome,
    minCreditScore,
    maxMedicalRisk,
    holderAddress,
    policyId,
    policyNonce,
    credentialRoot,
    credentialExpiry,
    issuerAx,
    issuerAy
]} = LifeInsuranceEligibility();
