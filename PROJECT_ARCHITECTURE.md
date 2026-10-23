# InsureChain Project Architecture

## 1. Wallet / identity
MetaMask connects the user wallet. The wallet address is used by the policy contract as the policy holder.

## 2. Private records
The frontend should obtain or receive financial/medical records through an appropriate private source. Raw records must not be sent to the blockchain.

## 3. Credential issuer and ZKP prover
For this coursework demo, a local issuer creates a BabyJubJub EdDSA-Poseidon key pair and signs a domain-separated hash of the credential claims, wallet, expiry, and random credential ID. It maintains a depth-4 Poseidon Merkle tree of active credential IDs. A credential JSON contains the signed claims plus the membership path; the private issuer key and credential files are excluded from source control.

The browser-side Circom prover proves:

- income >= minimum income
- credit score >= minimum credit score
- medical risk <= maximum medical risk
- the issuer signature is valid
- this credential is present in the active registry root
- the credential is bound to the connected wallet and has a signed expiry
- the proof is bound to one policy ID and its current proof nonce

The twelve public signals, in order, are: `eligible`, `nullifier`, `minIncome`, `minCreditScore`, `maxMedicalRisk`, `holderAddress`, `policyId`, `policyNonce`, `credentialRoot`, `credentialExpiry`, `issuerAx`, and `issuerAy`. Income, credit score, medical risk, credential ID, signature, and Merkle path remain private. The wallet, policy thresholds, expiry, issuer key, and registry root are public.

## 4. On-chain verifier and revocation
`Groth16Verifier.sol` is generated from the exact final zkey using snarkjs. `LifeInsurancePolicy.sol` calls it and checks all public context against contract state, rejects expired credentials, and consumes the policy-specific nullifier. The contract owner can publish a new active credential root after revocation; an old credential proof then fails.

Groth16 is used by the application. The setup also generates PLONK artifacts for an experimental comparison of proof size and proving/verification time. They are not wired as a second on-chain policy verifier.

## 5. Demo premium gate
After a valid proof, the contract marks the policy PaymentDue. The holder then confirms a simulated first-premium action. That local demo transaction transfers no funds and changes the policy status to Active.

## 6. Disbursement extension
The second flow can use a similar pattern:

Claim -> private proof of death/claim eligibility -> verifier -> settlement smart contract -> payout.

A production implementation needs an independently governed issuer, secure key management, audited circuits and contracts, a public multi-party Groth16 ceremony (or a production-reviewed alternative), a larger revocation registry, and authoritative data attestations. The local issuer, registry, and setup are for coursework only.
