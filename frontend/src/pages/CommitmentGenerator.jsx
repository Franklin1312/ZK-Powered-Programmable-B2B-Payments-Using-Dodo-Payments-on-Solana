import { useState } from "react";
import { fetchSLA, generateCommitment } from "../utils/api";

export default function CommitmentGenerator() {
  const [apiKey,     setApiKey]     = useState("");
  const [monitors,   setMonitors]   = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [commitment, setCommitment] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [step,       setStep]       = useState(0); // 0=enter key, 1=pick monitor, 2=commitment ready
  const [copied,     setCopied]     = useState(false);

  const doFetch = async () => {
    if (!apiKey.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetchSLA(apiKey.trim());
      setMonitors(res.data.monitors);
      setStep(1);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to reach UptimeRobot. Check your API key.");
    }
    setLoading(false);
  };

  const doCommit = async (monitor) => {
    setSelected(monitor);
    setLoading(true); setError(null);
    try {
      const res = await generateCommitment(monitor.privateValue);
      setCommitment({ ...res.data, monitorName: monitor.name, uptimePct: monitor.uptimePct });
      setStep(2);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to generate commitment.");
    }
    setLoading(false);
  };

  const copyCommitment = () => {
    navigator.clipboard.writeText(commitment.commitment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadKeys = () => {
    const data = {
      privateValue: commitment.privateValue,
      salt:         commitment.salt,
      commitment:   commitment.commitment,
      monitor:      commitment.monitorName,
      uptimePct:    commitment.uptimePct,
      generatedAt:  new Date().toISOString(),
      warning:      "Keep this file private. Share only the commitment hash with your payer.",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "sla-keys.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep(0); setMonitors([]); setSelected(null);
    setCommitment(null); setError(null);
  };

  const statusLabel = (s) => s === 2 ? "🟢 Up" : s === 9 ? "🔴 Down" : "⏸ Paused";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>

      {/* ── Main card ── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 className="card-title">Generate SLA Commitment</h2>
              <p className="card-sub">
                Connect UptimeRobot → fetch real uptime → get a commitment hash to share with your payer
              </p>
            </div>
            <span className="tag tag-green">Recipient</span>
          </div>
        </div>

        {/* ── Stepper ── */}
        <div className="stepper" style={{ marginBottom: 28 }}>
          {["Connect UptimeRobot", "Select monitor", "Share commitment"].map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", flex: i < 2 ? "1" : "none" }}>
              <div className={`step-item ${step === i ? "active" : ""} ${step > i ? "done" : ""}`} style={{ flex: "none" }}>
                <div className="step-circle">{step > i ? "✓" : i + 1}</div>
                <span className="step-label">{label}</span>
              </div>
              {i < 2 && <div className="step-line" />}
            </div>
          ))}
        </div>

        {/* ── Step 0: API key ── */}
        {step === 0 && (
          <>
            <div className="field" style={{ marginBottom: 8 }}>
              <label className="field-label">UptimeRobot API Key</label>
              <input
                className="field-input field-mono"
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doFetch()}
                placeholder="ur1234567-xxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="field-hint">
                Find it at{" "}
                <a href="https://dashboard.uptimerobot.com/account" target="_blank" rel="noreferrer"
                  style={{ color: "var(--indigo-600)" }}>
                  UptimeRobot → My Settings → API Settings
                </a>
              </p>
            </div>
            <button className="btn btn-primary" onClick={doFetch} disabled={loading || !apiKey.trim()}>
              {loading ? <><span className="spinner" /> Fetching monitors...</> : "Fetch my monitors →"}
            </button>
          </>
        )}

        {/* ── Step 1: Pick monitor ── */}
        {step === 1 && (
          <>
            <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 16 }}>
              Select the monitor whose uptime you want to prove:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {monitors.map(m => (
                <div key={m.id}
                  onClick={() => !loading && doCommit(m)}
                  style={{
                    border: `2px solid ${selected?.id === m.id ? "var(--indigo-500)" : "var(--gray-200)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "14px 16px",
                    cursor: loading ? "wait" : "pointer",
                    background: selected?.id === m.id ? "var(--indigo-50)" : "white",
                    transition: "all 0.15s ease",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 2px" }}>{m.name}</p>
                      <p style={{ fontSize: 11, color: "var(--gray-500)", margin: 0, fontFamily: "var(--font-mono)" }}>{m.url}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 18, color: "var(--emerald-600)", margin: "0 0 2px" }}>
                        {m.uptimePct}%
                      </p>
                      <p style={{ fontSize: 11, color: "var(--gray-400)", margin: 0 }}>{statusLabel(m.status)}</p>
                    </div>
                  </div>
                  {loading && selected?.id === m.id && (
                    <p style={{ fontSize: 11, color: "var(--indigo-600)", marginTop: 8, margin: "8px 0 0" }}>
                      <span className="spinner" style={{ width: 10, height: 10, marginRight: 6 }} />
                      Generating commitment...
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button className="btn" style={{ background: "var(--gray-100)", color: "var(--gray-700)" }}
              onClick={reset}>
              ← Use a different API key
            </button>
          </>
        )}

        {/* ── Step 2: Commitment ready ── */}
        {step === 2 && commitment && (
          <>
            <div style={{
              background: "var(--emerald-50)", border: "1px solid #a7f3d0",
              borderRadius: "var(--radius-md)", padding: 16, marginBottom: 20,
            }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: "#065f46", marginBottom: 4 }}>
                ✓ Commitment generated from real uptime data
              </p>
              <p style={{ fontSize: 12, color: "#047857", margin: 0 }}>
                {commitment.monitorName} · {commitment.uptimePct}% uptime (30-day)
              </p>
            </div>

            {/* Commitment hash — share this */}
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">
                Commitment hash <span style={{ color: "var(--emerald-600)", fontWeight: 400 }}>(share this with payer)</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="field-input field-mono"
                  readOnly
                  value={commitment.commitment}
                  style={{ paddingRight: 90, background: "var(--gray-50)" }}
                />
                <button
                  onClick={copyCommitment}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: copied ? "var(--emerald-600)" : "var(--indigo-600)",
                    color: "white", border: "none", borderRadius: 6,
                    padding: "4px 12px", fontSize: 12, cursor: "pointer", transition: "background 0.2s",
                  }}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="field-hint">This is a Poseidon hash — mathematically binding but reveals nothing about your uptime.</p>
            </div>

            {/* Private keys — keep these */}
            <div style={{
              background: "#fff7ed", border: "1px solid #fed7aa",
              borderRadius: "var(--radius-md)", padding: 14, marginBottom: 20,
            }}>
              <p style={{ fontWeight: 600, fontSize: 12, color: "#9a3412", marginBottom: 10 }}>
                🔒 Keep these private — needed to claim payment later
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <p style={{ fontSize: 11, color: "#9a3412", margin: "0 0 3px" }}>SLA value (private)</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#7c2d12", margin: 0 }}>
                    {commitment.privateValue}
                    <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>
                      = {(commitment.privateValue / 100).toFixed(2)}%
                    </span>
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#9a3412", margin: "0 0 3px" }}>Salt (private)</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#7c2d12", margin: 0 }}>
                    {commitment.salt}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-success" onClick={downloadKeys} style={{ flex: 1 }}>
                ↓ Download sla-keys.json
              </button>
              <button className="btn btn-primary" onClick={copyCommitment} style={{ flex: 1 }}>
                {copied ? "Copied!" : "Copy commitment →"}
              </button>
            </div>

            <button
              onClick={reset}
              style={{ marginTop: 12, width: "100%", background: "none", border: "none",
                color: "var(--gray-400)", fontSize: 12, cursor: "pointer", padding: "6px 0" }}>
              Start over
            </button>
          </>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>
            <p className="alert-title">Error</p>
            <p style={{ fontSize: 12, color: "#9f1239", margin: 0 }}>{error}</p>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* How it works */}
        <div className="card" style={{ background: "var(--gray-50)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-600)", marginBottom: 14 }}>
            How this works
          </p>
          {[
            { n: 1, t: "Connect UptimeRobot", d: "We fetch your real 30-day uptime — no manual entry" },
            { n: 2, t: "Pick your monitor",   d: "Select which service's uptime to prove" },
            { n: 3, t: "Get commitment hash", d: "Poseidon(value, salt) — mathematically binding" },
            { n: 4, t: "Share with payer",    d: "They lock funds using this hash — can't change it later" },
            { n: 5, t: "Claim payment",       d: "Use your private keys to prove value > threshold" },
          ].map(({ n, t, d }) => (
            <div key={n} style={{ display: "flex", gap: 10, paddingBottom: 12,
              borderBottom: "1px solid var(--gray-200)", marginBottom: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", background: "var(--indigo-600)",
                color: "white", fontSize: 11, fontWeight: 700, display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>{n}</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 12, margin: "0 0 2px" }}>{t}</p>
                <p style={{ fontSize: 11, color: "var(--gray-500)", margin: 0 }}>{d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy guarantee */}
        <div className="card" style={{ background: "var(--emerald-50)", border: "1px solid #a7f3d0" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#065f46", marginBottom: 10 }}>
            Privacy guarantees
          </p>
          {[
            { label: "Your exact uptime %", hidden: true },
            { label: "Your UptimeRobot API key", hidden: true },
            { label: "Your salt value", hidden: true },
            { label: "Proof: value > threshold", hidden: false },
            { label: "Commitment hash (public)", hidden: false },
          ].map(({ label, hidden }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "7px 0", borderBottom: "1px solid #a7f3d0" }}>
              <span style={{ fontSize: 11, color: "#065f46" }}>{label}</span>
              <span className={`tag ${hidden ? "tag-amber" : "tag-green"}`}>
                {hidden ? "Hidden ✗" : "Shared ✓"}
              </span>
            </div>
          ))}
        </div>

        {/* UptimeRobot API key help */}
        <div className="card" style={{ background: "white", border: "1px solid var(--gray-200)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#000000", marginBottom: 8 }}>
            Where to find your API key
          </p>
          <ol style={{ fontSize: 11, color: "#000000", paddingLeft: 16, margin: 0, lineHeight: 2 }}>
            <li>Go to <strong>dashboard.uptimerobot.com</strong></li>
            <li>Click your name → <strong>My Settings</strong></li>
            <li>Scroll to <strong>API Settings</strong></li>
            <li>Copy the <strong>Main API Key</strong></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
