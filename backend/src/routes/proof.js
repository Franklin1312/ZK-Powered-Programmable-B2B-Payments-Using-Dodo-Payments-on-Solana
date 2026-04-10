const express = require("express");
const router = express.Router();
const { generateProof, verifyProof } = require("../services/zk");

router.post("/generate", async (req, res) => {
  try {
    const { privateValue, salt, threshold, commitment } = req.body;
    console.log("[Proof] Generating proof for threshold:", threshold);

    const { proof, publicSignals } = await generateProof(
      privateValue,
      salt,
      threshold,
      commitment
    );

    const valid = await verifyProof(proof, publicSignals);
    if (!valid) return res.status(400).json({ error: "Proof invalid" });

    console.log("[Proof] Valid proof generated");
    res.json({ success: true, proof, publicSignals, verified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
