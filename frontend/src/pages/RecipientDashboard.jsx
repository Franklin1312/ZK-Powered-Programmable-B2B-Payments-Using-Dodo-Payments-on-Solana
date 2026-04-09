import { useState } from "react";
import { generateProof, releasePayment } from "../utils/api";

export default function RecipientDashboard() {
  const [form, setForm] = useState({
    privateValue: 9950,    // actual SLA uptime — NEVER sent on-chain
    salt: "123456789",
    threshold: 9900,
    commitment: "",
    payerPubkey: "",
  });
  const [proof, setProof] = useState(null);
  const [released, setReleased] = useState(null);
  const [step, setStep] = useState(0);

  const handleGenerateProof = async () => {
    setStep(1);
    const res = await generateProof(form);
    setProof(res.data);
    setStep(2);
  };

  const handleRelease = async () => {
    setStep(3);
    const res = await releasePayment({
      proof: proof.proof,
      publicSignals: proof.publicSignals,
      payerPubkey: form.payerPubkey,
    });
    setReleased(res.data);
    setStep(4);
  };

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <h2>Claim Payment (Recipient)</h2>

      <label>Your Actual SLA Value (private, never shared)</label>
      <input type="number" value={form.privateValue}
        onChange={e => setForm({...form, privateValue: e.target.value})} />

      <label>Commitment Hash (from payer)</label>
      <input value={form.commitment}
        onChange={e => setForm({...form, commitment: e.target.value})} />

      <label>Payer Wallet Address</label>
      <input value={form.payerPubkey}
        onChange={e => setForm({...form, payerPubkey: e.target.value})} />

      <div style={{ marginTop: 16 }}>
        <button onClick={handleGenerateProof} disabled={step > 0}>
          {step === 1 ? "Generating proof..." : "Generate ZK Proof"}
        </button>

        {proof && (
          <div style={{ margin: "12px 0", background: "#f0fff4", padding: 12, borderRadius: 8 }}>
            <p>✅ Proof generated & verified locally</p>
            <p style={{ fontSize: 12, wordBreak: "break-all" }}>
              π_a: {JSON.stringify(proof.proof.pi_a).slice(0, 40)}...
            </p>
          </div>
        )}

        <button onClick={handleRelease} disabled={!proof || step > 2}
          style={{ marginTop: 8 }}>
          {step === 3 ? "Releasing..." : "Submit Proof & Release Payment"}
        </button>

        {released && (
          <div style={{ marginTop: 16, background: "#fff0f4", padding: 16, borderRadius: 8 }}>
            <h3>🎉 Payment Released!</h3>
            <p><b>Tx:</b> {released.tx}</p>
          </div>
        )}
      </div>
    </div>
  );
}