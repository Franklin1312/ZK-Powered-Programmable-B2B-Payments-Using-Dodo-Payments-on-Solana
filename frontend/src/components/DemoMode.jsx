export default function DemoMode({ onFill, demoState }) {
  if (!demoState) return null;

  const fillPayer = () => onFill({
    amount:          demoState.amount          || 10,
    threshold:       demoState.threshold       || 9900,
    recipientPubkey: demoState.recipientPubkey || "",
    privateValue:    demoState.privateValue    || 9950,
    salt:            demoState.salt            || 12345,
    commitment:      demoState.commitment      || "",
  });

  const fillRecipient = () => onFill({
    privateValue:    demoState.privateValue    || 9950,
    salt:            demoState.salt            || 12345,
    threshold:       demoState.threshold       || 9900,
    commitment:      demoState.commitment      || "",
    payerPubkey:     demoState.payerPubkey     || "",
    recipientPubkey: demoState.recipientPubkey || "",
    escrowPDA:       demoState.escrowPDA       || "",
  });

  return (
    <div className="demo-banner">
      <div className="demo-banner-left">
        <span className="demo-mode-tag">DEMO MODE</span>
        <span style={{ fontSize: 12, color: "var(--amber-600)" }}>
          Pre-fill all fields with working demo values
        </span>
      </div>
      <div className="demo-banner-btns">
        <button onClick={fillPayer} className="btn btn-sm" style={{
          background:"rgba(124,58,237,0.08)", color:"var(--violet-600)",
          border:"1px solid rgba(124,58,237,0.2)", fontFamily:"var(--font-display)",
          fontSize:9, letterSpacing:"0.1em",
        }}>
          Fill as Payer
        </button>
        <button onClick={fillRecipient} className="btn btn-sm" style={{
          background:"rgba(5,150,105,0.08)", color:"var(--green-600)",
          border:"1px solid rgba(5,150,105,0.2)", fontFamily:"var(--font-display)",
          fontSize:9, letterSpacing:"0.1em",
        }}>
          Fill as Recipient
        </button>
      </div>
    </div>
  );
}