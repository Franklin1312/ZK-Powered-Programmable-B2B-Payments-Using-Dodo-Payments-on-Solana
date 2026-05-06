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
    if (!valid) return res.status(400).json({ error: "Proof invalid" } );

    console.log("[Proof] Valid proof generated");
    res.json({ success: true, proof, publicSignals, verified: true });
  } catch (err) {
  // Circom wraps the real reason — dig it out
  const raw = err.message || "";
  let friendly = raw;

  if (raw.includes("Assert Failed")) {
    const val  = req.body.privateValue;
    const thr  = req.body.threshold;
    if (val && thr) {
      friendly = `ZK assertion failed: privateValue (${val}) must be greater than threshold (${thr}). Your SLA value does not meet the required threshold.`;
    } else {
      friendly = "ZK assertion failed: the private value does not satisfy the threshold condition.";
    }
  } else if (raw.includes("Not enough values")) {
    friendly = "ZK error: missing input values. Check commitment, privateValue and salt.";
  }

  console.error("[Proof] Error:", raw);
  res.status(400).json({ error: friendly, detail: raw });
}
});

module.exports = router;
