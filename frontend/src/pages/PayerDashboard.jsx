import { useState, useEffect, useRef, useCallback } from "react";
import { DodoPayments } from "dodopayments-checkout";
import { createPayment, getPaymentStatus } from "../utils/api";
import TxTimeline from "../components/TxTimeline";
import DemoMode   from "../components/DemoMode";

/* ── SVG Icons ─────────────────────────────────────────────────────────── */
const IconLock     = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2.5" y="6" width="9" height="6.5" rx="1.5"/><path d="M5 6V4a2 2 0 014 0v2" strokeLinecap="round"/><circle cx="7" cy="9.5" r=".8" fill="currentColor" stroke="none"/></svg>;
const IconExternal = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4.5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V6.5M9 2H6.5M9 2v2.5M9 2L5 6" strokeLinecap="round" strokeLinejoin="round"/></svg>;

/* ── Poller hook (stable refs, no cleanup on re-render) ─────────────────── */
function usePaymentPoller(onConfirmed) {
  const intervalRef  = useRef(null);
  const callbackRef  = useRef(onConfirmed);
  const [polling, setPolling] = useState(false);
  useEffect(() => { callbackRef.current = onConfirmed; }, [onConfirmed]);

  const start = useCallback((id) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPolling(true);
    let attempts = 0;
    intervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await getPaymentStatus(id);
        if (res.data.status === "confirmed") {
          clearInterval(intervalRef.current); intervalRef.current = null;
          setPolling(false); callbackRef.current(res.data);
        } else if (res.data.status === "failed" || attempts >= 60) {
          clearInterval(intervalRef.current); intervalRef.current = null;
          setPolling(false); callbackRef.current(null);
        }
      } catch (e) { console.warn("[Poller]", e.message); }
    }, 2000);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setPolling(false);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);
  return { polling, start, stop };
}

/* ── Field helper ───────────────────────────────────────────────────────── */
const Field = ({ label, hint, children }) => (
  <div className="field">
    <label className="field-label">{label}</label>
    {children}
    {hint && <p className="field-hint">{hint}</p>}
  </div>
);

/* ── InfoRow ────────────────────────────────────────────────────────────── */
const InfoRow = ({ label, value, accent }) => (
  <div style={{ padding:"8px 0", borderBottom:"1px solid rgba(148,163,184,0.12)", display:"flex", justifyContent:"space-between", gap:12, alignItems:"baseline" }}>
    <span style={{ fontFamily:"var(--font-display)", fontSize:8, fontWeight:700, letterSpacing:"0.14em", color:"var(--slate-400)", textTransform:"uppercase", flexShrink:0 }}>{label}</span>
    <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color: accent ? "var(--violet-600)" : "var(--slate-600)", wordBreak:"break-all", textAlign:"right" }}>{value}</span>
  </div>
);

