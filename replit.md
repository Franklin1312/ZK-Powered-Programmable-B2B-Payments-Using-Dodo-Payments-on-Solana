# Colosseum - ZK-Powered Conditional Payments

## Project Overview

Colosseum is a decentralized escrow and payment system using Solana smart contracts and Zero-Knowledge Proofs (ZKP) to enable trustless conditional payments. Funds are locked in an escrow and only released when the recipient proves (via ZK proof) that a private value meets a certain threshold, without revealing the actual value.

## Tech Stack

- **Frontend**: React + Vite (port 5000)
- **Backend**: Node.js + Express (port 3001)
- **Blockchain**: Solana with Anchor Framework
- **ZKP**: Circom circuits + SnarkJS
- **Package Manager**: npm

## Project Structure

```
frontend/       - React app (Vite dev server on port 5000)
backend/        - Express API server (port 3001)
program/        - Solana/Anchor smart contract (Rust)
zk/             - Zero-Knowledge circuits (Circom)
```

## Running the App

Two workflows are configured:
- **Start application** - Frontend on port 5000 (webview)
- **Backend API** - Backend on port 3001 (console)

## Environment Variables

Backend requires a `.env` file in `backend/`:
- `PORT` - Backend port (default: 3001)
- `SOLANA_RPC` - Solana RPC endpoint (devnet: https://api.devnet.solana.com)
- `PROGRAM_ID` - Deployed Anchor program ID
- `PAYER_PRIVATE_KEY` - Payer keypair (JSON array)
- `RECIPIENT_PRIVATE_KEY` - Recipient keypair (JSON array)
- `USDC_MINT` - USDC token mint address

## Key Files

- `frontend/vite.config.js` - Vite config (port 5000, allowedHosts: all)
- `frontend/src/utils/api.js` - Dynamic API URL detection
- `backend/src/index.js` - Express server entry point
- `backend/src/services/solana.js` - Solana/Anchor integration
- `backend/src/services/zk.js` - SnarkJS proof generation/verification
- `program/programs/escrow/src/lib.rs` - Solana escrow smart contract
- `zk/circuits/threshold.circom` - ZK circuit definition
