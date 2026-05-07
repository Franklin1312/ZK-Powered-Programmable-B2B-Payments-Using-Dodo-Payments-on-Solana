const express = require("express");
const router  = express.Router();
const { generateProof, verifyProof } = require("../services/zk");

router.post("/generate", async (req, res) => {
  try {
    const { privateValue, salt, threshold, commitment } = req.body;
    console.log("[Proof] Generating proof for threshold:", threshold, "value:", privateValue);

    const { proof, publicSignals } = await generateProof(
      privateValue, salt, threshold, commitment
    );

    const valid = await verifyProof(proof, publicSignals);
    if (!valid) return res.status(400).json({ error: "Proof verification failed after generation." });

    console.log("[Proof] Valid proof generated");
    res.json({ success: true, proof, publicSignals, verified: true });
  } catch (err) {
    const raw = err.message || "";
    let friendly = raw;

    if (raw.includes("Assert Failed") || raw.includes("assert")) {
      const pv  = Number(req.body.privateValue);
      const thr = Number(req.body.threshold);
      if (!isNaN(pv) && !isNaN(thr)) {
        if (pv <= thr) {
          friendly = `SLA condition not met: your value (${pv} = ${(pv/100).toFixed(2)}%) must be greater than the threshold (${thr} = ${(thr/100).toFixed(2)}%). Increase your SLA value or check the threshold.`;
        } else {
          friendly = `ZK assertion failed: the commitment does not match Poseidon(${pv}, ${req.body.salt}). Make sure privateValue and salt match exactly what was used to generate the commitment hash.`;
        }
      } else {
        friendly = "ZK assertion failed: privateValue must be greater than threshold, and commitment must match Poseidon(privateValue, salt).";
      }
    } else if (raw.includes("Not enough values") || raw.includes("not enough")) {
      friendly = "Missing ZK inputs: check that privateValue, salt, threshold and commitment are all provided.";
    } else if (raw.includes("ENOENT") || raw.includes("no such file")) {
      friendly = "ZK circuit files not found. Run the compile step first.";
    }

    console.error("[Proof] Error:", raw);
    res.status(400).json({ error: friendly, detail: raw });
  }
});

module.exports = router;