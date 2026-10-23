# Local ZKP files

This folder holds generated circuit artifacts, the local demo issuer key, credential registry, and issued credentials. Sensitive/local JSON files are ignored by Git; do not back them up to a public repository.

## Local flow

1. Run `npm run zkp:setup` to compile the circuit and generate Groth16 plus PLONK keys and verifiers.
2. Run `npm run zkp:issuer:init` once to generate a local issuer key.
3. Issue a credential with `npm run zkp:issuer:issue -- <wallet> <income> <credit-score> <medical-risk> <expiry-unix>`.
4. Deploy the verifier and policy using `node scripts/deploy.cjs`; the deploy script reads the issuer key and registry root.
5. Import the matching credential JSON in the app.
6. After credential issue or revocation on an existing deployment, publish the new root with `npm run zkp:publish-root`.

`npm run zkp:test:circuit` performs adversarial witness checks. `npm run zkp:compare` measures proof size and local proving/verification time for Groth16 and PLONK. `npm run zkp:compare:gas` estimates verifier gas on an ephemeral Hardhat EVM. The local issuer does not authenticate any source documents; all components are coursework/demo quality.
