const express = require("express");
const router  = express.Router();
const dodo    = require("../services/dodo");
const { computeCommitment } = require("../services/zk");

// POST /api/payment/create
// Creates a Dodo checkout session (real API, test mode).
// Returns { checkoutUrl, sessionId, localId, commitment }
// The frontend opens the overlay checkout with the checkoutUrl.
// Escrow is created later when the webhook fires.
router.post("/create", async (req, res) => {
  try {
    const {
      amount,
      threshold,
      recipientPubkey,
      privateValue,
      salt,
      payerPubkey,
      customerEmail,
    } = req.body;

    // 1. Compute ZK commitment off-chain
    const commitment = await computeCommitment(privateValue, salt);
    console.log("[Payment] Commitment:", commitment.slice(0, 20) + "...");

    // 2. Create Dodo checkout session with metadata
    const session = await dodo.createCheckoutSession({
      amount: Number(amount),
      recipientId: recipientPubkey,
      metadata: {
        threshold:       String(threshold),
        commitment,
        recipientPubkey,
        privateValue:    String(privateValue),
        salt:            String(salt),
        payerPubkey:     payerPubkey || "",
      },
      returnUrl: process.env.FRONTEND_URL,
      customerEmail: customerEmail || "payer@test.com",
    });

    res.json({
      success:     true,
      checkoutUrl: session.checkoutUrl,
      sessionId:   session.sessionId,
      localId:     session.localId,
      commitment,
    });
  } catch (err) {
    console.error("[Payment] Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// GET /api/payment/status/:localId
// Frontend polls this after checkout completes to check if
// the webhook has processed and the escrow has been created.
router.get("/status/:localId", async (req, res) => {
  try {
    const localId = req.params.localId;
    let payment = dodo.getPayment(localId);

    // Fallback to demo-state.json if SQLite row is missing
    if (!payment) {
      try {
        const fs = require("fs");
        const path = require("path");
        const demoPath = path.join(__dirname, "../../demo-state.json");
        if (fs.existsSync(demoPath)) {
          const demoState = JSON.parse(fs.readFileSync(demoPath, "utf8"));
          if (demoState.paymentRef === localId && demoState.escrowPDA) {
            return res.json({
              localId: demoState.paymentRef,
              status: "confirmed",
              escrowPDA: demoState.escrowPDA,
              escrowTx: null,
              amount: 10,
              commitment: demoState.commitment,
              recipientPubkey: demoState.recipientPubkey,
              threshold: demoState.threshold,
            });
          }
        }
      } catch (e) {
        console.error("Fallback check failed:", e.message);
      }
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json({
      localId:      payment.id,
      status:       payment.status,
      escrowPDA:    payment.escrow_pda || null,
      escrowTx:     payment.escrow_tx || null,
      amount:       payment.amount,
      commitment:   payment.metadata?.commitment || null,
      recipientPubkey: payment.metadata?.recipientPubkey || payment.recipient_id,
      threshold:    payment.metadata?.threshold || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/:id — legacy compatibility
router.get("/:id", async (req, res) => {
  try {
    const payment = dodo.getPayment(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
