import { useState, useEffect, useRef, useCallback } from "react";
import { DodoPayments } from "dodopayments-checkout";
import { createPayment, getPaymentStatus } from "../utils/api";
import TxTimeline from "../components/TxTimeline";
import DemoMode   from "../components/DemoMode";

// ── Poll for escrow creation (after webhook fires) ──────────
function usePaymentPoller(onConfirmed) {
  const intervalRef = useRef(null);
  const callbackRef = useRef(onConfirmed);
  const [polling, setPolling] = useState(false);

  // Keep callback ref fresh so we never close over stale state
  useEffect(() => { callbackRef.current = onConfirmed; }, [onConfirmed]);

  const start = useCallback((id) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPolling(true);
    let attempts = 0;
    const MAX = 60; // stop after 2 minutes

    intervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await getPaymentStatus(id);
        console.log(`[Poller] attempt ${attempts} — status: ${res.data.status}`);
        if (res.data.status === "confirmed") {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setPolling(false);
          callbackRef.current(res.data);
        } else if (res.data.status === "failed") {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setPolling(false);
          callbackRef.current(null);
        } else if (attempts >= MAX) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setPolling(false);
          callbackRef.current(null);
        }
      } catch (e) {
        console.warn("[Poller] error:", e.message);
      }
    }, 2000);
  }, []); // stable — never recreated

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setPolling(false);
  }, []);

  // Only clear on actual unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return { polling, start, stop };
}
export default function PayerDashboard({ onEscrowCreated, demoState, connectedPayer, addEvent, updateLastEvent, txEvents }) {
  const [form, setForm] = useState({
    amount: 10, threshold: 9900,
    recipientPubkey: "", privateValue: 9950, salt: 12345,
  });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const localIdRef = useRef(null);

  const poller = usePaymentPoller((data) => {
    if (data) {
      updateLastEvent("done", `PDA: ${data.escrowPDA?.slice(0, 20)}...`);
      addEvent("Escrow live on testnet", data.escrowTx
        ? `${data.escrowTx.slice(0, 20)}...`
        : "Escrow created via webhook", "done");

      setResult(data);
      setAwaitingPayment(false);
      setLoading(false);
      onEscrowCreated && onEscrowCreated({
        ...data,
        threshold: form.threshold,
        payerPubkey: connectedPayer || data.payerPubkey,
        recipientPubkey: data.recipientPubkey || form.recipientPubkey,
      });
    } else {
      updateLastEvent("error", "Payment failed or was cancelled");
      setError("Payment failed. Please try again.");
      setAwaitingPayment(false);
      setLoading(false);
    }
  });

  // ── Resume after Dodo redirect ───────────────────────────
  // When Dodo redirects back with ?payment=<localId>&status=success
  // we skip straight to polling — no need to re-open the overlay.
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const localId  = params.get("payment");
    const status   = params.get("status");

    if (localId && status === "success") {
      // Removed history.replaceState because React Strict Mode runs useEffect twice.
      // If we clean the URL on the first run, the second run sees nothing and the poller never starts!

      localIdRef.current = localId;
      setAwaitingPayment(true);
      setLoading(true);
      addEvent("Dodo Checkout", "Payment completed — redirected back", "done");
      addEvent("Solana · Escrow", "Waiting for webhook & escrow creation...", "pending");
      poller.start(localId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Initialize Dodo Payments after component mounts
    DodoPayments.Initialize({
      mode: "test",
      displayType: "overlay",
      onEvent: (event) => {
        console.log("[Dodo Overlay Event]", event);
        if (event.event_type === "payment.success" || event.event_type === "checkout.success" || event.event_type === "payment.succeeded") {
          // Automatically close the overlay when payment succeeds
          // so the user sees the React UI (Escrow details) immediately!
          console.log("Payment successful, closing overlay...");
          DodoPayments.Checkout.close();
        }
      }
    });
  }, []);

  useEffect(() => {
    if (demoState?.recipientPubkey) {
      setForm(f => ({ ...f, recipientPubkey: demoState.recipientPubkey }));
    }
  }, [demoState]);

  const handle = k => e => setForm({ ...form, [k]: e.target.value });
  const fill   = vals  => setForm(f => ({ ...f, ...vals }));

  const submit = async () => {
    setLoading(true); setError(null); setResult(null);
    addEvent("Dodo Payments", "Creating checkout session...", "pending");

    try {
      // 1. Backend creates Dodo checkout session
      const payload = {
        ...form,
        payerPubkey: connectedPayer || "",
        customerEmail: "payer@test.com",
      };
      const res = await createPayment(payload);
      const { checkoutUrl, localId, commitment } = res.data;

      localIdRef.current = localId;
      updateLastEvent("done", "Checkout session created");

      addEvent("ZK commitment", `Poseidon hash: ${commitment?.slice(0, 20)}...`, "done");

      // 2. Open Dodo overlay checkout
      addEvent("Dodo Checkout", "Waiting for payment in overlay...", "pending");
      setAwaitingPayment(true);

      DodoPayments.Checkout.open({ checkoutUrl });

      // 3. Start polling for webhook confirmation
      // The overlay will close when user pays or cancels.
      // We poll regardless — the webhook is the source of truth.
      addEvent("Solana · Escrow", "Waiting for payment confirmation & escrow creation...", "pending");
      poller.start(localId);

    } catch (e) {
      updateLastEvent("error", e.response?.data?.error || e.message);
      setError(e.response?.data?.error || e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:24, alignItems:"start" }}>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Create Escrow Payment</h2>
          <p className="card-sub">Pay via Dodo Payments → USDC locked on Solana with ZK-verifiable release</p>
          <p style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 8, marginBottom: 0 }}>
            {connectedPayer
              ? `Signer mode: Phantom wallet (${connectedPayer.slice(0, 4)}...${connectedPayer.slice(-4)})`
              : "Signer mode: Backend demo key (.env fallback)"}
          </p>
        </div>

        <DemoMode onFill={fill} demoState={demoState} />

        <div className="grid-2">
          <Field label="Amount (USD)" hint="Pay What You Want — minimum $1">
            <input className="field-input" type="number" value={form.amount} onChange={handle("amount")} />
          </Field>
          <Field label="SLA threshold" hint="9900 = 99.00% uptime">
            <input className="field-input" type="number" value={form.threshold} onChange={handle("threshold")} />
          </Field>
        </div>

        <Field label="Recipient wallet address" hint="Solana testnet public key">
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

        <button className="btn btn-primary" onClick={submit}
          disabled={loading || awaitingPayment} style={{ marginTop:8 }}>
          {loading
            ? awaitingPayment
              ? <><span className="spinner" /> Waiting for payment & escrow...</>
              : <><span className="spinner" /> Creating checkout...</>
            : "Pay & Lock Funds →"}
        </button>

        {awaitingPayment && (
          <div className="alert" style={{ marginTop:16, background:"#eff6ff", border:"1px solid #bfdbfe" }}>
            <p className="alert-title" style={{ color:"#1d4ed8" }}>Overlay checkout is open</p>
            <p style={{ fontSize:12, color:"#1e40af", margin:0 }}>
              Complete the payment using test card <strong>4242 4242 4242 4242</strong> (exp: 06/32, CVV: 123).
              The escrow will be created automatically after payment.
            </p>
          </div>
        )}

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
              <span className="tag tag-green">Live on testnet</span>
            </div>
            <div className="info-grid">
              <InfoTile label="Amount locked"  value={`${form.amount} USDC`} />
              <InfoTile label="SLA threshold"  value={`${(form.threshold/100).toFixed(2)}%`} />
            </div>
            <InfoRow label="Escrow PDA"  value={result.escrowPDA} />
            <InfoRow label="Transaction" value={result.escrowTx || "N/A"} />
            <InfoRow label="Commitment"  value={result.commitment} />
            <InfoRow label="Payment ID"  value={result.localId} />
            <p style={{fontSize:11, color:"var(--green-600)", marginTop:8}}>
              ✓ Paid via Dodo Payments (test mode) · Escrow locked on Solana testnet
            </p>
            {result.escrowTx && (
              <a className="alert-link" style={{ marginTop:14 }}
                href={`https://explorer.solana.com/tx/${result.escrowTx}?cluster=testnet`}
                target="_blank" rel="noreferrer">
                View on Solana Explorer →
              </a>
            )}
          </div>
        ) : (
          <div className="card" style={{ background:"var(--gray-50)",
            border:"1.5px dashed var(--gray-200)", textAlign:"center" }}>
            <p style={{ fontSize:13, color:"var(--gray-300)", padding:"28px 0" }}>
              Escrow details appear here after payment
            </p>
          </div>
        )}

        <div className="card" style={{ background:"var(--indigo-50)", border:"1px solid var(--indigo-100)" }}>
          <p style={{ fontSize:12, fontWeight:600, color:"var(--indigo-600)", marginBottom:12 }}>
            How it works
          </p>
          {[
            ["1","You pay via Dodo Payments checkout (fiat → USDC)"],
            ["2","Poseidon(value, salt) stored as commitment hash"],
            ["3","Webhook fires → USDC locked in Solana PDA escrow"],
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

        <div className="card" style={{ background:"#fffbeb", border:"1px solid #fde68a" }}>
          <p style={{ fontSize:12, fontWeight:600, color:"#92400e", marginBottom:8 }}>
            Test card details
          </p>
          <p style={{ fontSize:11, color:"#78350f", fontFamily:"var(--font-mono)", margin:0, lineHeight:1.8 }}>
            <strong>India (INR) Test Card:</strong><br/>
            Card: 4576 2389 1277 1450<br/>
            Expiry: 06/32 | CVV: 123
          </p>
          <p style={{ fontSize:11, color:"#78350f", fontFamily:"var(--font-mono)", margin:0, marginTop:8, lineHeight:1.8 }}>
            <strong>Global (US) Test Card:</strong><br/>
            Card: 4242 4242 4242 4242<br/>
            Expiry: 06/32 | CVV: 123
          </p>
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