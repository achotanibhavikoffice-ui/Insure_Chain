// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Optional adapter interface for a snarkjs-generated verifier.sol.
 * snarkjs exports a verifier whose verifyProof signature is compatible with
 * the interface used by LifeInsurancePolicy.
 */
interface IGeneratedGroth16Verifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[4] calldata input
    ) external view returns (bool);
}

contract VerifierAdapter {
    IGeneratedGroth16Verifier public immutable generatedVerifier;

    constructor(address verifierAddress) {
        require(verifierAddress != address(0), "invalid verifier");
        generatedVerifier = IGeneratedGroth16Verifier(verifierAddress);
    }

    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[4] calldata input
    ) external view returns (bool) {
        return generatedVerifier.verifyProof(a, b, c, input);
    }
}
