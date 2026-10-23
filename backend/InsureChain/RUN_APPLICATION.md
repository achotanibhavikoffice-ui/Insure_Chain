# Run InsureChain Locally (Windows)

This guide runs the React frontend, Express/MongoDB authentication backend, and a local Hardhat blockchain. It assumes PowerShell and that dependencies are installed from the project root.

## What runs

| Part            | Purpose                              | Local address                              |
| --------------- | ------------------------------------ | ------------------------------------------ |
| Vite frontend   | Website and wallet interface         | `http://localhost:5173`                    |
| Express backend | Register/login API                   | `http://localhost:3000`                    |
| MongoDB         | Stores account records               | `mongodb://127.0.0.1:27017/life_insurance` |
| Hardhat node    | Local EVM for contracts and MetaMask | `http://127.0.0.1:8545`                    |

## 1. Prerequisites

- Install Node.js LTS.
- Install and start MongoDB Community Server, or run another MongoDB instance and use its connection string below.
- Install MetaMask in your browser.

The local MongoDB service must be running before starting the backend. The example connection string points to a MongoDB server on this computer.

## 2. Install packages

Open PowerShell in the project root (`D:\Projects\life-insurance-blockchain`) and run:

```powershell
npm.cmd install
npm.cmd install --prefix backend
```

`npm.cmd` avoids PowerShell's script execution policy issue with `npm.ps1`.

## 3. Configure the backend

Create or update `backend/.env` with:

```env
MONGO_URI=mongodb://127.0.0.1:27017/life_insurance
JWT_SECRET=replace-this-with-a-long-random-local-secret
PORT=3000
```

Keep this file local; do not commit it. `PORT` is optional because the backend defaults to port 3000. `JWT_SECRET` must be set for login to issue a token.

## 4. Compile the contracts

From the project root:

```powershell
npm.cmd run contracts:compile
```

The repository includes `contracts/Groth16Verifier.sol` and browser proving files under `public/zkp/`, so the initial local run does not require generating a new ZKP setup.

## 5. Start the Hardhat local blockchain

Open a second PowerShell window in the project root and run:

```powershell
npx.cmd hardhat node
```

Leave this window running. Hardhat prints local test accounts and their private keys. These accounts have local test ETH and are only for development.

## 6. Deploy the contracts locally

Open a third PowerShell window in the project root and run:

```powershell
npx.cmd hardhat run scripts/deploy.cjs --network localhost
```

The local `localhost` Hardhat network is configured in `hardhat.config.cjs`. The command prints the verifier and policy contract addresses. Copy the **LifeInsurancePolicy** address.

Create or update `.env.local` in the project root:

```env
VITE_POLICY_CONTRACT_ADDRESS=PASTE_THE_LIFE_INSURANCE_POLICY_ADDRESS_HERE
```

Restart the Vite server whenever you change `.env.local`; Vite reads these variables when it starts.

## 7. Add the local chain to MetaMask

In MetaMask, open the network selector, select **Add network** and then **Add a custom network**. Use:

| Field              | Value                   |
| ------------------ | ----------------------- |
| Network name       | `InsureChain Local`     |
| RPC URL            | `http://127.0.0.1:8545` |
| Chain ID           | `31337`                 |
| Currency symbol    | `ETH`                   |
| Block explorer URL | Leave blank             |

Save and switch to this network. Then import one of the local test accounts shown by `hardhat node`: in MetaMask, choose **Add account** → **Import account**, and paste that account's private key. Use these predictable test keys only on the local chain. Never use them for real funds or import your real wallet's recovery phrase into a development tool.

## 8. Start the backend

Open another PowerShell window in the project root and run:

```powershell
Set-Location backend
node server.js
```

Keep it running. Starting from `backend` makes `dotenv` load `backend/.env`. On success, the terminal should report MongoDB connected and the server listening on port 3000.

## 9. Start the frontend

Open another PowerShell window in the project root and run:

```powershell
npm.cmd run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Register a local test account, sign in, connect the imported MetaMask account, and proceed from the dashboard into policy onboarding.

## Start order quick reference

For a normal session, keep these running in separate terminals:

1. MongoDB service
2. `npx.cmd hardhat node`
3. `node backend/server.js`
4. `npm.cmd run dev`

Deploy the contracts after starting Hardhat when the node has restarted or no deployment exists on its current chain state. A local Hardhat node is in-memory: stopping it clears its deployed contracts and test chain state. Redeploy, then update `VITE_POLICY_CONTRACT_ADDRESS` if the address changes.

## ZKP signal layout and local artifacts

The circuit exposes four public signals (`eligible` plus the three thresholds). The policy, verifier interface, and frontend pass all four signals in that order. Recompile and redeploy the contracts after pulling code changes so the local deployment uses the current ABI.

The onboarding form uses demonstration values. The current backend stores Aadhaar numbers as plain strings and hashes only the date of birth; use test data locally, not real identity or health/financial information.

## Optional: regenerate ZKP artifacts

Only do this if you intentionally change the circuit or need fresh prover/verifier artifacts. Install the native Circom CLI first. The setup script creates a development proving setup and can take a while:

```powershell
npm.cmd run zkp:setup
npm.cmd run zkp:prove
npm.cmd run zkp:verify
```

After setup, copy the generated `zkp/build/LifeInsuranceEligibility_js/LifeInsuranceEligibility.wasm` and `zkp/build/LifeInsuranceEligibility_final.zkey` into `public/zkp/` so the browser can use the matching artifacts, and redeploy the updated contracts. A local setup is for development/demo use, not production cryptographic assurances.
