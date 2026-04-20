const express = require("express");
const router  = express.Router();
const dodo    = require("../services/dodo");
const solana  = require("../services/solana");
const { computeCommitment } = require("../services/zk");

router.post("/create", async (req, res) => {
  try {
    const { amount, threshold, recipientPubkey, privateValue, salt } = req.body;

    const commitment = await computeCommitment(privateValue, salt);
    console.log("[Payment] Commitment:", commitment.slice(0, 20) + "...");

    const intent = await dodo.createPaymentIntent({
      amount,
      currency:    "USD",
      recipientId: recipientPubkey,
      metadata:    { threshold, commitment, recipientId: recipientPubkey, privateValue, salt },
    });

    await dodo.confirmPayment(intent.id);

    const { escrowPDA, tx } = await solana.initializeEscrow({
      recipientPubkey,
      amount: amount * 1_000_000,
      threshold,
      commitment,
    });

    res.json({
      success:     true,
      paymentId:   intent.id,
      checkoutUrl: null,
      isSimulated: true,
      escrowPDA,
      tx,
      commitment,
    });
  } catch (err) {
    console.error("[Payment] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

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
