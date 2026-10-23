# Windows setup

1. Install Node.js LTS.
2. Open PowerShell in this project.
3. Run `npm install`.
4. Run `npm run contracts:compile`.
5. Run `npm run contracts:test`.
6. Run `npm run zkp:setup`.
7. Run `npm run zkp:prove`.
8. Run `npm run zkp:verify`.

The ZKP setup can take a while because it creates proving artifacts. Do not close the terminal while it is running.

For browser proving, copy:

- `zkp/build/LifeInsuranceEligibility_js/` -> `public/zkp/LifeInsuranceEligibility_js/`
- `zkp/build/LifeInsuranceEligibility_final.zkey` -> `public/zkp/LifeInsuranceEligibility_final.zkey`

Then create `public/zkp/input.json` for the demo. Do not place real medical/financial records in the public directory in a real deployment.
