import { useState } from "react";
import { createPayment } from "../utils/api";

export default function PayerDashboard() {
  const [form, setForm] = useState({
    amount: 100,
    threshold: 9900,       // 99.00% uptime in basis points
    recipientPubkey: "",
    privateValue: 9950,    // demo: payer knows threshold; recipient has actual value
    salt: "123456789",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await createPayment(form);
      setResult(res.data);
    } catch (err) {
      alert("Error: " + err.response?.data?.error);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <h2>Create Escrow Payment</h2>
      <label>Amount (USDC)</label>
      <input type="number" value={form.amount}
        onChange={e => setForm({...form, amount: e.target.value})} />

      <label>SLA Threshold (basis points, e.g. 9900 = 99%)</label>
      <input type="number" value={form.threshold}
        onChange={e => setForm({...form, threshold: e.target.value})} />

      <label>Recipient Wallet</label>
      <input value={form.recipientPubkey}
        onChange={e => setForm({...form, recipientPubkey: e.target.value})} />

      <button onClick={handleCreate} disabled={loading}>
        {loading ? "Locking funds..." : "Lock Funds in Escrow"}
      </button>

      {result && (
        <div style={{ marginTop: 16, background: "#f0f4ff", padding: 16, borderRadius: 8 }}>
          <p>✅ Escrow created!</p>
          <p><b>Escrow PDA:</b> {result.escrowPDA}</p>
          <p><b>Tx:</b> {result.tx}</p>
          <p><b>Commitment:</b> {result.commitment?.slice(0, 20)}...</p>
        </div>
      )}
    </div>
  );
}