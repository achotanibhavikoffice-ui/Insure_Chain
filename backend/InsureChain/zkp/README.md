# ZKP Build Directory

Generated artifacts are intentionally not committed to the starter project because they depend on the circuit-specific setup.

After `npm install`, run:

```bash
npm run zkp:setup
npm run zkp:prove
npm run zkp:verify
```

The setup script compiles the Circom circuit, creates a development Powers of Tau ceremony, creates the Groth16 proving key, exports the verification key, and generates `contracts/Groth16Verifier.sol`.
