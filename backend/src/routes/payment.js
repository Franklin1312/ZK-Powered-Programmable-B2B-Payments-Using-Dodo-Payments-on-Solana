const express = require("express");
const router = express.Router();
const dodo = require("../services/dodo");
const solana = require("../services/solana");
const { computeCommitment } = require("../services/zk");

router.post("/create", async (req, res) => {
  try {
    const { amount, threshold, recipientPubkey, privateValue, salt } = req.body;

    // 1. Compute ZK commitment off-chain
    const commitment = await computeCommitment(privateValue, salt);
    console.log("[Payment] Commitment:", commitment);

    // 2. Mock Dodo payment
    const intent = await dodo.createPaymentIntent({
      amount,
      currency: "USD",
      recipientId: recipientPubkey,
      metadata: { threshold, commitment },
    });
    await dodo.confirmPayment(intent.id);

    // 3. Lock funds on Solana
    const { escrowPDA, tx } = await solana.initializeEscrow({
      recipientPubkey,
      amount: amount * 1_000_000,
      threshold,
      commitment,
    });

    res.json({ success: true, paymentId: intent.id, escrowPDA, tx, commitment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
