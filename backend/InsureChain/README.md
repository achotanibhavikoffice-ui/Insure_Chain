# InsureChain — Smart Contracts + ZKP Life Insurance

This is the full student-project starter for **Smart Contracts and ZKP for Building an Efficient Life Insurance Policy Onboarding and Disbursement Process**.

## Included

- React + Vite frontend
- Real MetaMask connection
- Sepolia network handling
- Policy onboarding UI
- Circom 2.1.1 eligibility circuit
- Groth16 setup/proving/verifying scripts using snarkjs
- Solidity policy contract
- Development-only mock verifier
- Generated-verifier workflow (`snarkjs zkey export solidityverifier`)
- Hardhat contract tests
- Frontend hooks for real proof generation + contract verification after artifacts/deployment
- Architecture documentation

## Important: what is cryptographically real

The circuit source and the smart-contract integration are real. The final Groth16 verifier contract is **generated from the circuit-specific zkey**, because a verifier is mathematically tied to the exact proving key. This ZIP therefore contains the complete reproducible setup rather than pretending that a generic verifier is valid for this circuit.

Official Circom documentation explains that Circom compiles circuits into constraint systems/WASM and that snarkjs can generate proofs, verify them and export a Solidity verifier. citeturn0search0turn0search2

## First setup

```bash
npm install
npm run contracts:compile
npm run contracts:test
npm run zkp:setup
npm run zkp:prove
npm run zkp:verify
```

`npm run zkp:setup` creates a local development Powers of Tau setup, creates the Groth16 zkey, exports `verification_key.json`, and generates `contracts/Groth16Verifier.sol`.

For an actual public deployment, replace the local development ceremony with an appropriate trusted public ceremony/MPC contribution. The Circom/snarkjs workflow supports this model. citeturn0search2

## Deploy

1. Deploy `contracts/Groth16Verifier.sol` after ZKP setup.
2. Put its address into `VERIFIER_ADDRESS`.
3. Deploy `LifeInsurancePolicy.sol` using that verifier address.
4. Put the policy contract address in `.env.local` as `VITE_POLICY_CONTRACT_ADDRESS`.
5. Copy the circuit WASM and final zkey to `public/zkp/` if you want browser-side proving.
6. Run the frontend.

## Development-only shortcut

`MockZKPVerifier.sol` accepts any proof and is only for testing the policy transaction flow. **Never use it for the final demonstration of cryptographic verification.**

## Privacy

Do not store raw medical records, financial records, death certificates, or other sensitive records on a public blockchain. The intended design is to prove a predicate about private data and reveal only the public signals required by the policy.
