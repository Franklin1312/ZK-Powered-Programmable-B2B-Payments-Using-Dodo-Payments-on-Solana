require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");

console.log("Starting backend server...");
console.log("NODE_ENV:", process.env.NODE_ENV || "development");
console.log("SOLANA_RPC:", process.env.SOLANA_RPC);
console.log("PROGRAM_ID:", process.env.PROGRAM_ID);

const app = express();
app.use(cors());

// ── Dodo Payments webhook ────────────────────────────────────────────────────
// MUST be before express.json() — we need raw bytes for signature verification.
// We manually collect the stream so we get the body regardless of content-type.
app.post("/webhook/dodo", async (req, res) => {
  // Collect raw body from stream — works for ANY content-type
  const rawBody = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

  console.log("[Webhook] Received — size:", rawBody.length, "bytes");
  console.log("[Webhook] Content-Type:", req.headers["content-type"]);
  console.log("[Webhook] Headers:", {
    id: req.headers["webhook-id"],
    signature: req.headers["webhook-signature"],
    timestamp: req.headers["webhook-timestamp"],
  });

  // Acknowledge immediately — Dodo retries if no 2xx within 15s
  res.json({ received: true });

  if (!rawBody.length) {
    console.error("[Webhook] Empty body — nothing to process");
    return;
  }

  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  const hasRealSecret = secret && !secret.startsWith("whsec_YOUR");

  if (hasRealSecret) {
    try {
      const { Webhook } = require("standardwebhooks");
      const wh = new Webhook(secret);
      wh.verify(rawBody, {
        "webhook-id":        req.headers["webhook-id"],
        "webhook-signature": req.headers["webhook-signature"],
        "webhook-timestamp": req.headers["webhook-timestamp"],
      });
      console.log("[Webhook] Signature verified ✓");
    } catch (err) {
      console.error("[Webhook] Signature verification failed:", err.message);
      console.error("[Webhook] ⚠ Check that DODO_PAYMENTS_WEBHOOK_KEY in .env matches the secret shown in Dodo dashboard → Developers → Webhooks → your endpoint → Signing Secret");
      return; // reject — wrong secret or tampered payload
    }
  } else {
    console.log("[Webhook] Skipping signature verification (dev mode)");
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch (e) {
    console.error("[Webhook] Failed to parse JSON:", e.message);
    return;
  }

  console.log("[Webhook] Event:", event.type, "| ID:", event.data?.payment_id || event.data?.id || "N/A");

  // ── payment.succeeded → create Solana escrow ──────────────
  if (event.type === "payment.succeeded") {
    const metadata = event.data?.metadata || {};
    const localId = metadata.localId;

    if (!localId) {
      console.warn("[Webhook] No localId in metadata — skipping");
      return;
    }

    const dodo = require("./services/dodo");
    const solana = require("./services/solana");
    const zk = require("./services/zk");

    try {
      const threshold = Number(metadata.threshold);
      const recipientPubkey = metadata.recipientPubkey;
      const privateValue = metadata.privateValue;
      const salt = metadata.salt || "12345";
      const payerPubkey = metadata.payerPubkey;
      const amount = Number(event.data?.amount || event.data?.total_amount || 0);
      const dodoPaymentId = event.data?.payment_id || event.data?.id;

      if (!recipientPubkey || !threshold) {
        console.error("[Webhook] Missing recipientPubkey or threshold");
        dodo.failPayment(localId);
        return;
      }

      // Fetch the original requested amount from our database
      const paymentRecord = dodo.getPayment(localId);
      let finalAmountUsd = paymentRecord ? paymentRecord.amount : (amount / 100);

      const commitment = await zk.computeCommitment(privateValue, salt);
      console.log("[Webhook] Commitment:", commitment.slice(0, 20) + "...");

      const amountMicros = Math.round(finalAmountUsd * 1_000_000);
      console.log("[Webhook] Creating Solana escrow...", { recipientPubkey, amountMicros, threshold });

      const escrowResult = await solana.initializeEscrow({
        recipientPubkey,
        amount: amountMicros,
        threshold,
        commitment,
        paymentRef: localId,
      });

      dodo.confirmPayment(localId, {
        escrowPDA: escrowResult.escrowPDA,
        escrowTx: escrowResult.tx,
        dodoPaymentId,
      });

      console.log("[Webhook] ✓ Escrow created:", escrowResult.escrowPDA);
      console.log("[Webhook] ✓ Tx:", escrowResult.tx || "(reused existing)");

      const fs = require("fs");
      const pathMod = require("path");
      const { Keypair: KP } = require("@solana/web3.js");
      const backendPayer = KP.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.PAYER_PRIVATE_KEY))
      ).publicKey.toBase58();

      fs.writeFileSync(
        pathMod.join(__dirname, "../demo-state.json"),
        JSON.stringify({
          escrowPDA:       escrowResult.escrowPDA,
          payerPubkey:     payerPubkey || backendPayer,
          recipientPubkey,
          paymentRef:      localId,
          commitment,
          threshold,
          privateValue:    Number(privateValue),
          salt:            Number(salt),
        }, null, 2)
      );

    } catch (err) {
      console.error("[Webhook] Error creating escrow:", err.message);
      const dodo = require("./services/dodo");
      dodo.failPayment(localId);
    }
  }

  // ── payment.failed ─────────────────────────────────────────
  if (event.type === "payment.failed") {
    const metadata = event.data?.metadata || {};
    const localId = metadata.localId;
    if (localId) {
      const dodo = require("./services/dodo");
      dodo.failPayment(localId);
    }
    console.log("[Webhook] Payment failed:", event.data?.payment_id || "unknown");
  }
});

