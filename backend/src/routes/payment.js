const express = require("express");
const router  = express.Router();
const dodo    = require("../services/dodo");
const solana  = require("../services/solana");
const { computeCommitment } = require("../services/zk");

router.post("/create", async (req, res) => {
  try {
    const { amount, threshold, recipientPubkey, privateValue, salt } = req.body;

    // 1. Compute ZK commitment
    const commitment = await computeCommitment(privateValue, salt);
    console.log("[Payment] Commitment:", commitment.slice(0,20) + "...");

    // 2. Create Dodo payment intent (real or simulated)
    const intent = await dodo.createPaymentIntent({
      amount,
      currency: "USD",
      recipientId: recipientPubkey,
      metadata: { threshold, commitment, recipientId: recipientPubkey, privateValue, salt },
    });

    // 3. Simulate confirmation if no real Dodo key (no checkout flow needed)
    //    In production: webhook triggers this automatically
    const hasRealKey = process.env.DODO_API_KEY && !process.env.DODO_API_KEY.startsWith("sk_test_YOUR");
    if (!hasRealKey) {
      await dodo.confirmPayment(intent.id);
    }

    // 4. Lock funds on Solana (immediate in simulation, after webhook in production)
    const { escrowPDA, tx } = await solana.initializeEscrow({
      recipientPubkey,
      amount: amount * 1_000_000,
      threshold,
      commitment,
    });

    res.json({
      success:      true,
      paymentId:    intent.id,
      checkoutUrl:  intent.checkoutUrl,  // null in simulation, real URL in production
      isSimulated:  !hasRealKey,
      escrowPDA,
      tx,
      commitment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/:id — check payment status
router.get("/:id", async (req, res) => {
  try {
    const payment = await dodo.getPayment(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
