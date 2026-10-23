# LifeInsuranceEligibility ZKP Circuit

This circuit proves eligibility from private financial and medical values.

### Private inputs

- `income`
- `creditScore`
- `medicalRisk`

### Public inputs

- `minIncome`
- `minCreditScore`
- `maxMedicalRisk`

The private values are used inside the circuit and are not included in the public signals.
The verifier receives four public signals in order: `eligible`, `minIncome`, `minCreditScore`, and `maxMedicalRisk`. The raw income, credit score, and medical risk remain private. The circuit outputs `eligible = 1` only when all three conditions hold.

Install the native Circom CLI and project dependencies before generating artifacts. The setup script adds fresh random contributions to the local development Powers of Tau and Groth16 setups, exports the verification key, and generates `contracts/Groth16Verifier.sol`. The local setup is for development only; production requires a public multi-party ceremony.

Keep the browser proving files, verification key, and Solidity verifier from the same circuit setup.

This is a **student-project eligibility circuit**, not a production medical underwriting model. Real underwriting should use a formally defined and audited policy model.
