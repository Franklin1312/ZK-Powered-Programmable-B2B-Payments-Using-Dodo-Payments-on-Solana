import { useState } from "react";

export default function StatusChecker() {
  const [pda,     setPda]     = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const check = async () => {
    if (!pda.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res  = await fetch(`${BASE}/api/status/${pda.trim()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const fmt = (pk) => pk ? `${pk.slice(0,8)}...${pk.slice(-8)}` : "—";

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="card card-violet">
        <div className="card-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 className="card-title">Verify Escrow Status</h2>
              <p className="card-sub">Check if a ZK proof was verified and payment released on-chain</p>
            </div>
            <span className="tag tag-violet">On-chain</span>
          </div>
        </div>

        <div className="field">
          <label className="field-label">Escrow PDA Address</label>
          <div className="copy-field">
            <input
              className="field-input mono"
              value={pda}
              onChange={e => setPda(e.target.value)}
              onKeyDown={e => e.key === "Enter" && check()}
              placeholder="Enter Solana PDA address..."
            />
          </div>
          <p className="field-hint">The escrow account address shown after payment — starts with a Solana base58 string.</p>
        </div>

        <button className="btn btn-primary btn-full btn-lg" onClick={check}
          disabled={loading || !pda.trim()}>
          {loading
            ? <><span className="spinner" />Querying Solana...</>
            : <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="5.5" />
                  <path d="M4.5 7l2 2 3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Check Status
              </>
          }
        </button>

        {error && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>
            <p className="alert-title">Query Failed</p>
            <p style={{ fontSize: 12, marginTop: 3 }}>{error}</p>
          </div>
        )}

        {result && (
          <div className="result-panel" style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span className="section-label" style={{ margin: 0 }}>On-chain State</span>
              <span className={`tag ${result.isReleased ? "tag-green" : "tag-violet"}`}>
                {result.isReleased ? "✓ Released" : "⬡ Locked"}
              </span>
            </div>

            {[
              { k: "Payer",     v: fmt(result.payer),     cls: "" },
              { k: "Recipient", v: fmt(result.recipient), cls: "" },
              { k: "Amount",    v: `${(result.amount / 1_000_000).toFixed(2)} USDC`, cls: "gold" },
              { k: "Threshold", v: `${(result.threshold / 100).toFixed(2)}% uptime`, cls: "" },
              { k: "Status",    v: result.isReleased ? "Funds transferred to recipient" : "Awaiting ZK proof", cls: result.isReleased ? "green" : "violet" },
            ].map(({ k, v, cls }) => (
              <div key={k} className="result-row">
                <span className="result-key">{k}</span>
                <span className={`result-val ${cls}`}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
