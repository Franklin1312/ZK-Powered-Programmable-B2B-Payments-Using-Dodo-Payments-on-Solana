const express = require("express");
const router = express.Router();
const solana = require("../services/solana");
const { verifyProof } = require("../services/zk");
const { Keypair } = require("@solana/web3.js");

// POST /api/release
// Called after proof generation to release funds
router.post("/", async (req, res) => {
  try {
    const { proof, publicSignals, payerPubkey } = req.body;

    // Verify proof one more time
    const isValid = await verifyProof(proof, publicSignals);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid ZK proof" });
    }

    // Release funds on Solana
    const recipientKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.RECIPIENT_PRIVATE_KEY))
    );

    const tx = await solana.releasePayment({
      recipientKeypair,
      payerPubkey,
      proof,
      publicSignals,
    });

    res.json({ success: true, tx, message: "Payment released!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;