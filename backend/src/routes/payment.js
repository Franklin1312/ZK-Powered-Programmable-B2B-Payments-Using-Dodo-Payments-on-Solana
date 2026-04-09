const express = require("express");
const router = express.Router();
const dodo = require("../services/dodo");
const solana = require("../services/solana");
const { computeCommitment } = require("../services/zk");
const { Keypair } = require("@solana/web3.js");

// POST /api/payment/create
// Called by payer to set up escrow
router.post("/create", async (req, res) => {
  try {
    const { amount, threshold, recipientPubkey, privateValue, salt } = req.body;

    // 1. Compute ZK commitment (off-chain)
    const commitment = await computeCommitment(privateValue, salt);

    // 2. Create Dodo payment intent (fiat → USDC)
    const paymentIntent = await dodo.createPaymentIntent({
      amount,
      currency: "USD",
      recipientId: recipientPubkey,
      metadata: { threshold, commitment },
    });

    // 3. Simulate payment confirmation (mock Dodo webhook)
    await dodo.confirmPayment(paymentIntent.id);

    // 4. Lock funds on Solana
    const payerKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.PAYER_PRIVATE_KEY))
    );

    const { escrowPDA, tx } = await solana.initializeAndDeposit({
      payerKeypair,
      recipientPubkey,
      amount: amount * 1_000_000, // USDC has 6 decimals
      threshold,
      commitment,
    });

    res.json({
      success: true,
      paymentId: paymentIntent.id,
      escrowPDA,
      tx,
      commitment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;