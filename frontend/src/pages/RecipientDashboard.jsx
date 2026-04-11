import { useState, useEffect } from "react";
import { generateProof, releasePayment } from "../utils/api";
import TxTimeline from "../components/TxTimeline";
import DemoMode   from "../components/DemoMode";

const STEP_LABELS = ["Enter credentials", "Generate ZK proof", "Release payment"];

export default function RecipientDashboard({ escrowData, demoState, addEvent, updateLastEvent, txEvents }) {
  const [form, setForm] = useState({
    privateValue: 9950, salt: 12345,
    threshold: 9900, commitment: "", payerPubkey: "",
  });
  const [proof,   setProof]   = useState(null);
  const [tx,      setTx]      = useState(null);
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (escrowData) {
      setForm(f => ({
        ...f,
        threshold:   escrowData.threshold   || f.threshold,
        commitment:  escrowData.commitment  || f.commitment,
        payerPubkey: escrowData.payerPubkey || f.payerPubkey,
      }));
    }
  }, [escrowData]);

  const handle = k => e => setForm({ ...form, [k]: e.target.value });
  const fill   = vals  => setForm(f => ({ ...f, ...vals }));

  const doProof = async () => {
    setLoading(true); setError(null); setStep(1);
    addEvent("Generating ZK proof", "Running Groth16 prover (Circom + SnarkJS)...", "pending");
    try {
      const res = await generateProof(form);
      updateLastEvent("done", `Proof verified locally · π_a: ${res.data.proof.pi_a[0]?.slice(0,16)}...`);
      setProof(res.data);
      setStep(2);
    } catch (e) {
      updateLastEvent("error", e.response?.data?.error || e.message);
      setError(e.response?.data?.error || e.message);
      setStep(0);
    }
    setLoading(false);
  };

  const doRelease = async () => {
    setLoading(true); setError(null);
    addEvent("Solana · verifyAndRelease()", "Submitting proof + instruction...", "pending");
    try {
      const res = await releasePayment({
        proof: proof.proof,
        publicSignals: proof.publicSignals,
        payerPubkey: form.payerPubkey,
      });
      const { tx: txSig, alreadyReleased, message } = res.data;
      const txLabel = txSig ? `Tx: ${txSig.slice(0, 20)}...` : "Escrow already settled on-chain";
      updateLastEvent("done", txLabel);
      addEvent(alreadyReleased ? "Escrow already settled" : "Payment released!", message, "done");
      setTx(txSig || "already-released");
      setStep(3);
    } catch (e) {
      updateLastEvent("error", e.response?.data?.error || e.message);
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  const conditionMet = Number(form.privateValue) > Number(form.threshold);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:24, alignItems:"start" }}>

      <div className="card">
        <div className="card-header">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h2 className="card-title">Claim Payment</h2>
              <p className="card-sub">Prove your SLA condition via ZK — your actual value stays private</p>
            </div>
            <span className="tag tag-amber">Groth16</span>
          </div>
        </div>

        <DemoMode onFill={fill} demoState={demoState} />

        {/* Stepper */}
        <div className="stepper">
          {STEP_LABELS.map((label, i) => (
            <div key={label} style={{ display:"flex", alignItems:"center", flex: i < STEP_LABELS.length-1 ? "1" : "none" }}>
              <div className={`step-item ${step === i+1 ? "active" : ""} ${step > i ? "done" : ""}`}
                style={{ flex:"none" }}>
                <div className="step-circle">{step > i ? "✓" : i + 1}</div>
                <span className="step-label">{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="grid-2">
          <Field label="Your actual SLA value" hint="Private — never leaves client">
            <input className="field-input" type="number" value={form.privateValue}
              onChange={handle("privateValue")} disabled={step > 0} />
          </Field>
          <Field label="Salt" hint="Must match payer's salt">
            <input className="field-input" type="number" value={form.salt}
              onChange={handle("salt")} disabled={step > 0} />
          </Field>
        </div>

        <div className="grid-2">
          <Field label="Threshold (from escrow)">
            <input className="field-input" type="number" value={form.threshold}
              onChange={handle("threshold")} disabled={step > 0} />
          </Field>
          <Field label="Payer wallet address">
            <input className="field-input field-mono" value={form.payerPubkey}
              onChange={handle("payerPubkey")} placeholder="Payer public key..." disabled={step > 0} />
          </Field>
        </div>

        <Field label="Commitment hash (from payer)" hint="Poseidon hash stored in escrow — public">
          <input className="field-input field-mono" value={form.commitment}
            onChange={handle("commitment")} placeholder="Paste commitment hash..." disabled={step > 0} />
        </Field>

        {/* Privacy notice */}
        <div style={{ background:"var(--amber-50)", border:"1px solid #fde68a",
          borderRadius:"var(--radius-md)", padding:"10px 14px", marginBottom:20,
          display:"flex", gap:8, alignItems:"flex-start" }}>
          <span style={{ fontSize:13, flexShrink:0 }}>🔒</span>
          <p style={{ fontSize:11, color:"#92400e", lineHeight:1.5, margin:0 }}>
            Value <strong>{form.privateValue}</strong> is used only to generate the proof locally.
            Only π (the proof) is submitted — never the raw data.
          </p>
        </div>

        {step < 2 && (
          <button className="btn btn-primary" onClick={doProof} disabled={loading || step === 1}>
            {loading && step === 1
              ? <><span className="spinner" /> Generating ZK proof — ~20s</>
              : "Generate ZK Proof →"}
          </button>
        )}

        {proof && step >= 2 && (
          <>
            <div className="proof-box">
              <div className="proof-title">
                ZK proof generated
                <span className="proof-badge">Verified ✓</span>
              </div>
              <p className="proof-mono">π_a[0]: {proof.proof.pi_a[0]?.slice(0,50)}...</p>
              <p className="proof-mono">π_b[0]: {proof.proof.pi_b[0]?.[0]?.slice(0,50)}...</p>
              <p className="proof-mono">public: {JSON.stringify(proof.publicSignals).slice(0,60)}...</p>
            </div>
            {step === 2 && (
              <button className="btn btn-success" onClick={doRelease} disabled={loading}>
                {loading
                  ? <><span className="spinner" /> Submitting to Solana...</>
                  : "Submit Proof & Release Payment →"}
              </button>
            )}
          </>
        )}

        {step === 3 && tx && (
          <div className="alert alert-success" style={{ marginTop:16 }}>
            <p className="alert-title" style={{ fontSize:15 }}>
              {tx === "already-released" ? "Escrow already settled" : "Payment released!"}
            </p>
            {tx !== "already-released" ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", gap:12 }}>
                  <span style={{ fontSize:11, color:"#059669" }}>Transaction</span>
                  <span style={{ fontSize:11, fontFamily:"var(--font-mono)",
                    color:"#065f46", wordBreak:"break-all", textAlign:"right" }}>{tx}</span>
                </div>
                <a className="alert-link"
                  href={`https://explorer.solana.com/tx/${tx}?cluster=devnet`}
                  target="_blank" rel="noreferrer">
                  View on Solana Explorer →
                </a>
              </>
            ) : (
              <p style={{ fontSize:11, color:"#065f46", margin:0 }}>
                This escrow was already released on-chain. The payment has been settled.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginTop:16 }}>
            <p className="alert-title">Error</p>
            <p style={{ fontSize:12, color:"#9f1239" }}>{error}</p>
          </div>
        )}

        <TxTimeline events={txEvents} />
      </div>

      {/* Right panel */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* ZK guarantees */}
        <div className="card" style={{ background:"var(--gray-50)" }}>
          <p style={{ fontSize:12, fontWeight:600, color:"var(--gray-600)", marginBottom:14 }}>
            What the proof guarantees
          </p>
          {[
            { label:"Private value > threshold", proven:true },
            { label:"Commitment matches (value, salt)", proven:true },
            { label:"Actual SLA value revealed", proven:false },
            { label:"Raw performance data on-chain", proven:false },
          ].map(({ label, proven }) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", padding:"9px 0", borderBottom:"1px solid var(--gray-200)" }}>
              <span style={{ fontSize:12, color:"var(--gray-600)" }}>{label}</span>
              <span className={`tag ${proven ? "tag-green" : "tag-indigo"}`}>
                {proven ? "Proven ✓" : "Hidden ✗"}
              </span>
            </div>
          ))}
        </div>

        {/* Circuit snippet */}
        <div className="card" style={{ background:"var(--emerald-50)", border:"1px solid #a7f3d0" }}>
          <p style={{ fontSize:12, fontWeight:600, color:"#065f46", marginBottom:10 }}>
            Circom circuit constraints
          </p>
          <pre style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"#047857",
            lineHeight:1.8, whiteSpace:"pre-wrap", margin:0 }}>
{`// Private inputs (you hold):
signal input privateValue;
signal input salt;

// Public inputs (on-chain):
signal input threshold;
signal input commitment;

// Constraints:
privateValue > threshold
Poseidon(privateValue, salt)
  === commitment`}
          </pre>
        </div>

        {/* Live SLA meter */}
        <div className="card">
          <p style={{ fontSize:12, fontWeight:600, color:"var(--gray-600)", marginBottom:14 }}>
            Live condition check
          </p>
          <Meter label="Your value"  pct={form.privateValue/100} color="var(--emerald-600)" />
          <Meter label="Threshold"   pct={form.threshold/100}   color="var(--indigo-500)"  />
          <div style={{ marginTop:10, padding:"8px 12px",
            background: conditionMet ? "var(--emerald-50)" : "var(--rose-50)",
            border: `1px solid ${conditionMet ? "#a7f3d0" : "#fecdd3"}`,
            borderRadius:"var(--radius-md)" }}>
            <p style={{ fontSize:11, fontWeight:600, margin:0,
              color: conditionMet ? "#065f46" : "#9f1239" }}>
              {conditionMet
                ? `Condition met: ${form.privateValue} > ${form.threshold} — proof will succeed`
                : `Condition not met: ${form.privateValue} ≤ ${form.threshold} — proof will fail`}
            </p>
          </div>
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

function Meter({ label, pct, color }) {
  const display = Math.min(100, Math.max(0, ((pct - 98) / 2) * 100));
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontSize:11, color:"var(--gray-500)" }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:600, color }}>{pct.toFixed(2)}%</span>
      </div>
      <div style={{ height:6, background:"var(--gray-200)", borderRadius:4, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${Math.max(4, display)}%`,
          background:color, borderRadius:4, transition:"width 0.3s ease" }} />
      </div>
    </div>
  );
}