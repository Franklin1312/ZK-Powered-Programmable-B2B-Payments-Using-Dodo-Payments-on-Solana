// DemoMode.jsx — drop into any dashboard to pre-fill fields for demo
// Usage: <DemoMode onFill={(vals) => setForm({...form, ...vals})} demoState={demoState} />

export default function DemoMode({ onFill, demoState }) {
  const DEMO_VALUES = {
    payer: {
      amount: 10,
      threshold: 9900,
      recipientPubkey: demoState?.recipientPubkey || "",
      privateValue: 9950,
      salt: 12345,
    },
    recipient: {
      privateValue: 9950,
      salt: 12345,
      threshold: 9900,
      commitment: demoState?.commitment || "",
      payerPubkey: demoState?.payerPubkey || "",
    },
  };

  return (
    <div style={s.banner}>
      <div style={s.left}>
        <span style={s.tag}>DEMO MODE</span>
        <p style={s.text}>Pre-fill all fields with working demo values</p>
      </div>
      <div style={s.actions}>
        <button style={{ ...s.btn, ...s.btnPayer }}
          onClick={() => onFill(DEMO_VALUES.payer)}>
          Fill as Payer
        </button>
        <button style={{ ...s.btn, ...s.btnRecipient }}
          onClick={() => onFill(DEMO_VALUES.recipient)}>
          Fill as Recipient
        </button>
      </div>
    </div>
  );
}

const s = {
  banner:      { background: "linear-gradient(135deg, #fffbeb, #fff7ed)",
                 border: "1px solid #fde68a", borderRadius: 12,
                 padding: "12px 16px", marginBottom: 20,
                 display: "flex", justifyContent: "space-between",
                 alignItems: "center", gap: 16, flexWrap: "wrap" },
  left:        { display: "flex", alignItems: "center", gap: 10 },
  tag:         { background: "#f59e0b", color: "#fff", fontSize: 9,
                 fontWeight: 700, letterSpacing: "1px", borderRadius: 4,
                 padding: "2px 6px", fontFamily: "'DM Mono', monospace" },
  text:        { fontSize: 12, color: "#92400e", margin: 0 },
  actions:     { display: "flex", gap: 8 },
  btn:         { padding: "6px 14px", borderRadius: 8, border: "none",
                 fontSize: 12, fontWeight: 500, cursor: "pointer",
                 fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  btnPayer:    { background: "#6366f1", color: "#fff" },
  btnRecipient:{ background: "#0891b2", color: "#fff" },
};