// ── Regular JSON middleware (after webhook) ──────────────────────────────────
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
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

// ── Solana escrow status ──────────────────────────────────────────────────────
app.get("/api/status/:escrowPda", async (req, res) => {
  try {
    const anchor = require("@coral-xyz/anchor");
    const { Connection, PublicKey, Keypair } = require("@solana/web3.js");

    const conn = new Connection(process.env.SOLANA_RPC, "confirmed");
    const idl = require("../../program/target/idl/escrow.json");
    const wallet = new anchor.Wallet(Keypair.generate());
    const provider = new anchor.AnchorProvider(conn, wallet, {});
    const program = new anchor.Program(idl, provider);

    const state = await program.account.escrowState.fetch(new PublicKey(req.params.escrowPda));

    // Read payerPubkey from demo-state.json — this is the actual Phantom wallet,
    // not the backend keypair that signed the Solana tx
    let displayPayer = state.payer.toBase58();
    try {
      const fs   = require("fs");
      const path = require("path");
      const demo = path.join(__dirname, "../demo-state.json");
      if (fs.existsSync(demo)) {
        const saved = JSON.parse(fs.readFileSync(demo, "utf8"));
        if (saved.payerPubkey) displayPayer = saved.payerPubkey;
      }
    } catch (_) {}

    res.json({
      payer:      displayPayer,
      recipient:  state.recipient.toBase58(),
      amount:     state.amount.toString(),
      threshold:  state.threshold.toString(),
      isReleased: state.isReleased,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Demo state ────────────────────────────────────────────────────────────────
app.get("/api/demo", (req, res) => {
  try {
    const path = require("path");
    const fs = require("fs");
    const { Keypair } = require("@solana/web3.js");

    const demoFile = path.join(__dirname, "../demo-state.json");
    if (fs.existsSync(demoFile)) {
      const saved = JSON.parse(fs.readFileSync(demoFile, "utf8"));
      // Only fall back to backend keypair if no real wallet was recorded
      if (!saved.payerPubkey) {
        const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.PAYER_PRIVATE_KEY)));
        saved.payerPubkey = payer.publicKey.toBase58();
      }
      return res.json(saved);
    }

    const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.PAYER_PRIVATE_KEY)));
    const recipient = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.RECIPIENT_PRIVATE_KEY)));
    res.json({
      escrowPDA: "", payerPubkey: payer.publicKey.toBase58(),
      recipientPubkey: recipient.publicKey.toBase58(),
      paymentRef: "", commitment: "", threshold: 9900, privateValue: 9950, salt: 12345,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Health & root ─────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() }));
app.get("/", (_, res) => res.json({ status: "ZK B2B Payments API running" }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`✓ Backend listening on http://${HOST}:${PORT}`);
  console.log(`✓ Webhook: POST /webhook/dodo`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") { console.error(`✗ Port ${PORT} in use`); process.exit(1); }
  else if (err.code === "EACCES") { console.error(`✗ Permission denied on port ${PORT}`); process.exit(1); }
  else { console.error("✗ Server error:", err.message); process.exit(1); }
});