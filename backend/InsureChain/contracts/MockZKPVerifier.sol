// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Development-only verifier.
 *
 * It is deliberately NOT a cryptographic verifier. It lets the complete
 * frontend + Policy contract flow be tested before a real Groth16 verifier
 * is generated from the circuit_final.zkey.
 *
 * Never deploy this contract as the production verifier.
 */
contract MockZKPVerifier {
    bool public acceptProofs = true;

    function setAcceptProofs(bool value) external {
        acceptProofs = value;
    }

    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[4] calldata
    ) external view returns (bool) {
        return acceptProofs;
    }
}
