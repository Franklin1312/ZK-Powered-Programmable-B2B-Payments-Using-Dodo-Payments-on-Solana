const express = require("express");
const router = express.Router();
const { verifyProof } = require("../services/zk");
const solana = require("../services/solana");

router.post("/", async (req, res) => {
  try {
    const { proof, publicSignals, payerPubkey, escrowPDA, recipientPubkey } = req.body;

    // Re-verify proof before releasing
    const valid = await verifyProof(proof, publicSignals);
    if (!valid) return res.status(400).json({ error: "Invalid ZK proof" });

    const result = await solana.releasePayment({ payerPubkey, escrowPDA, recipientPubkey, proof, publicSignals });
    res.json({
      success: true,
      tx: result.sig,
      serializedTx: result.serializedTx || null,
      requiresClientSignature: Boolean(result.requiresClientSignature),
      alreadyReleased: result.alreadyReleased,
      message: result.alreadyReleased
        ? "Payment was already released on-chain — escrow is settled."
        : result.requiresClientSignature
          ? "Sign the transaction in your wallet to release payment."
          : "Payment released!",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
