# LifeInsuranceEligibility ZKP Circuit

The circuit proves an issuer-attested eligibility statement. It checks three threshold rules, a BabyJubJub EdDSA-Poseidon signature, and a depth-4 Poseidon Merkle inclusion path for an active credential ID.

## Private witness

- income, credit score, and medical risk
- random credential ID
- EdDSA-Poseidon signature
- Merkle index and sibling path

## Public signals

The generated verifier and policy contract use this exact order:

1. `eligible`
2. `nullifier`
3. `minIncome`
4. `minCreditScore`
5. `maxMedicalRisk`
6. `holderAddress`
7. `policyId`
8. `policyNonce`
9. `credentialRoot`
10. `credentialExpiry`
11. `issuerAx`
12. `issuerAy`

The contract checks these values against its policy and registry state, verifies the proof, and consumes the nullifier. The owner publishes a new root after revocation. The app uses Groth16; the setup also prepares PLONK artifacts for a local benchmark.

Run `npm run zkp:setup` after changing the circuit. It uses a local development-only Powers of Tau contribution, generates Groth16 and PLONK keys/verifiers, and synchronizes Groth16 browser artifacts into `public/zkp/`. Regenerate and redeploy as one matched set. A production deployment requires an audited circuit and contracts, secure issuer key management, and a public multi-party ceremony for Groth16.

This is a student-project eligibility circuit. The local demo issuer signs supplied numbers and does not verify source documents or provide medical underwriting.
