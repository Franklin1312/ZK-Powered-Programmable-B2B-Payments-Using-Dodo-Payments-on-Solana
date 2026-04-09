const express = require("express");
const router = express.Router();
const { generateProof, verifyProof } = require("../services/zk");

// POST /api/proof/generate
// Called by recipient with their private data
router.post("/generate", async (req, res) => {
  try {
    const { privateValue, salt, threshold, commitment } = req.body;

    // Generate ZK proof (private data never leaves backend)
    const { proof, publicSignals } = await generateProof(
      privateValue, salt, threshold, commitment
    );

    // Verify locally before sending to chain
    const isValid = await verifyProof(proof, publicSignals);
    if (!isValid) {
      return res.status(400).json({ error: "Proof generation failed verification" });
    }

    res.json({ success: true, proof, publicSignals, verified: isValid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;