# InsureChain Project Architecture

## 1. Wallet / identity
MetaMask connects the user wallet. The wallet address is used by the policy contract as the policy holder.

## 2. Private records
The frontend should obtain or receive financial/medical records through an appropriate private source. Raw records must not be sent to the blockchain.

## 3. ZKP prover
The Circom circuit proves:

- income >= minimum income
- credit score >= minimum credit score
- medical risk <= maximum medical risk

The circuit exposes four public signals in verifier order: `eligible`, `minIncome`, `minCreditScore`, and `maxMedicalRisk`. The raw income, credit score, and medical risk remain private.

## 4. On-chain verifier
`Groth16Verifier.sol` is generated from the exact final zkey using snarkjs. `LifeInsurancePolicy.sol` calls this verifier.

## 5. Automatic activation
When the verifier returns true, `LifeInsurancePolicy.submitEligibilityProof()` changes the policy status to `Active` and emits `PolicyActivated`.

## 6. Disbursement extension
The second flow can use a similar pattern:

Claim -> private proof of death/claim eligibility -> verifier -> settlement smart contract -> payout.

A production implementation should also use an oracle/attested source for a death certificate and should include replay protection, claim IDs, timestamps, role-based authorization and audited financial logic.
