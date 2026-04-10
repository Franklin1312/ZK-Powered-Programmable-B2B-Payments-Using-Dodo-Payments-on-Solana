#!/usr/bin/env node
/**
 * Minimal test server to diagnose startup issues
 * Run: node test-server.js
 */

const path = require('path');
const fs = require('fs');

// Load environment explicitly from the backend directory
const envPath = path.join(__dirname, '.env');
require("dotenv").config({ path: envPath });

console.log("=== Colosseum Backend - Diagnostic Test ===\n");

// Check .env file
console.log(`Environment file: ${envPath}`);
console.log(`File exists: ${fs.existsSync(envPath) ? '✓' : '✗'}\n`);

// Test 1: Environment
console.log("1. Checking environment variables...");
const requiredEnvVars = ['SOLANA_RPC', 'PROGRAM_ID', 'PAYER_PRIVATE_KEY', 'RECIPIENT_PRIVATE_KEY'];
const missingEnv = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnv.length > 0) {
  console.log(`   ⚠ Missing: ${missingEnv.join(', ')}`);
  console.log("   Note: Check backend/.env file exists and has values");
  console.log("\n   Current environment:");
  requiredEnvVars.forEach(v => {
    const val = process.env[v];
    const display = val ? `${val.substring(0, 30)}...` : 'NOT SET';
    console.log(`   ${v}: ${display}`);
  });
} else {
  console.log("   ✓ SOLANA_RPC:", process.env.SOLANA_RPC);
  console.log("   ✓ PROGRAM_ID:", process.env.PROGRAM_ID);
  console.log("   ✓ PAYER_PRIVATE_KEY: (array of length " + JSON.parse(process.env.PAYER_PRIVATE_KEY).length + ")");
  console.log("   ✓ RECIPIENT_PRIVATE_KEY: (array of length " + JSON.parse(process.env.RECIPIENT_PRIVATE_KEY).length + ")");
}

// Test 2: Dependencies
console.log("\n2. Checking critical dependencies...");
try {
  require("express");
  console.log("   ✓ express");
} catch (e) {
  console.log("   ✗ express:", e.message);
}

try {
  require("cors");
  console.log("   ✓ cors");
} catch (e) {
  console.log("   ✗ cors:", e.message);
}

try {
  require("@coral-xyz/anchor");
  console.log("   ✓ @coral-xyz/anchor");
} catch (e) {
  console.log("   ✗ @coral-xyz/anchor:", e.message);
}

// Test 3: File paths
console.log("\n3. Checking required files...");
const fs = require('fs');
const path = require('path');

// Get the workspace root (parent of backend directory)
const workspaceRoot = path.resolve(__dirname, '..');

const filesToCheck = [
  { label: 'program/target/idl/escrow.json', path: path.join(workspaceRoot, 'program/target/idl/escrow.json') },
  { label: 'zk/build/threshold_js/threshold.wasm', path: path.join(workspaceRoot, 'zk/build/threshold_js/threshold.wasm') },
  { label: 'zk/keys/threshold_final.zkey', path: path.join(workspaceRoot, 'zk/keys/threshold_final.zkey') },
  { label: 'zk/keys/verification_key.json', path: path.join(workspaceRoot, 'zk/keys/verification_key.json') }
];

filesToCheck.forEach(({ label, path: filePath }) => {
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${label}`);
  } else {
    console.log(`   ✗ ${label}`);
    console.log(`     Expected at: ${filePath}`);
  }
});

// Test 4: Start minimal server
console.log("\n4. Starting minimal test server...");
try {
  const express = require('express');
  const cors = require('cors');
  
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  app.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  app.get('/', (_, res) => {
    res.json({ status: 'test server running' });
  });
  
  const PORT = process.env.TEST_PORT || 3001;
  const HOST = '0.0.0.0';
  
  const server = app.listen(PORT, HOST, () => {
    console.log(`   ✓ Test server listening on ${HOST}:${PORT}`);
    console.log("\n=== Diagnostic Complete ===");
    console.log("If all tests pass, try: npm run dev");
    console.log("To test the server: curl http://localhost:3001/health");
    process.exit(0);
  });
  
  server.on('error', (err) => {
    console.log(`   ✗ Failed to start: ${err.message}`);
    process.exit(1);
  });
} catch (err) {
  console.log(`   ✗ Error: ${err.message}`);
  process.exit(1);
}
