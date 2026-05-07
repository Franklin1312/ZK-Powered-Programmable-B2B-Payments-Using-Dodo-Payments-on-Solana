import { useState } from "react";

const IconSearch   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="6" r="4"/><path d="M10 10l2 2" strokeLinecap="round"/></svg>;
const IconExternal = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4.5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V6.5M9 2H6.5M9 2v2.5M9 2L5 6" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const InfoRow = ({ label, value, accent }) => (
  <div style={{ padding:"9px 0", borderBottom:"1px solid rgba(148,163,184,0.12)", display:"flex", justifyContent:"space-between", gap:16, alignItems:"baseline" }}>
    <span style={{ fontFamily:"var(--font-display)", fontSize:8, fontWeight:700, letterSpacing:"0.14em", color:"var(--slate-400)", textTransform:"uppercase", flexShrink:0 }}>{label}</span>
    <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color: accent ? "var(--violet-600)" : "var(--slate-600)", wordBreak:"break-all", textAlign:"right" }}>{value}</span>
  </div>
);

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

  const fmt = (pk) => pk ? `${pk.slice(0,8)}…${pk.slice(-8)}` : "—";

  return (
    <div style={{ maxWidth:620, margin:"0 auto" }}>
      <div className="card card-violet">
        <div className="card-header">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h2 className="card-title">Verify Escrow Status</h2>
              <p className="card-sub">Check if a ZK proof was verified and funds were released on Solana</p>
            </div>
            <span className="tag tag-violet">On-chain</span>
          </div>
        </div>

        <div className="field">
          <label className="field-label">Escrow PDA Address</label>
          <input className="field-input field-mono" value={pda}
            onChange={e => setPda(e.target.value)}
            onKeyDown={e => e.key === "Enter" && check()}
            placeholder="Enter Solana PDA address…" />
          <p className="field-hint">The escrow account address shown in the payer dashboard after payment is confirmed.</p>
        </div>

        <button className="btn btn-primary btn-full btn-lg" onClick={check} disabled={loading || !pda.trim()}>
          {loading
            ? <><span className="spinner" style={{ borderTopColor:"#fff", borderColor:"rgba(255,255,255,0.3)" }} />Querying Solana…</>
            : <><IconSearch />Check Status</>}
        </button>

        {error && (
          <div className="alert alert-error" style={{ marginTop:16 }}>
            <p className="alert-title">Query Failed</p>
            <p style={{ fontSize:12, marginTop:3 }}>{error}</p>
          </div>
        )}

        {result && (
          <div style={{ marginTop:20, background:"rgba(255,255,255,0.7)", border:`1px solid ${result.isReleased ? "rgba(5,150,105,0.25)" : "rgba(124,58,237,0.2)"}`, borderRadius:"var(--radius-lg)", padding:18, backdropFilter:"blur(12px)", animation:"fade-up 0.3s ease both" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <span style={{ fontFamily:"var(--font-display)", fontSize:9, fontWeight:700, letterSpacing:"0.2em", color:"var(--slate-400)", textTransform:"uppercase" }}>On-chain State</span>
              <span className={`tag ${result.isReleased ? "tag-green" : "tag-violet"}`}>
                {result.isReleased ? "✓ Released" : "⬡ Locked"}
              </span>
            </div>
            <InfoRow label="Payer"     value={fmt(result.payer)} />
            <InfoRow label="Recipient" value={fmt(result.recipient)} />
            <InfoRow label="Amount"    value={`${(result.amount / 1_000_000).toFixed(2)} USDC`} accent />
            <InfoRow label="Threshold" value={`${(result.threshold / 100).toFixed(2)}% uptime`} />
            <InfoRow label="Status"    value={result.isReleased ? "Funds transferred to recipient" : "Awaiting ZK proof"} accent={result.isReleased} />
            {result.isReleased && result.tx && (
              <a href={`https://explorer.solana.com/tx/${result.tx}?cluster=testnet`} target="_blank" rel="noreferrer"
                style={{ marginTop:12, display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"var(--green-600)", textDecoration:"underline", textUnderlineOffset:2 }}>
                View release tx <IconExternal />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}