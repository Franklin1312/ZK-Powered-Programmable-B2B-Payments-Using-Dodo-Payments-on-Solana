const express = require("express");
const router  = express.Router();
const https   = require("https");
const { computeCommitment } = require("../services/zk");

// ── Helper: call UptimeRobot API v2 ──────────────────────────────────────────
function uptimeRobotRequest(body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(body);
    const req  = https.request({
      hostname: "api.uptimerobot.com",
      path:     "/v2/getMonitors",
      method:   "POST",
      headers:  {
        "Content-Type":   "application/x-www-form-urlencoded",
        "Content-Length": data.length,
        "Cache-Control":  "no-cache",
      },
    }, (res) => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("Invalid JSON from UptimeRobot")); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// POST /api/sla/fetch
// Body: { apiKey: "ur...", monitorId?: "12345" }
// Returns list of monitors with uptime ratio converted to our 0-10000 scale
router.post("/fetch", async (req, res) => {
  const { apiKey, monitorId } = req.body;
  if (!apiKey) return res.status(400).json({ error: "UptimeRobot API key required" });

  try {
    const body = [
      `api_key=${encodeURIComponent(apiKey)}`,
      "format=json",
      "custom_uptime_ratios=30",   // 30-day uptime %
      monitorId ? `monitors=${monitorId}` : "",
      "logs=0",
    ].filter(Boolean).join("&");

    const data = await uptimeRobotRequest(body);

    if (data.stat !== "ok") {
      return res.status(400).json({ error: data.error?.message || "UptimeRobot API error" });
    }

    const monitors = (data.monitors || []).map(m => {
      const uptimePct  = parseFloat(m.custom_uptime_ratio || "0"); // e.g. 99.50
      const privateValue = Math.round(uptimePct * 100);             // e.g. 9950
      return {
        id:           m.id,
        name:         m.friendly_name,
        url:          m.url,
        uptimePct:    uptimePct.toFixed(3),
        privateValue, // what goes into ZK circuit
        status:       m.status, // 2 = up, 9 = down, 0 = paused
      };
    });

    res.json({ success: true, monitors });
  } catch (err) {
    console.error("[SLA] UptimeRobot fetch error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sla/commit
// Body: { privateValue: 9950 }
// Generates random salt + computes Poseidon commitment
// Returns { commitment, salt, privateValue } — salt is saved by recipient
router.post("/commit", async (req, res) => {
  const { privateValue } = req.body;
  if (!privateValue) return res.status(400).json({ error: "privateValue required" });

  try {
    // Cryptographically random salt (safe for ZK)
    const salt       = Math.floor(Math.random() * 1_000_000_000) + 1;
    const commitment = await computeCommitment(privateValue, salt);

    console.log(`[SLA] Commitment generated for value ~${(privateValue/100).toFixed(2)}%`);

    res.json({
      success:      true,
      commitment,
      salt,
      privateValue: Number(privateValue),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
