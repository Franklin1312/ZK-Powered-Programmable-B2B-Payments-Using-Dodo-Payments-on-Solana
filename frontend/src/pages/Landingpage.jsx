import { useState } from "react";

export default function LandingPage({ onEnter }) {
  const [hovered, setHovered] = useState(null);

  const roles = [
    {
      id: "payer",
      icon: "⬡",
      title: "I'm a Payer",
      sub: "Lock funds with a condition",
      color: "#6366f1",
      bg: "#eef2ff",
      border: "#c7d2fe",
    },
    {
      id: "recipient",
      icon: "◈",
      title: "I'm a Recipient",
      sub: "Prove condition, claim funds",
      color: "#0891b2",
      bg: "#ecfeff",
      border: "#a5f3fc",
    },
    {
      id: "status",
      icon: "◎",
      title: "Verify an Escrow",
      sub: "Check any escrow on-chain",
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    },
  ];

  return (
    <div style={s.root}>
      {/* Mesh bg */}
      <div style={s.mesh} />

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.badge}>
          <span style={s.badgeDot} /> Live on Solana Testnet
        </div>

        <h1 style={s.h1}>
          Programmable B2B Payments
          <br />
          <span style={s.h1accent}>with Zero-Knowledge Proofs</span>
        </h1>

        <p style={s.tagline}>
          Lock funds in escrow. Release automatically when conditions are proven —
          <br />
          without revealing any sensitive business data.
        </p>

        {/* Tech stack pills */}
        <div style={s.pills}>
          {["Solana · Anchor", "Circom · Groth16", "SnarkJS", "Dodo Payments"].map(t => (
            <span key={t} style={s.pill}>{t}</span>
          ))}
        </div>

        {/* Stats row */}
        <div style={s.stats}>
          {[
            { n: "< 30s",  label: "Proof generation" },
            { n: "Groth16", label: "ZK system" },
            { n: "0",      label: "Data revealed on-chain" },
            { n: "100%",   label: "Trustless" },
          ].map(({ n, label }) => (
            <div key={label} style={s.stat}>
              <span style={s.statN}>{n}</span>
              <span style={s.statL}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Role cards */}
      <div style={s.cards}>
        {roles.map(r => (
          <button
            key={r.id}
            style={{
              ...s.roleCard,
              borderColor: hovered === r.id ? r.border : "#e2e8f0",
              background: hovered === r.id ? r.bg : "#fff",
              transform: hovered === r.id ? "translateY(-4px)" : "none",
              boxShadow: hovered === r.id
                ? `0 12px 40px ${r.color}18, 0 4px 12px ${r.color}10`
                : "0 2px 8px rgba(0,0,0,0.06)",
            }}
            onMouseEnter={() => setHovered(r.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onEnter(r.id)}
          >
            <div style={{ ...s.roleIcon, background: r.bg, color: r.color, border: `1px solid ${r.border}` }}>
              {r.icon}
            </div>
            <h3 style={{ ...s.roleTitle, color: hovered === r.id ? r.color : "#1e293b" }}>{r.title}</h3>
            <p style={s.roleSub}>{r.sub}</p>
            <span style={{ ...s.roleArrow, color: r.color, opacity: hovered === r.id ? 1 : 0 }}>
              Enter →
            </span>
          </button>
        ))}
      </div>

      {/* Flow diagram */}
      <div style={s.flow}>
        <p style={s.flowTitle}>How it works</p>
        <div style={s.flowSteps}>
          {[
            { icon: "💳", step: "Payer deposits", sub: "via Dodo Payments" },
            { icon: "🔒", step: "Funds locked",   sub: "Solana escrow PDA" },
            { icon: "🔐", step: "ZK proof",       sub: "Circom + SnarkJS" },
            { icon: "✓",  step: "Verified",       sub: "On-chain check" },
            { icon: "💸", step: "Auto release",   sub: "To recipient" },
          ].map(({ icon, step, sub }, i, arr) => (
            <div key={step} style={{ display: "flex", alignItems: "center" }}>
              <div style={s.flowStep}>
                <div style={s.flowIcon}>{icon}</div>
                <span style={s.flowStepLabel}>{step}</span>
                <span style={s.flowStepSub}>{sub}</span>
              </div>
              {i < arr.length - 1 && <div style={s.flowArrow}>→</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  root:   { minHeight: "100vh", display: "flex", flexDirection: "column",
            alignItems: "center", padding: "0 24px 60px", position: "relative",
            overflow: "hidden" },
  mesh:   { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
            background: `
              radial-gradient(ellipse 70% 50% at 20% 10%, rgba(99,102,241,0.07) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 80% 5%, rgba(8,145,178,0.05) 0%, transparent 55%),
              radial-gradient(ellipse 50% 60% at 50% 100%, rgba(5,150,105,0.04) 0%, transparent 60%)
            ` },
  hero:   { position: "relative", zIndex: 1, textAlign: "center",
            maxWidth: 720, paddingTop: 80, paddingBottom: 20 },
  badge:  { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
            color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0",
            borderRadius: 20, padding: "4px 12px", marginBottom: 28, fontWeight: 500 },
  badgeDot: { width: 6, height: 6, borderRadius: "50%", background: "#34d399",
              animation: "pulse-dot 2s ease-in-out infinite", display: "inline-block" },
  h1:     { fontSize: 44, fontWeight: 700, color: "#0f172a", lineHeight: 1.15,
            letterSpacing: "-1px", margin: "0 0 20px", fontFamily: "'DM Sans', sans-serif" },
  h1accent: { background: "linear-gradient(135deg, #6366f1, #0891b2)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text" },
  tagline: { fontSize: 17, color: "#64748b", lineHeight: 1.7, margin: "0 0 28px",
             fontWeight: 400 },
  pills:  { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 40 },
  pill:   { background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20,
            padding: "5px 14px", fontSize: 12, color: "#475569", fontWeight: 500,
            fontFamily: "'DM Mono', monospace" },
  stats:  { display: "flex", justifyContent: "center", gap: 0, borderTop: "1px solid #f1f5f9",
            paddingTop: 32, marginBottom: 0 },
  stat:   { display: "flex", flexDirection: "column", alignItems: "center",
            padding: "0 32px", borderRight: "1px solid #f1f5f9" },
  statN:  { fontSize: 22, fontWeight: 700, color: "#1e293b", letterSpacing: "-0.5px",
            fontFamily: "'DM Sans', sans-serif" },
  statL:  { fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: 400 },
  cards:  { position: "relative", zIndex: 1, display: "flex", gap: 16,
            maxWidth: 800, width: "100%", marginTop: 48, marginBottom: 48 },
  roleCard: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              padding: "28px 20px", border: "1.5px solid", borderRadius: 20,
              cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
              fontFamily: "'DM Sans', sans-serif", gap: 8 },
  roleIcon: { width: 52, height: 52, borderRadius: 14, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 22,
              marginBottom: 4, transition: "all 0.2s" },
  roleTitle: { fontSize: 16, fontWeight: 600, margin: 0, transition: "color 0.2s" },
  roleSub:  { fontSize: 12, color: "#94a3b8", margin: 0 },
  roleArrow: { fontSize: 12, fontWeight: 600, marginTop: 4,
               transition: "opacity 0.2s" },
  flow:   { position: "relative", zIndex: 1, maxWidth: 900, width: "100%",
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20,
            padding: "28px 36px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  flowTitle: { fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 20,
               letterSpacing: "0.5px", textTransform: "uppercase" },
  flowSteps: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  flowStep: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  flowIcon: { fontSize: 22, width: 48, height: 48, background: "#f8fafc",
              border: "1px solid #e2e8f0", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center" },
  flowStepLabel: { fontSize: 12, fontWeight: 600, color: "#334155" },
  flowStepSub:   { fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace" },
  flowArrow: { color: "#cbd5e1", fontSize: 18, margin: "0 4px", paddingBottom: 24 },
};