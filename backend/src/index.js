require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");

console.log("Starting backend server...");
console.log("NODE_ENV:", process.env.NODE_ENV || "development");
console.log("SOLANA_RPC:", process.env.SOLANA_RPC);
console.log("PROGRAM_ID:", process.env.PROGRAM_ID);

const app = express();
app.use(cors());
app.use(express.json());

console.log("Loading routes...");
try {
  app.use("/api/payment", require("./routes/payment"));
  app.use("/api/proof", require("./routes/proof"));
  app.use("/api/release", require("./routes/release"));
  console.log("Routes loaded successfully");
} catch (err) {
  console.error("FATAL: Error loading routes:", err);
  process.exit(1);
}

app.get("/api/status/:escrowPda", async (req, res) => {
  try {
    const anchor = require("@coral-xyz/anchor");
    const { Connection, PublicKey, Keypair } = require("@solana/web3.js");

    const conn = new Connection(process.env.SOLANA_RPC, "confirmed");
    const idl = require("../../program/target/idl/escrow.json");
    const wallet = new anchor.Wallet(Keypair.generate());
    const provider = new anchor.AnchorProvider(conn, wallet, {});
    const program = new anchor.Program(idl, provider);

    const state = await program.account.escrowState.fetch(
      new PublicKey(req.params.escrowPda)
    );

    res.json({
      payer: state.payer.toBase58(),
      recipient: state.recipient.toBase58(),
      amount: state.amount.toString(),
      threshold: state.threshold.toString(),
      isReleased: state.isReleased,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/health", (_, res) => {
  res.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/", (_, res) => res.json({ status: "ZK B2B Payments API running" }));

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`✓ Backend listening on http://${HOST}:${PORT}`);
  console.log(`✓ Health check: GET /health`);
  console.log(`✓ Status endpoint: GET /api/status/:escrowPda`);
  console.log(`✓ Ready to receive requests`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ Port ${PORT} is already in use`);
    process.exit(1);
  } else if (err.code === 'EACCES') {
    console.error(`✗ Permission denied to bind to port ${PORT}`);
    process.exit(1);
  } else {
    console.error(`✗ Server error:`, err.message);
    process.exit(1);
  }
});
