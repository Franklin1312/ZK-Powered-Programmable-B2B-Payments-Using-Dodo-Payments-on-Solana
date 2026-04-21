# ZK-Powered Programmable B2B Payments Using Dodo Payments on Solana

This project demonstrates a programmable B2B escrow flow on Solana where a payer locks funds, a recipient proves SLA conditions with a zero-knowledge proof, and the payment is released once the proof verifies.

The stack combines:

- Solana Anchor for on-chain escrow state and release logic
- React + Vite for the payer, recipient, and status dashboards
- Node.js + Express for the backend API and Solana orchestration
- Circom + SnarkJS for zero-knowledge proof generation and verification
- Dodo Payments for fiat-to-crypto payment flow simulation

## Overview

The application is designed around a simple programmable escrow lifecycle:

1. The payer enters an amount, recipient wallet, and SLA threshold.
2. The backend creates or reuses a Solana escrow account and stores the escrow metadata on-chain.
3. The recipient generates a ZK proof locally to show the SLA condition was met without revealing the raw value.
4. The release transaction is signed by the connected wallet and submitted to Solana.
5. The UI and backend surface escrow status, transaction history, and release state.

## Key Features

- Multi-escrow support with escrow PDAs derived from payer and payment reference
- Recipient identity persisted in on-chain escrow state
- ZK proof generation for private SLA verification
- Phantom wallet signing for the release step
- Dodo Payments mock flow for fiat payment simulation
- Testnet-ready Solana deployment workflow
- Backend status, demo, and health endpoints for debugging

## Repository Layout

- `backend/` - Express API, Solana integration, proof verification, and webhook handling
- `frontend/` - React UI for the payer flow, recipient flow, and status checking
- `program/` - Anchor workspace and on-chain escrow program
- `zk/` - Circom circuit, witness generator, keys, and verification artifacts
- `SETUP.md` - Full environment setup, deployment, and troubleshooting guide

## How It Works

### 1. Create Escrow
The payer submits:

- amount
- threshold
- recipient wallet address
- private SLA value
- salt

The backend computes a commitment hash, creates the escrow instruction, and stores the recipient and escrow metadata on-chain.

### 2. Generate Proof
The recipient provides the private SLA value and salt locally. The frontend generates a ZK proof that the value satisfies the threshold condition.

### 3. Release Payment
The backend validates the proof and prepares the release transaction. The connected recipient wallet signs the transaction in Phantom, and the signed transaction is broadcast to Solana.

### 4. Inspect Status
The status flow reads the escrow account from chain and displays payer, recipient, amount, threshold, and release state.

## Prerequisites

- Node.js and npm
- Solana CLI
- Anchor CLI
- A Phantom wallet for signing release transactions
- A Solana testnet wallet for deployment and fees

## Local Development

### Backend

```bash
cd backend
npm install
npm start
```

Backend defaults to port `3001` and exposes health and escrow status endpoints.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend defaults to Vite on port `5173`.

### Build Frontend for Production

```bash
cd frontend
npm run build
```

## Environment Variables

The backend expects values in `backend/.env`:

- `PORT` - Backend port, default `3001`
- `SOLANA_RPC` - Solana RPC endpoint
- `PROGRAM_ID` - Deployed Anchor program ID
- `PAYER_PRIVATE_KEY` - Payer keypair JSON array
- `RECIPIENT_PRIVATE_KEY` - Recipient keypair JSON array
- `USDC_MINT` - USDC mint address for the target cluster

The frontend optionally supports:

- `VITE_API_URL` - Explicit backend API base URL
- `VITE_SOLANA_RPC` - Solana RPC endpoint used for confirmation after wallet signing

## Available Scripts

### Backend

```bash
npm start
```

Starts the Express API from `backend/src/index.js`.

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

- `dev` starts the Vite development server
- `build` produces the production bundle
- `preview` serves the production build locally

## Solana Testnet Deployment

See [SETUP.md](SETUP.md) for the full deployment flow.

The usual path is:

```bash
cd program
powershell -ExecutionPolicy Bypass -File .\deploy-testnet.ps1
```

That script builds and deploys the Anchor program to Solana testnet and prints the deployed program ID.

## Useful Endpoints

- `GET /health` - Backend health check
- `GET /api/demo` - Demo state payload
- `GET /api/status/:escrowPda` - Fetch on-chain escrow status
- `POST /api/payment/create` - Create escrow payment
- `POST /api/proof/generate` - Generate proof payload
- `POST /api/release` - Verify proof and release payment

## Notes

- The backend reads the Anchor IDL from `program/target/idl/escrow.json`
- The frontend uses `/api` by default and can be pointed at a custom backend with `VITE_API_URL`
- The recipient wallet used for release must match the escrow recipient stored on-chain
- `SETUP.md` contains the full troubleshooting guide and Codespaces instructions
