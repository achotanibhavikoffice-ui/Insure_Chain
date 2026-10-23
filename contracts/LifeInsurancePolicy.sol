// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IZKPVerifier.sol";

/**
 * Demo policy contract for issuer-attested eligibility credentials.
 *
 * Public signals, in order:
 * [eligible, nullifier, minIncome, minCreditScore, maxMedicalRisk,
 *  holderAddress, policyId, policyNonce, credentialRoot, credentialExpiry,
 *  issuerAx, issuerAy]
 */
contract LifeInsurancePolicy {
    enum Status { None, Pending, PaymentDue, Active, Rejected }

    struct Policy {
        address holder;
        uint256 createdAt;
        uint256 activatedAt;
        uint256 minIncome;
        uint256 minCreditScore;
        uint256 maxMedicalRisk;
        uint256 proofNonce;
        Status status;
    }

    IZKPVerifier public immutable verifier;
    address public owner;
    uint256 public issuerAx;
    uint256 public issuerAy;
    uint256 public credentialRoot;
    uint256 public nextPolicyId;
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) private policyIdsByHolder;
    mapping(uint256 => bool) public usedNullifiers;

    event PolicyCreated(uint256 indexed policyId, address indexed holder, uint256 minIncome, uint256 minCreditScore, uint256 maxMedicalRisk);
    event CredentialRootUpdated(uint256 indexed previousRoot, uint256 indexed newRoot);
    event IssuerKeyUpdated(uint256 issuerAx, uint256 issuerAy);
    event EligibilityProofAccepted(uint256 indexed policyId, address indexed holder, uint256 indexed nullifier, uint256 nonce);
    event DemoPremiumPaid(uint256 indexed policyId, address indexed holder);
    event PolicyActivated(uint256 indexed policyId, address indexed holder);

    modifier onlyOwner() {
        require(msg.sender == owner, "not registry owner");
        _;
    }

    constructor(address verifierAddress, uint256 issuerAx_, uint256 issuerAy_, uint256 credentialRoot_) {
        require(verifierAddress != address(0), "invalid verifier");
        verifier = IZKPVerifier(verifierAddress);
        owner = msg.sender;
        issuerAx = issuerAx_;
        issuerAy = issuerAy_;
        credentialRoot = credentialRoot_;
    }

    function updateCredentialRoot(uint256 newRoot) external onlyOwner {
        uint256 previousRoot = credentialRoot;
        credentialRoot = newRoot;
        emit CredentialRootUpdated(previousRoot, newRoot);
    }

    function updateIssuerKey(uint256 newAx, uint256 newAy) external onlyOwner {
        issuerAx = newAx;
        issuerAy = newAy;
        emit IssuerKeyUpdated(newAx, newAy);
    }

    function createPolicy(uint256 minIncome, uint256 minCreditScore, uint256 maxMedicalRisk)
        external returns (uint256 policyId)
    {
        policyId = ++nextPolicyId;
        policies[policyId] = Policy({
            holder: msg.sender,
            createdAt: block.timestamp,
            activatedAt: 0,
            minIncome: minIncome,
            minCreditScore: minCreditScore,
            maxMedicalRisk: maxMedicalRisk,
            proofNonce: 0,
            status: Status.Pending
        });
        policyIdsByHolder[msg.sender].push(policyId);
        emit PolicyCreated(policyId, msg.sender, minIncome, minCreditScore, maxMedicalRisk);
    }

    function submitEligibilityProof(
        uint256 policyId,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[12] calldata publicSignals
    ) external {
        Policy storage policy = policies[policyId];
        require(policy.holder == msg.sender, "not policy holder");
        require(policy.status == Status.Pending, "policy not pending");
        require(publicSignals[0] == 1, "applicant is not eligible");
        require(publicSignals[1] != 0 && !usedNullifiers[publicSignals[1]], "credential already used");
        require(publicSignals[2] == policy.minIncome, "income threshold mismatch");
        require(publicSignals[3] == policy.minCreditScore, "credit threshold mismatch");
        require(publicSignals[4] == policy.maxMedicalRisk, "medical threshold mismatch");
        require(publicSignals[5] == uint256(uint160(msg.sender)), "credential holder mismatch");
        require(publicSignals[6] == policyId, "policy binding mismatch");
        require(publicSignals[7] == policy.proofNonce, "policy nonce mismatch");
        require(publicSignals[8] == credentialRoot, "credential root is stale");
        require(publicSignals[9] >= block.timestamp, "credential expired");
        require(publicSignals[10] == issuerAx && publicSignals[11] == issuerAy, "untrusted issuer key");

        require(verifier.verifyProof(a, b, c, publicSignals), "invalid ZK proof");
        usedNullifiers[publicSignals[1]] = true;
        policy.proofNonce += 1;
        policy.status = Status.PaymentDue;
        emit EligibilityProofAccepted(policyId, msg.sender, publicSignals[1], publicSignals[7]);
    }

    /// @notice Records a simulated first-premium payment for the local demo and activates the policy.
    /// @dev This function transfers no funds and must not be used as real insurance payment handling.
    function payFirstPremium(uint256 policyId) external {
        Policy storage policy = policies[policyId];
        require(policy.holder == msg.sender, "not policy holder");
        require(policy.status == Status.PaymentDue, "proof not verified or premium already paid");
        policy.status = Status.Active;
        policy.activatedAt = block.timestamp;
        emit DemoPremiumPaid(policyId, msg.sender);
        emit PolicyActivated(policyId, msg.sender);
    }

    function getPolicyIds(address holder) external view returns (uint256[] memory) {
        return policyIdsByHolder[holder];
    }

    function isActive(uint256 policyId) external view returns (bool) {
        return policies[policyId].status == Status.Active;
    }
}
