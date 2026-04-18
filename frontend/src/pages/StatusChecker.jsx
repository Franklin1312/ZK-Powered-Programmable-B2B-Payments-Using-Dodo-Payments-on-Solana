import { useState } from "react";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "/api";

export default function StatusChecker() {
  const [pda,     setPda]     = useState("");
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const check = async () => {
    if (!pda.trim()) return;
    setLoading(true); setError(null); setStatus(null);
    try {
      const res = await axios.get(`${BASE}/status/${pda.trim()}`);
      setStatus(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Escrow Status</h2>
          <p className="card-sub">Query any escrow live from Solana devnet</p>
        </div>

        {/* Search bar */}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="field-input field-mono"
            style={{ flex: 1 }}
            placeholder="Paste escrow PDA address..."
            value={pda}
            onChange={e => setPda(e.target.value)}
            onKeyDown={e => e.key === "Enter" && check()}
          />
          <button
            className="btn btn-primary"
            style={{ width: "auto", padding: "10px 20px", whiteSpace: "nowrap" }}
            onClick={check}
            disabled={loading || !pda.trim()}
          >
            {loading ? <><span className="spinner" /> Querying</> : "Check →"}
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>
            <p className="alert-title">Not found</p>
            <p style={{ fontSize: 12, color: "#9f1239" }}>{error}</p>
          </div>
        )}

        {/* Result */}
        {status && (
          <div style={{ marginTop: 24 }}>
            {/* Release status banner */}
            <div style={{
              background: status.isReleased ? "var(--emerald-50)" : "var(--amber-50)",
              border: `1px solid ${status.isReleased ? "#a7f3d0" : "#fde68a"}`,
              borderRadius: "var(--radius-lg)",
              padding: "16px 20px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600,
                  color: status.isReleased ? "#065f46" : "#92400e" }}>
                  {status.isReleased ? "Payment released" : "Funds locked in escrow"}
                </p>
                <p style={{ fontSize: 11, color: status.isReleased ? "#047857" : "#b45309", marginTop: 2 }}>
                  {status.isReleased
                    ? "ZK proof was verified — funds transferred to recipient"
                    : "Awaiting ZK proof from recipient"}
                </p>
              </div>
              <span className={`tag ${status.isReleased ? "tag-green" : "tag-amber"}`}
                style={{ fontSize: 13, padding: "6px 14px" }}>
                {status.isReleased ? "Released" : "Locked"}
              </span>
            </div>

            {/* Info grid */}
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Amount</div>
                <div className="info-value">
                  {(Number(status.amount) / 1_000_000).toFixed(2)}
                  <span style={{ fontSize: 12, color: "var(--gray-400)", marginLeft: 4 }}>USDC</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">SLA threshold</div>
                <div className="info-value">
                  {(Number(status.threshold) / 100).toFixed(2)}
                  <span style={{ fontSize: 12, color: "var(--gray-400)", marginLeft: 4 }}>%</span>
                </div>
              </div>
            </div>

            <div className="divider" />

            {[
              { label: "Payer",     value: status.payer },
              { label: "Recipient", value: status.recipient },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: "10px 0",
                borderBottom: "1px solid var(--gray-100)",
                display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 12, color: "var(--gray-400)", fontWeight: 500,
                  flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)",
                  color: "var(--gray-600)", wordBreak: "break-all", textAlign: "right" }}>
                  {value}
                </span>
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <a className="btn btn-outline"
                href={`https://explorer.solana.com/address/${pda}?cluster=testnet`}
                target="_blank" rel="noreferrer">
                View account →
              </a>
            </div>
          </div>
        )}

        {!status && !error && !loading && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--gray-300)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>◎</div>
            <p style={{ fontSize: 13 }}>Enter an escrow PDA to check its on-chain state</p>
          </div>
        )}
      </div>

      {/* How to get PDA hint */}
      <div className="card" style={{ marginTop: 16, background: "var(--gray-50)",
        border: "1px solid var(--gray-200)" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-600)", marginBottom: 10 }}>
          Where to find the escrow PDA
        </p>
        <p style={{ fontSize: 12, color: "var(--gray-400)", lineHeight: 1.7 }}>
          After creating a payment in the <strong>Lock Payment</strong> tab,
          the escrow PDA is shown in the result panel on the right side.
          It looks like: <code style={{ fontFamily: "var(--font-mono)",
          background: "var(--gray-100)", padding: "1px 6px", borderRadius: 4 }}>
            AbcDef...xyz
          </code>
        </p>
        <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 8 }}>
          You can also find it from <code style={{ fontFamily: "var(--font-mono)",
          background: "var(--gray-100)", padding: "1px 6px", borderRadius: 4,
          fontSize: 11 }}>demo-state.json</code> in your backend folder.
        </p>
      </div>
    </div>
  );
}