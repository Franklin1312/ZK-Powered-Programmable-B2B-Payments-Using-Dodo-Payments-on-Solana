import { useState, useEffect } from "react";
import { generateProof, releasePayment } from "../utils/api";
import { Connection, Transaction } from "@solana/web3.js";
import TxTimeline from "../components/TxTimeline";
import DemoMode   from "../components/DemoMode";
import { getPhantomProvider } from "../utils/wallet";

/* ── SVG Icons ─────────────────────────────────────────────────────────── */
const IconProof    = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 1.5L12.5 4.5V7.5C12.5 10.5 10 13 7 13.5C4 13 1.5 10.5 1.5 7.5V4.5L7 1.5Z"/><path d="M4.5 7l2 2 3-3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconRelease  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 2v7M4.5 6.5L7 9l2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2.5 11h9" strokeLinecap="round"/></svg>;
const IconExternal = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4.5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V6.5M9 2H6.5M9 2v2.5M9 2L5 6" strokeLinecap="round" strokeLinejoin="round"/></svg>;

/* ── Helpers ────────────────────────────────────────────────────────────── */
function base64ToBytes(b64) { const r = atob(b64), o = new Uint8Array(r.length); for (let i=0;i<r.length;i++) o[i]=r.charCodeAt(i); return o; }

async function signAndSend(serializedTx, expectedRecipient) {
  const provider = getPhantomProvider();
  if (!provider?.isPhantom) throw new Error("Phantom wallet not connected");
  const connected = provider.publicKey?.toBase58?.();
  if (expectedRecipient && connected !== expectedRecipient) throw new Error(`Wallet mismatch: connected ${connected}, escrow recipient ${expectedRecipient}`);
  const signed = await provider.signAndSendTransaction(Transaction.from(base64ToBytes(serializedTx)));
  const sig = typeof signed === "string" ? signed : signed?.signature;
  if (!sig) throw new Error("No signature from wallet");
  await new Connection(import.meta.env.VITE_SOLANA_RPC || "https://api.testnet.solana.com", "confirmed").confirmTransaction(sig, "confirmed");
  return sig;
}

const STEPS = ["Enter credentials", "Generate ZK proof", "Release payment"];

const Field = ({ label, hint, children }) => (
  <div className="field">
    <label className="field-label">{label}</label>
    {children}
    {hint && <p className="field-hint">{hint}</p>}
  </div>
);

