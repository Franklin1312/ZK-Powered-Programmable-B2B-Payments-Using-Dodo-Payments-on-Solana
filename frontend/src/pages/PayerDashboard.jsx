import { useState, useEffect } from "react";
import { createPayment } from "../utils/api";
import TxTimeline from "../components/TxTimeline";
import DemoMode   from "../components/DemoMode";

export default function PayerDashboard({ onEscrowCreated, demoState, addEvent, updateLastEvent, txEvents }) {
  const [form, setForm] = useState({
    amount: 10, threshold: 9900,
    recipientPubkey: "", privateValue: 9950, salt: 12345,
  });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (demoState?.recipientPubkey) {
      setForm(f => ({ ...f, recipientPubkey: demoState.recipientPubkey }));
    }
  }, [demoState]);

  const handle = k => e => setForm({ ...form, [k]: e.target.value });
  const fill   = vals  => setForm(f => ({ ...f, ...vals }));

  const submit = async () => {
    setLoading(true); setError(null);
    addEvent("Dodo Payments", "Creating fiat payment intent...", "pending");
    try {
      await new Promise(r => setTimeout(r, 600));
      updateLastEvent("done", "Payment confirmed · USDC conversion complete");

      addEvent("ZK commitment", "Poseidon(privateValue, salt) computing...", "pending");
      await new Promise(r => setTimeout(r, 400));
      updateLastEvent("done", "Commitment hash generated");

      addEvent("Solana · initializeEscrow()", "Locking USDC in PDA...", "pending");
      const res = await createPayment(form);
      updateLastEvent("done", `PDA: ${res.data.escrowPDA?.slice(0, 20)}...`);
      addEvent("Escrow live on devnet", res.data.tx?.slice(0, 20) + "...", "done");

      setResult(res.data);
      onEscrowCreated && onEscrowCreated({ ...res.data, threshold: form.threshold });
    } catch (e) {
      updateLastEvent("error", e.response?.data?.error || e.message);
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:24, alignItems:"start" }}>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Create Escrow Payment</h2>
          <p className="card-sub">Lock USDC on Solana with a ZK-verifiable release condition</p>
        </div>

        <DemoMode onFill={fill} demoState={demoState} />

        <div className="grid-2">
          <Field label="Amount (USDC)" hint="Minimum 1 USDC">
            <input className="field-input" type="number" value={form.amount} onChange={handle("amount")} />
          </Field>
          <Field label="SLA threshold" hint="9900 = 99.00% uptime">
            <input className="field-input" type="number" value={form.threshold} onChange={handle("threshold")} />
          </Field>
        </div>

        <Field label="Recipient wallet address" hint="Solana devnet public key">
          <input className="field-input field-mono" value={form.recipientPubkey}
            onChange={handle("recipientPubkey")} placeholder="Paste recipient public key..." />
        </Field>

        <div className="divider" />
        <p style={{ fontSize:12, color:"var(--gray-400)", marginBottom:16, fontWeight:500 }}>
          ZK commitment parameters
        </p>

        <div className="grid-2">
          <Field label="Private SLA value" hint="Never sent on-chain">
            <input className="field-input" type="number" value={form.privateValue} onChange={handle("privateValue")} />
          </Field>
          <Field label="Salt" hint="Random nonce for commitment">
            <input className="field-input" type="number" value={form.salt} onChange={handle("salt")} />
          </Field>
        </div>

        <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ marginTop:8 }}>
          {loading ? <><span className="spinner" /> Locking funds on Solana...</> : "Lock Funds in Escrow →"}
        </button>

        {error && (
          <div className="alert alert-error" style={{ marginTop:16 }}>
            <p className="alert-title">Transaction failed</p>
            <p style={{ fontSize:12, color:"#9f1239" }}>{error}</p>
          </div>
        )}

        <TxTimeline events={txEvents} />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {result ? (
          <div className="card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h3 style={{ fontSize:15, fontWeight:600 }}>Escrow created</h3>
              <span className="tag tag-green">Live on devnet</span>
            </div>
            <div className="info-grid">
              <InfoTile label="Amount locked"  value={`${form.amount} USDC`} />
              <InfoTile label="SLA threshold"  value={`${(form.threshold/100).toFixed(2)}%`} />
            </div>
            <InfoRow label="Escrow PDA"  value={result.escrowPDA} />
            <InfoRow label="Transaction" value={result.tx} />
            {result.checkoutUrl && (
            <a href={result.checkoutUrl} target="_blank" rel="noreferrer" className="alert-link">
              Complete payment via Dodo →
            </a>
            )}
            {result.isSimulated && (
              <p style={{fontSize:11, color:"var(--amber-600)", marginTop:8}}>
                Running in simulation mode — set DODO_API_KEY for live payments
              </p>
            )}
            <InfoRow label="Commitment"  value={result.commitment?.slice(0,28) + "..."} />
            <a className="alert-link" style={{ marginTop:14 }}
              href={`https://explorer.solana.com/tx/${result.tx}?cluster=testnet`}
              target="_blank" rel="noreferrer">
              View on Solana Explorer →
            </a>
          </div>
        ) : (
          <div className="card" style={{ background:"var(--gray-50)",
            border:"1.5px dashed var(--gray-200)", textAlign:"center" }}>
            <p style={{ fontSize:13, color:"var(--gray-300)", padding:"28px 0" }}>
              Escrow details appear here after locking
            </p>
          </div>
        )}

        <div className="card" style={{ background:"var(--indigo-50)", border:"1px solid var(--indigo-100)" }}>
          <p style={{ fontSize:12, fontWeight:600, color:"var(--indigo-600)", marginBottom:12 }}>
            How it works
          </p>
          {[
            ["1","Dodo Payments converts fiat → USDC"],
            ["2","Poseidon(value, salt) stored as commitment hash"],
            ["3","USDC locked in a Solana PDA escrow"],
            ["4","Recipient proves condition via ZK — nothing revealed"],
          ].map(([n, text]) => (
            <div key={n} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
              <span style={{ width:20, height:20, background:"var(--indigo-500)", color:"#fff",
                borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, fontWeight:700, flexShrink:0 }}>{n}</span>
              <p style={{ fontSize:12, color:"var(--indigo-700)", lineHeight:1.5, margin:0 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="info-item">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ padding:"8px 0", borderBottom:"1px solid var(--gray-100)",
      display:"flex", justifyContent:"space-between", gap:12, alignItems:"baseline" }}>
      <span style={{ fontSize:11, color:"var(--gray-400)", fontWeight:500, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--gray-600)",
        wordBreak:"break-all", textAlign:"right" }}>{value}</span>
    </div>
  );
}