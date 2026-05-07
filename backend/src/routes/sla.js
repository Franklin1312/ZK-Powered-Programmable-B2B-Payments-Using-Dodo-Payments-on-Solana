/**
 * sla.js — Multi-method SLA verification oracle
 * Supported methods:
 *   1. UptimeRobot — 30-day uptime %
 *   2. GitHub      — merged PRs / closed issues / commits in date range
 */
const express = require("express");
const router  = express.Router();
const https   = require("https");
const { computeCommitment } = require("../services/zk");

// ── Helper: HTTPS POST ────────────────────────────────────────────────────────
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(body);
    const req  = https.request({ hostname, path, method: "POST", headers: { ...headers, "Content-Length": data.length } }, (res) => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("Invalid JSON: " + raw.slice(0, 200))); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ── Helper: HTTPS GET ─────────────────────────────────────────────────────────
function httpsGet(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: "GET", headers }, (res) => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { reject(new Error("Invalid JSON from " + hostname + path)); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// ── POST /api/sla/fetch — UptimeRobot ─────────────────────────────────────────
router.post("/fetch", async (req, res) => {
  const { apiKey, monitorId } = req.body;
  if (!apiKey) return res.status(400).json({ error: "UptimeRobot API key required" });

  try {
    const bodyStr = [
      `api_key=${encodeURIComponent(apiKey)}`,
      "format=json",
      "custom_uptime_ratios=30",
      monitorId ? `monitors=${monitorId}` : "",
      "logs=0",
    ].filter(Boolean).join("&");

    const data = await httpsPost(
      "api.uptimerobot.com", "/v2/getMonitors",
      { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      bodyStr
    );

    if (data.stat !== "ok") {
      return res.status(400).json({ error: data.error?.message || "UptimeRobot API error" });
    }

    const monitors = (data.monitors || []).map(m => {
      const uptimePct    = parseFloat(m.custom_uptime_ratio || "0");
      const privateValue = Math.round(uptimePct * 100); // e.g. 99.50% → 9950
      return {
        id:           m.id,
        name:         m.friendly_name,
        url:          m.url,
        uptimePct:    uptimePct.toFixed(3),
        privateValue,
        status:       m.status,
        method:       "uptimerobot",
      };
    });

    res.json({ success: true, monitors });
  } catch (err) {
    console.error("[SLA/UptimeRobot]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sla/github ── GitHub activity proof ────────────────────────────
// Metrics available:
//   merged_prs    — merged PRs in last N days as % of total opened
//   closed_issues — closed issues in last N days as % of total
//   commit_count  — normalised commit score (commits / target * 100)
router.post("/github", async (req, res) => {
  const { token, owner, repo, metric = "merged_prs", days = 30, targetCommits = 50 } = req.body;
  if (!token)  return res.status(400).json({ error: "GitHub token required" });
  if (!owner)  return res.status(400).json({ error: "Repo owner required (e.g. 'octocat')" });
  if (!repo)   return res.status(400).json({ error: "Repo name required (e.g. 'my-project')" });

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept":        "application/vnd.github+json",
    "User-Agent":    "ZKPay-Oracle/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const since = new Date(Date.now() - days * 86400000).toISOString();

  try {
    let privateValue = 0;
    let label        = "";
    let detail       = {};

    if (metric === "merged_prs") {
      // Fetch open + merged PRs in window
      const [opened, merged] = await Promise.all([
        httpsGet("api.github.com", `/repos/${owner}/${repo}/pulls?state=all&since=${since}&per_page=100`, headers),
        httpsGet("api.github.com", `/repos/${owner}/${repo}/pulls?state=closed&since=${since}&per_page=100`, headers),
      ]);

      if (opened.status === 401) return res.status(401).json({ error: "Invalid GitHub token" });
      if (opened.status === 404) return res.status(404).json({ error: `Repo ${owner}/${repo} not found or no access` });

      const openedCount = Array.isArray(opened.body)  ? opened.body.length  : 0;
      const mergedCount = Array.isArray(merged.body)
        ? merged.body.filter(pr => pr.merged_at).length : 0;

      // Score: merged / max(opened, 1) as percentage → scale to 0-10000
      const pct        = openedCount > 0 ? (mergedCount / openedCount) * 100 : 100;
      privateValue     = Math.round(pct * 100); // 98.5% → 9850
      label            = `${mergedCount} of ${openedCount} PRs merged`;
      detail           = { openedCount, mergedCount, pct: pct.toFixed(2) };

    } else if (metric === "closed_issues") {
      const [all, closed] = await Promise.all([
        httpsGet("api.github.com", `/repos/${owner}/${repo}/issues?state=all&since=${since}&per_page=100`, headers),
        httpsGet("api.github.com", `/repos/${owner}/${repo}/issues?state=closed&since=${since}&per_page=100`, headers),
      ]);

      if (all.status === 401) return res.status(401).json({ error: "Invalid GitHub token" });
      if (all.status === 404) return res.status(404).json({ error: `Repo ${owner}/${repo} not found` });

      // Filter out PRs (GitHub issues API includes PRs)
      const allIssues    = Array.isArray(all.body)    ? all.body.filter(i => !i.pull_request)    : [];
      const closedIssues = Array.isArray(closed.body) ? closed.body.filter(i => !i.pull_request) : [];

      const pct    = allIssues.length > 0 ? (closedIssues.length / allIssues.length) * 100 : 100;
      privateValue = Math.round(pct * 100);
      label        = `${closedIssues.length} of ${allIssues.length} issues closed`;
      detail       = { allCount: allIssues.length, closedCount: closedIssues.length, pct: pct.toFixed(2) };

    } else if (metric === "commit_count") {
      const r = await httpsGet(
        "api.github.com",
        `/repos/${owner}/${repo}/commits?since=${since}&per_page=100`,
        headers
      );

      if (r.status === 401) return res.status(401).json({ error: "Invalid GitHub token" });
      if (r.status === 404) return res.status(404).json({ error: `Repo ${owner}/${repo} not found` });

      const count  = Array.isArray(r.body) ? r.body.length : 0;
      const target = Number(targetCommits) || 50;
      const pct    = Math.min((count / target) * 100, 100);
      privateValue = Math.round(pct * 100);
      label        = `${count} commits in last ${days} days (target: ${target})`;
      detail       = { count, target, pct: pct.toFixed(2) };
    } else {
      return res.status(400).json({ error: `Unknown metric: ${metric}. Use merged_prs, closed_issues, or commit_count` });
    }

    console.log(`[SLA/GitHub] ${owner}/${repo} metric=${metric} value=${privateValue} (${label})`);
    res.json({ success: true, privateValue, label, detail, metric, repo: `${owner}/${repo}` });

  } catch (err) {
    console.error("[SLA/GitHub]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sla/commit — generate Poseidon commitment ──────────────────────
// Body: { privateValue: 9950 }
// Returns: { commitment, salt, privateValue }
router.post("/commit", async (req, res) => {
  const { privateValue } = req.body;
  if (privateValue === undefined || privateValue === null) {
    return res.status(400).json({ error: "privateValue required" });
  }
  try {
    const salt       = Math.floor(Math.random() * 1_000_000_000) + 1;
    const commitment = await computeCommitment(Number(privateValue), salt);
    console.log(`[SLA/Commit] Generated commitment for value ~${(privateValue / 100).toFixed(2)}%`);
    res.json({ success: true, commitment, salt, privateValue: Number(privateValue) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;