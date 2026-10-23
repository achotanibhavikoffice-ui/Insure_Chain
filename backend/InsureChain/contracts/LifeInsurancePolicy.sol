// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IZKPVerifier.sol";

/**
 * LifeInsurancePolicy
 *
 * The contract never receives raw financial or medical records.
 * It receives a Groth16 proof plus public signals and activates the policy
 * only when the configured verifier accepts the proof.
 *
 * Expected public signals from the supplied circuit, in order:
 * [eligible, minimumIncome, minimumCreditScore, maximumMedicalRisk]
 */
contract LifeInsurancePolicy {
    enum Status { None, Pending, Active, Rejected }

    struct Policy {
        address holder;
        uint256 createdAt;
        uint256 activatedAt;
        uint256 minIncome;
        uint256 minCreditScore;
        uint256 maxMedicalRisk;
        Status status;
    }

    IZKPVerifier public immutable verifier;
    uint256 public nextPolicyId;
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) private policyIdsByHolder;

    event PolicyCreated(
        uint256 indexed policyId,
        address indexed holder,
        uint256 minIncome,
        uint256 minCreditScore,
        uint256 maxMedicalRisk
    );
    event PolicyActivated(uint256 indexed policyId, address indexed holder);
    event PolicyRejected(uint256 indexed policyId, address indexed holder);

    constructor(address verifierAddress) {
        require(verifierAddress != address(0), "invalid verifier");
        verifier = IZKPVerifier(verifierAddress);
    }

    function createPolicy(
        uint256 minIncome,
        uint256 minCreditScore,
        uint256 maxMedicalRisk
    ) external returns (uint256 policyId) {
        policyId = ++nextPolicyId;
        policies[policyId] = Policy({
            holder: msg.sender,
            createdAt: block.timestamp,
            activatedAt: 0,
            minIncome: minIncome,
            minCreditScore: minCreditScore,
            maxMedicalRisk: maxMedicalRisk,
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
        uint256[4] calldata publicSignals
    ) external {
        Policy storage policy = policies[policyId];
        require(policy.holder == msg.sender, "not policy holder");
        require(policy.status == Status.Pending, "policy not pending");
        require(publicSignals[0] == 1, "applicant is not eligible");
        require(publicSignals[1] == policy.minIncome, "income threshold mismatch");
        require(publicSignals[2] == policy.minCreditScore, "credit threshold mismatch");
        require(publicSignals[3] == policy.maxMedicalRisk, "medical threshold mismatch");

        bool valid = verifier.verifyProof(a, b, c, publicSignals);
        if (!valid) {
            policy.status = Status.Rejected;
            emit PolicyRejected(policyId, msg.sender);
            revert("invalid ZK proof");
        }

        policy.status = Status.Active;
        policy.activatedAt = block.timestamp;
        emit PolicyActivated(policyId, msg.sender);
    }

    function getPolicyIds(address holder) external view returns (uint256[] memory) {
        return policyIdsByHolder[holder];
    }

    function isActive(uint256 policyId) external view returns (bool) {
        return policies[policyId].status == Status.Active;
    }
}