/* ── Main ───────────────────────────────────────────────────────────────── */
export default function PayerDashboard({ onEscrowCreated, demoState, connectedPayer, addEvent, updateLastEvent, txEvents }) {
  const [form, setForm] = useState({ amount:10, threshold:9900, recipientPubkey:"", privateValue:9950, salt:12345, commitment:"" });
  const [result,         setResult]         = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [awaitingPayment,setAwaitingPayment] = useState(false);
  const localIdRef = useRef(null);

  const poller = usePaymentPoller((data) => {
    if (data) {
      updateLastEvent("done", `PDA: ${data.escrowPDA?.slice(0,20)}…`);
      addEvent("Escrow live on testnet", data.escrowTx ? `${data.escrowTx.slice(0,20)}…` : "Created via webhook", "done");
      setResult(data); setAwaitingPayment(false); setLoading(false);
      onEscrowCreated?.({ ...data, threshold:form.threshold, payerPubkey:connectedPayer||data.payerPubkey, recipientPubkey:data.recipientPubkey||form.recipientPubkey });
    } else {
      updateLastEvent("error", "Payment failed or cancelled");
      setError("Payment failed. Please try again.");
      setAwaitingPayment(false); setLoading(false);
    }
  });

  /* Resume after Dodo redirect */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const localId = p.get("payment"), status = p.get("status");
    if (localId && status === "success") {
      // Do NOT call replaceState here — React Strict Mode runs this effect
      // twice (mount→unmount→remount). If we wipe the URL on the first run,
      // the second (real) run sees nothing and the poller never starts!
      localIdRef.current = localId;
      setAwaitingPayment(true);
      setLoading(true);
      addEvent("Dodo Checkout", "Payment completed — redirected back", "done");
      addEvent("Solana · Escrow", "Waiting for webhook & escrow creation…", "pending");
      poller.start(localId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    DodoPayments.Initialize({
      mode:"test", displayType:"overlay",
      onEvent:(ev) => {
        if (["payment.success","checkout.success","payment.succeeded"].includes(ev.event_type)) DodoPayments.Checkout.close();
      }
    });
  }, []);

  useEffect(() => { if (demoState?.recipientPubkey) setForm(f => ({ ...f, recipientPubkey:demoState.recipientPubkey })); }, [demoState]);

  const handle = k => e => setForm(f => ({ ...f, [k]:e.target.value }));
  const fill   = vals  => setForm(f => ({ ...f, ...vals }));

  const submit = async () => {
    setLoading(true); setError(null); setResult(null);
    addEvent("Dodo Payments", "Creating checkout session…", "pending");
    try {
      const res = await createPayment({ ...form, payerPubkey:connectedPayer||"", customerEmail:"payer@test.com" });
      const { checkoutUrl, localId, commitment } = res.data;
      localIdRef.current = localId;
      updateLastEvent("done", "Checkout session created");
      addEvent("ZK commitment", `Poseidon hash: ${commitment?.slice(0,20)}…`, "done");
      addEvent("Dodo Checkout", "Waiting for payment in overlay…", "pending");
      setAwaitingPayment(true);
      DodoPayments.Checkout.open({ checkoutUrl });
      addEvent("Solana · Escrow", "Waiting for payment confirmation & escrow…", "pending");
      poller.start(localId);
    } catch (e) {
      updateLastEvent("error", e.response?.data?.error || e.message);
      setError(e.response?.data?.error || e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:24, alignItems:"start" }}>

      {/* ── Form card ─────────────────────────────────────────────── */}
      <div className="card card-violet">
        <div className="card-header">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h2 className="card-title">Create Escrow Payment</h2>
              <p className="card-sub">Pay via Dodo Payments → USDC locked on Solana with ZK-verifiable release</p>
              <p style={{ fontSize:11, color:"var(--slate-400)", marginTop:6 }}>
                {connectedPayer ? `Phantom wallet (${connectedPayer.slice(0,4)}…${connectedPayer.slice(-4)}) will sign` : "Using backend demo key — connect Phantom for real signing"}
              </p>
            </div>
            <span className="tag tag-violet">Payer</span>
          </div>
        </div>

        <DemoMode onFill={fill} demoState={demoState} />

        {awaitingPayment && (
          <div style={{ background:"rgba(238,233,254,0.7)", border:"1px solid rgba(124,58,237,0.2)", borderRadius:"var(--radius-md)", padding:"14px 16px", marginBottom:20, display:"flex", gap:12, alignItems:"center", backdropFilter:"blur(8px)" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", border:"2px solid rgba(124,58,237,0.2)", borderTopColor:"var(--violet-600)", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
            <div>
              <p style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:11, color:"var(--violet-700)", letterSpacing:"0.06em", marginBottom:3 }}>WAITING FOR PAYMENT & ESCROW</p>
              <p style={{ fontSize:11, color:"var(--slate-500)", fontFamily:"var(--font-mono)" }}>Complete with test card <strong style={{ color:"var(--slate-700)" }}>4242 4242 4242 4242</strong> (exp: 06/32 · CVV: 123)</p>
            </div>
          </div>
        )}

        <div className="grid-2">
          <Field label="Amount (USD)" hint="Pay What You Want — min $1">
            <input className="field-input" type="number" value={form.amount} onChange={handle("amount")} />
          </Field>
          <Field label="SLA threshold" hint="9900 = 99.00% uptime">
            <input className="field-input" type="number" value={form.threshold} onChange={handle("threshold")} />
          </Field>
        </div>

        <Field label="Recipient wallet address" hint="Solana testnet public key">
          <input className="field-input field-mono" value={form.recipientPubkey} onChange={handle("recipientPubkey")} placeholder="Paste recipient Solana public key…" />
        </Field>

        <div className="divider" />
        <div className="section-label">ZK commitment</div>

        <Field label="Commitment hash (from recipient)" hint="Poseidon(value, salt) — generated by recipient via Generate Commitment tab">
          <input className="field-input field-mono" value={form.commitment} onChange={handle("commitment")} placeholder="Paste commitment hash from recipient…" />
        </Field>

        <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={loading || awaitingPayment} style={{ marginTop:4 }}>
          {loading
            ? awaitingPayment
              ? <><span className="spinner" style={{ borderTopColor:"#fff", borderColor:"rgba(255,255,255,0.3)" }} />Waiting for payment & escrow…</>
              : <><span className="spinner" style={{ borderTopColor:"#fff", borderColor:"rgba(255,255,255,0.3)" }} />Creating checkout…</>
            : <><IconLock />Pay & Lock Funds</>}
        </button>

        {error && (
          <div className="alert alert-error" style={{ marginTop:16 }}>
            <p className="alert-title">Transaction failed</p>
            <p style={{ fontSize:12, marginTop:3 }}>{error}</p>
          </div>
        )}

        <TxTimeline events={txEvents} />
      </div>

      {/* ── Right sidebar ──────────────────────────────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Escrow result */}
        {result ? (
          <div className="card card-green" style={{ background:"rgba(236,253,245,0.75)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <p style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:12, color:"var(--green-700)", letterSpacing:"0.06em" }}>ESCROW CREATED</p>
              <span className="tag tag-green">Live on Testnet</span>
            </div>
            <div className="grid-2" style={{ marginBottom:14 }}>
              {[["Amount locked", `${form.amount} USDC`], ["SLA threshold", `${(form.threshold/100).toFixed(2)}%`]].map(([l,v]) => (
                <div key={l} style={{ background:"rgba(255,255,255,0.7)", border:"1px solid rgba(5,150,105,0.15)", borderRadius:"var(--radius-md)", padding:"10px 14px" }}>
                  <div className="info-label">{l}</div>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:16, color:"var(--green-600)" }}>{v}</div>
                </div>
              ))}
            </div>
            <InfoRow label="Escrow PDA"  value={result.escrowPDA} accent />
            <InfoRow label="Transaction" value={result.escrowTx || "N/A"} />
            <InfoRow label="Commitment"  value={result.commitment} />
            {result.escrowTx && (
              <a href={`https://explorer.solana.com/tx/${result.escrowTx}?cluster=testnet`}
                target="_blank" rel="noreferrer"
                style={{ marginTop:14, display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"var(--green-600)", textDecoration:"underline", textUnderlineOffset:2 }}>
                View on Solana Explorer <IconExternal />
              </a>
            )}
          </div>
        ) : (
          <div className="card" style={{ background:"rgba(245,243,255,0.5)", border:"1.5px dashed rgba(139,92,246,0.2)", textAlign:"center", padding:"36px 24px" }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:"var(--violet-50)", border:"1.5px solid rgba(124,58,237,0.2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
              <IconLock />
            </div>
            <p style={{ fontSize:12, color:"var(--slate-400)", fontFamily:"var(--font-mono)" }}>Escrow details appear here after payment</p>
          </div>
        )}

        {/* How it works */}
        <div className="card" style={{ background:"rgba(238,233,254,0.5)", border:"1px solid rgba(124,58,237,0.15)" }}>
          <p style={{ fontFamily:"var(--font-display)", fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"var(--violet-700)", marginBottom:14, textTransform:"uppercase" }}>How it works</p>
          {[["You pay via Dodo (fiat → USDC)"],["Poseidon commitment stored on-chain"],["Webhook → USDC locked in Solana PDA"],["Recipient proves via ZK — nothing revealed"]].map(([t],i) => (
            <div key={t} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
              <span style={{ width:20, height:20, background:"var(--violet-600)", color:"#fff", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, flexShrink:0, fontFamily:"var(--font-display)" }}>{i+1}</span>
              <p style={{ fontSize:12, color:"var(--violet-800)", lineHeight:1.55, margin:0 }}>{t}</p>
            </div>
          ))}
        </div>

        {/* Test cards */}
        <div className="card" style={{ background:"rgba(254,243,199,0.6)", border:"1px solid rgba(245,158,11,0.2)" }}>
          <p style={{ fontFamily:"var(--font-display)", fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"#92400e", marginBottom:10, textTransform:"uppercase" }}>Test card details</p>
          {[["India (INR)", "4576 2389 1277 1450"], ["Global (USD)", "4242 4242 4242 4242"]].map(([region, card]) => (
            <div key={region} style={{ marginBottom:8, paddingBottom:8, borderBottom:"1px solid rgba(245,158,11,0.15)" }}>
              <p style={{ fontSize:9, fontWeight:700, color:"#92400e", letterSpacing:"0.1em", margin:"0 0 3px", fontFamily:"var(--font-display)", textTransform:"uppercase" }}>{region}</p>
              <p style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"#78350f", margin:"0 0 1px" }}>{card}</p>
              <p style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"#92400e", margin:0 }}>Exp: 06/32 · CVV: 123</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}