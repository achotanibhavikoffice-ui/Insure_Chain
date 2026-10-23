# Browser proof artifacts

`zkp:setup` writes the Groth16 proving WASM, final proving key, and matching verification key into this folder. These artifacts are public and are tied to the exact generated circuit and verifier contract. Regenerate and redeploy them together after any circuit change.

Do not store credential JSON or private applicant data here. PLONK artifacts are kept under the ignored `zkp/build` directory for comparison and are not used by the app.