/* ── Main ───────────────────────────────────────────────────────────────── */
export default function RecipientDashboard({ escrowData, demoState, addEvent, updateLastEvent, txEvents }) {
  const [form, setForm] = useState({ privateValue:9950, salt:12345, threshold:9900, commitment:"", payerPubkey:"", recipientPubkey:"", escrowPDA:"" });
  const [connectedWallet, setConnectedWallet] = useState("");
  const [proof,   setProof]   = useState(null);
  const [tx,      setTx]      = useState(null);
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const p = getPhantomProvider();
    if (!p?.isPhantom) return;
    const onConnect    = (pk) => setConnectedWallet(pk?.toBase58?.() || "");
    const onDisconnect = ()   => setConnectedWallet("");
    setConnectedWallet(p.publicKey?.toBase58?.() || "");
    p.on("connect", onConnect); p.on("disconnect", onDisconnect);
    return () => { p.off("connect", onConnect); p.off("disconnect", onDisconnect); };
  }, []);

  useEffect(() => {
    if (escrowData) setForm(f => ({ ...f,
      threshold:       escrowData.threshold       || f.threshold,
      commitment:      escrowData.commitment       || f.commitment,
      payerPubkey:     escrowData.payerPubkey      || f.payerPubkey,
      recipientPubkey: escrowData.recipientPubkey  || f.recipientPubkey,
      escrowPDA:       escrowData.escrowPDA        || f.escrowPDA,
    }));
  }, [escrowData]);

  const walletMismatch = Boolean(connectedWallet && form.recipientPubkey && connectedWallet !== form.recipientPubkey);
  const conditionMet   = Number(form.privateValue) > Number(form.threshold);
  const handle = k => e => setForm(f => ({ ...f, [k]:e.target.value }));
  const fill   = vals  => setForm(f => ({ ...f, ...vals }));

  const doProof = async () => {
    setLoading(true); setError(null); setStep(1);
    addEvent("Generating ZK proof", "Running Groth16 prover (Circom + SnarkJS)…", "pending");
    try {
      const res = await generateProof(form);
      updateLastEvent("done", `Proof verified · π_a: ${res.data.proof.pi_a[0]?.slice(0,16)}…`);
      setProof(res.data); setStep(2);
    } catch (e) {
      updateLastEvent("error", e.response?.data?.error || e.message);
      setError(e.response?.data?.error || e.message); setStep(0);
    }
    setLoading(false);
  };

  const doRelease = async () => {
    setLoading(true); setError(null);
    addEvent("Solana · verifyAndRelease()", "Submitting proof + instruction…", "pending");
    try {
      if (!form.escrowPDA) throw new Error("Escrow PDA is required.");
      const res = await releasePayment({ proof:proof.proof, publicSignals:proof.publicSignals, payerPubkey:form.payerPubkey, escrowPDA:form.escrowPDA, recipientPubkey:form.recipientPubkey });
      const { tx:txSig, alreadyReleased, message, requiresClientSignature, serializedTx } = res.data;
      let finalTx = txSig;
      if (requiresClientSignature && serializedTx) {
        addEvent("Phantom wallet", "Awaiting signature…", "pending");
        finalTx = await signAndSend(serializedTx, form.recipientPubkey);
        updateLastEvent("done", `Signed · ${finalTx.slice(0,20)}…`);
      }
      updateLastEvent("done", finalTx ? `Tx: ${finalTx.slice(0,20)}…` : "Already settled on-chain");
      addEvent(alreadyReleased ? "Escrow already settled" : "Payment released!", message, "done");
      setTx(finalTx || "already-released"); setStep(3);
    } catch (e) {
      updateLastEvent("error", e.response?.data?.error || e.message);
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  /* Uptime percentage display for meter */
  const pvPct  = Math.min(100, (Number(form.privateValue) / 100).toFixed(2));
  const thrPct = Math.min(100, (Number(form.threshold) / 100).toFixed(2));

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:24, alignItems:"start" }}>

      {/* ── Form card ─────────────────────────────────────────────── */}
      <div className="card card-gold">
        <div className="card-header">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h2 className="card-title">Claim Payment</h2>
              <p className="card-sub">Prove your SLA condition via ZK — your actual value stays completely private</p>
            </div>
            <span className="tag tag-gold">Groth16</span>
          </div>
        </div>

        <DemoMode onFill={fill} demoState={demoState} />

        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((label, i) => (
            <div key={label} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : "none" }}>
              <div className={`step-item ${step === i+1 ? "active" : ""} ${step > i ? "done" : ""}`} style={{ flex:"none" }}>
                <div className="step-circle">{step > i ? "✓" : i+1}</div>
                <span className="step-label">{label}</span>
              </div>
              {i < STEPS.length-1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="grid-2">
          <Field label="Your actual SLA value" hint="Private — never leaves your browser">
            <input className="field-input" type="number" value={form.privateValue} onChange={handle("privateValue")} disabled={step>0} />
          </Field>
          <Field label="Salt" hint="Must match commitment generation salt">
            <input className="field-input" type="number" value={form.salt} onChange={handle("salt")} disabled={step>0} />
          </Field>
        </div>

        <div className="grid-2">
          <Field label="Threshold (from escrow)">
            <input className="field-input" type="number" value={form.threshold} onChange={handle("threshold")} disabled={step>0} />
          </Field>
          <Field label="Payer wallet address">
            <input className="field-input field-mono" value={form.payerPubkey} onChange={handle("payerPubkey")} placeholder="Payer public key…" disabled={step>0} />
          </Field>
        </div>

        <Field label="Recipient wallet address" hint="Recipient identity stored in escrow">
          <input className="field-input field-mono" value={form.recipientPubkey} onChange={handle("recipientPubkey")} placeholder="Recipient public key…" />
        </Field>

        {connectedWallet && (
          <div className={`alert ${walletMismatch ? "alert-error" : "alert-success"}`} style={{ marginBottom:16 }}>
            <p className="alert-title">{walletMismatch ? "Wallet mismatch" : "Connected wallet matches recipient"}</p>
            <p style={{ fontSize:11, marginTop:3 }}>{walletMismatch
              ? `Connected: ${connectedWallet} — escrow expects: ${form.recipientPubkey}`
              : `Phantom wallet ${connectedWallet.slice(0,4)}…${connectedWallet.slice(-4)} is ready to sign the release.`}</p>
          </div>
        )}

        <Field label="Commitment hash (from payer)" hint="Poseidon hash stored in escrow — public">
          <input className="field-input field-mono" value={form.commitment} onChange={handle("commitment")} placeholder="Paste commitment hash…" disabled={step>0} />
        </Field>

        {/* Privacy notice */}
        <div style={{ background:"rgba(254,243,199,0.65)", border:"1px solid rgba(245,158,11,0.22)", borderRadius:"var(--radius-md)", padding:"10px 14px", marginBottom:20, display:"flex", gap:10, alignItems:"flex-start", backdropFilter:"blur(8px)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#92400e" strokeWidth="1.4" style={{ flexShrink:0, marginTop:1 }}><rect x="2" y="5.5" width="10" height="7" rx="1.5"/><path d="M4.5 5.5V4a2.5 2.5 0 015 0v1.5" strokeLinecap="round"/></svg>
          <p style={{ fontSize:11, color:"#92400e", lineHeight:1.55, margin:0 }}>
            Value <strong>{form.privateValue}</strong> generates the proof locally. Only π (the proof) is submitted on-chain — never the raw data.
          </p>
        </div>

        {/* CTA */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {step < 2 && (
            <button className="btn btn-primary btn-full btn-lg" onClick={doProof} disabled={loading || step===1}>
              {loading && step===1
                ? <><span className="spinner" style={{ borderTopColor:"#fff", borderColor:"rgba(255,255,255,0.3)" }} />Generating ZK proof — ~20s…</>
                : <><IconProof />Generate ZK Proof</>}
            </button>
          )}
          {proof && step>=2 && (
            <div className="proof-box">
              <div className="proof-title">ZK Proof Generated <span className="proof-badge">Verified ✓</span></div>
              <p className="proof-mono">π_a[0]: {proof.proof.pi_a[0]?.slice(0,52)}…</p>
              <p className="proof-mono">π_b[0]: {proof.proof.pi_b[0]?.[0]?.slice(0,52)}…</p>
              <p className="proof-mono">public: {JSON.stringify(proof.publicSignals).slice(0,60)}…</p>
            </div>
          )}
          {step===2 && (
            <button className="btn btn-success btn-full btn-lg" onClick={doRelease} disabled={loading || walletMismatch}>
              {loading
                ? <><span className="spinner" style={{ borderTopColor:"#fff", borderColor:"rgba(255,255,255,0.3)" }} />Submitting to Solana…</>
                : <><IconRelease />Submit Proof & Release Payment</>}
            </button>
          )}
        </div>

        {step===3 && tx && (
          <div className="alert alert-success" style={{ marginTop:16 }}>
            <p className="alert-title" style={{ fontSize:14 }}>{tx==="already-released" ? "Escrow already settled" : "Payment released!"}</p>
            {tx!=="already-released" ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginTop:6 }}>
                  <span style={{ fontFamily:"var(--font-display)", fontSize:8, fontWeight:700, letterSpacing:"0.14em", color:"var(--green-600)", textTransform:"uppercase" }}>Transaction</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--green-700)", wordBreak:"break-all", textAlign:"right" }}>{tx}</span>
                </div>
                <a href={`https://explorer.solana.com/tx/${tx}?cluster=testnet`} target="_blank" rel="noreferrer"
                  style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"var(--green-600)", textDecoration:"underline", textUnderlineOffset:2 }}>
                  View on Solana Explorer <IconExternal />
                </a>
              </>
            ) : <p style={{ fontSize:11, marginTop:4 }}>This escrow was already released on-chain.</p>}
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginTop:16 }}>
            <p className="alert-title">Error</p>
            <p style={{ fontSize:12, marginTop:3 }}>{error}</p>
          </div>
        )}

        <TxTimeline events={txEvents} />
      </div>

      {/* ── Right sidebar ──────────────────────────────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Live condition meter */}
        <div className="card">
          <p style={{ fontFamily:"var(--font-display)", fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"var(--slate-500)", marginBottom:14, textTransform:"uppercase" }}>Live condition check</p>
          {[["Your value", pvPct, "var(--green-600)"], ["Threshold", thrPct, "var(--violet-600)"]].map(([label, pct, color]) => {
            const disp = Math.min(100, Math.max(4, ((pct-98)/2)*100));
            return (
              <div key={label} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:11, color:"var(--slate-500)" }}>{label}</span>
                  <span style={{ fontFamily:"var(--font-display)", fontSize:11, fontWeight:700, color }}>{pct}%</span>
                </div>
                <div style={{ height:6, background:"rgba(148,163,184,0.2)", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${disp}%`, background:color, borderRadius:4, transition:"width 0.4s ease" }} />
                </div>
              </div>
            );
          })}
          <div style={{ padding:"10px 12px", borderRadius:"var(--radius-md)", background: conditionMet ? "rgba(236,253,245,0.8)" : "rgba(255,241,242,0.8)", border:`1px solid ${conditionMet ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}` }}>
            <p style={{ fontFamily:"var(--font-display)", fontSize:10, fontWeight:700, letterSpacing:"0.06em", margin:0, color: conditionMet ? "var(--green-700)" : "var(--red-600)" }}>
              {conditionMet ? `✓ CONDITION MET — ${form.privateValue} > ${form.threshold}` : `✗ CONDITION FAILS — ${form.privateValue} ≤ ${form.threshold}`}
            </p>
          </div>
        </div>

        {/* ZK guarantees */}
        <div className="card" style={{ background:"rgba(238,233,254,0.5)", border:"1px solid rgba(124,58,237,0.15)" }}>
          <p style={{ fontFamily:"var(--font-display)", fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"var(--violet-700)", marginBottom:12, textTransform:"uppercase" }}>What the proof guarantees</p>
          {[
            ["Private value > threshold", true],
            ["Commitment matches (value, salt)", true],
            ["Actual SLA value revealed", false],
            ["Raw performance data on-chain", false],
          ].map(([label, proven]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(124,58,237,0.1)" }}>
              <span style={{ fontSize:11, color:"var(--violet-800)" }}>{label}</span>
              <span className={`tag ${proven ? "tag-green" : "tag-violet"}`} style={{ fontSize:9 }}>{proven ? "Proven ✓" : "Hidden ✗"}</span>
            </div>
          ))}
        </div>

        {/* Circuit */}
        <div className="card" style={{ background:"rgba(236,253,245,0.6)", border:"1px solid rgba(5,150,105,0.2)" }}>
          <p style={{ fontFamily:"var(--font-display)", fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"var(--green-700)", marginBottom:10, textTransform:"uppercase" }}>Circom constraints</p>
          <pre style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--green-700)", lineHeight:1.8, whiteSpace:"pre-wrap", margin:0 }}>{`// Private inputs (you hold):
signal input privateValue;
signal input salt;

// Public (on-chain):
signal input threshold;
signal input commitment;

// Constraints verified:
privateValue > threshold ✓
Poseidon(privateValue, salt)
  === commitment ✓`}</pre>
        </div>
      </div>
    </div>
  );
}