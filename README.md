# Colosseum

Colosseum is a multi-escrow B2B payments demo built with:

- Solana Anchor for on-chain escrow state
- React + Vite for the frontend
- Node.js/Express for the backend API
- Circom / SnarkJS for zero-knowledge proof generation
- Dodo Payments integration for fiat-to-crypto flow simulation

## What it does

- Creates escrow payments with a payer, recipient, amount, and threshold
- Generates a ZK proof for the recipient's SLA condition
- Releases escrow when the proof verifies
- Supports testnet deployment and local development

## Project Layout

- `backend/` - Express API, Solana integration, and proof verification
- `frontend/` - React UI for payer, recipient, and status views
- `program/` - Anchor program for escrow logic
- `zk/` - Circom circuit, proving artifacts, and verification key
- `SETUP.md` - Full setup, deployment, and troubleshooting guide

## Quick Start

```bash
cd backend
npm install
node src/index.js
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

## Testnet Deploy

See [SETUP.md](SETUP.md) for the full Solana testnet deployment steps and environment variable setup.

## Notes

- The backend expects the deployed Anchor IDL at `program/target/idl/escrow.json`
- The frontend talks to the backend API at `/api` by default
- The recipient wallet shown in the UI should match the escrow recipient stored on-chain
