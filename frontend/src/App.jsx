import { useEffect, useState, useRef } from "react";
import LandingPage from "./pages/Landingpage";
import PayerDashboard from "./pages/PayerDashboard";
import RecipientDashboard from "./pages/RecipientDashboard";
import StatusChecker from "./pages/StatusChecker";
import CommitmentGenerator from "./pages/CommitmentGenerator";
import { getDemoState } from "./utils/api";
import { getPhantomProvider } from "./utils/wallet";
import "./App.css";

/* ── SVG Icons (no emojis) ─────────────────────────────────────────────── */
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 1.5L16 5V9.5C16 13 13 16 9 16.5C5 16 2 13 2 9.5V5L9 1.5Z"
      fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M6.5 9l2 2L12 7" stroke="white" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconLock = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="2" y="5.5" width="9" height="6" rx="1.5"/>
    <path d="M4.5 5.5V3.5a2 2 0 014 0v2" strokeLinecap="round"/>
    <circle cx="6.5" cy="8.5" r="0.8" fill="currentColor" stroke="none"/>
  </svg>
);

const IconStar = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M6.5 1.5l1.4 3h3l-2.5 2 1 3-2.9-2-2.9 2 1-3-2.5-2h3z" strokeLinejoin="round"/>
  </svg>
);

const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M6.5 2v6M4 6l2.5 2.5L9 6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 10.5h9" strokeLinecap="round"/>
  </svg>
);

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="6.5" cy="6.5" r="5"/>
    <path d="M4.5 6.5l1.5 1.5 2.5-3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconWallet = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
    <rect x="1" y="3" width="10" height="8" rx="1.5"/>
    <path d="M8 7h1.5" strokeLinecap="round"/>
    <path d="M3 3V2a2 2 0 014 0v1" strokeLinecap="round"/>
  </svg>
);

/* ── Tabs ──────────────────────────────────────────────────────────────── */
const TABS = [
  { id: "commit",    label: "Generate Commitment", Icon: IconStar },
  { id: "payer",     label: "Lock Payment",        Icon: IconLock },
  { id: "recipient", label: "Claim Payment",       Icon: IconDownload },
  { id: "status",    label: "Verify Status",       Icon: IconCheck },
];

/* ── Stats bar data ────────────────────────────────────────────────────── */
const STATS = [
  { label: "Network",     value: "Solana Testnet",   cls: "green" },
  { label: "ZK System",   value: "Groth16 · bn128",  cls: "accent" },
  { label: "Circuit",     value: "threshold.circom", cls: "" },
  { label: "Hash Fn",     value: "Poseidon",         cls: "" },
  { label: "Proof Size",  value: "~200 bytes",       cls: "" },
  { label: "Verify Time", value: "< 1s on-chain",    cls: "gold" },
];

export default function App() {
  const _p = new URLSearchParams(window.location.search);
  const _isReturn = _p.get("status") === "success" && _p.get("payment");
  const [screen,       setScreen]       = useState(_isReturn ? "app" : "landing");
  const [role,         setRole]         = useState(_isReturn ? "payer" : "commit");
  const [escrowData,   setEscrowData]   = useState(null);
  const [demoState,    setDemoState]    = useState(null);
  const [txEvents,     setTxEvents]     = useState([]);
  const [walletPubkey, setWalletPubkey] = useState("");

  /* Phantom wallet */
  useEffect(() => {
    const provider = getPhantomProvider();
    if (!provider?.isPhantom) return;
    const onConnect    = (pk) => setWalletPubkey(pk?.toBase58?.() || "");
    const onDisconnect = ()   => setWalletPubkey("");
    provider.on("connect",    onConnect);
    provider.on("disconnect", onDisconnect);
    provider.connect({ onlyIfTrusted: true }).catch(() => {});
    return () => { provider.off("connect", onConnect); provider.off("disconnect", onDisconnect); };
  }, []);

  const connectWallet = async () => {
    const provider = getPhantomProvider();
    if (!provider?.isPhantom) { window.open("https://phantom.app/", "_blank", "noopener,noreferrer"); return; }
    const res = await provider.connect();
    setWalletPubkey(res.publicKey.toBase58());
  };

  const disconnectWallet = async () => {
    const provider = getPhantomProvider();
    if (provider?.isPhantom) { await provider.disconnect(); setWalletPubkey(""); }
  };

  const eventCounterRef = useRef(0);
  const addEvent = (label, sub, status = "done") => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    const id = ++eventCounterRef.current;          // always unique, no Date.now() collision
    setTxEvents(prev => [...prev, { id, label, sub, status, ts }]);
  };

  const updateLastEvent = (status, sub) => {
    setTxEvents(prev => {
      const copy = [...prev];
      if (!copy.length) return copy;
      copy[copy.length - 1] = { ...copy[copy.length - 1], status, ...(sub ? { sub } : {}) };
      return copy;
    });
  };

  /* Landing */
  if (screen === "landing") {
    return (
      <LandingPage
        onEnter={() => { setRole("commit"); setScreen("app"); }}
        onEnterAs={(r) => { setRole(r || "commit"); setScreen("app"); }}
      />
    );
  }

  const fmt = (pk) => pk ? `${pk.slice(0,4)}…${pk.slice(-4)}` : null;
  const tabIdx = TABS.findIndex(t => t.id === role);

  return (
    <div className="app-root">
      <div className="bg-mesh" />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-brand" onClick={() => setScreen("landing")}>
          <img src="/logo1.png" alt="ZKPay Logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div>
            <div className="brand-title">ZKPay</div>
            <div className="brand-sub">Zero-Knowledge · Solana · Programmable Escrow</div>
          </div>
        </div>

        <div className="header-pills">
          {[
            { color: "#7c3aed", dot: "#a78bfa", label: "Solana Testnet" },
            { color: "#0891b2", dot: "#22d3ee", label: "Groth16 ZK" },
            { color: "#059669", dot: "#34d399", label: "Dodo Payments" },
          ].map(({ color, dot, label }) => (
            <span key={label} className="status-pill"
              style={{ borderColor: color + "30", color, background: `${color}08` }}>
              <span className="pill-dot" style={{ background: dot }} />
              {label}
            </span>
          ))}

          <button onClick={walletPubkey ? disconnectWallet : connectWallet}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: walletPubkey ? "rgba(5,150,105,0.07)" : "rgba(124,58,237,0.07)",
              border: `1px solid ${walletPubkey ? "rgba(5,150,105,0.25)" : "rgba(124,58,237,0.25)"}`,
              color: walletPubkey ? "#065f46" : "#6d28d9",
              borderRadius: 20, padding: "5px 13px",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
              cursor: "pointer", letterSpacing: "0.02em", transition: "all 0.2s",
              backdropFilter: "blur(8px)",
            }}>
            <IconWallet />
            {walletPubkey ? fmt(walletPubkey) : "Connect Phantom"}
          </button>

          <button onClick={async () => {
            try { const r = await getDemoState(); setDemoState(r.data); } catch { setDemoState({ _demo: true }); }
          }} style={{
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
            color: "#92400e", borderRadius: 20, padding: "5px 13px",
            fontFamily: "'Orbitron', monospace", fontSize: 9, fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.12em", transition: "all 0.2s",
          }}>DEMO</button>
        </div>
      </header>

      {/* ── Stats bar ───────────────────────────────────────────────── */}
      <div className="stats-bar">
        {STATS.map(({ label, value, cls }) => (
          <div key={label} className="stats-bar-item">
            <div className="stats-bar-label">{label}</div>
            <div className={`stats-bar-value ${cls}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <nav className="tab-nav">
        <div className="tab-track">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id}
              className={`tab-btn ${role === id ? "tab-active" : ""}`}
              onClick={() => setRole(id)}>
              <span className="tab-icon"><Icon /></span>
              <span>{label}</span>
            </button>
          ))}
          <div className="tab-indicator" style={{
            left: `${(tabIdx / TABS.length) * 100}%`,
            width: `${100 / TABS.length}%`,
          }} />
        </div>
        <button onClick={() => setScreen("landing")} style={{
          background: "none", border: "none", color: "var(--slate-400)",
          fontSize: 11, cursor: "pointer", padding: "0 20px",
          display: "flex", alignItems: "center", gap: 5,
          fontFamily: "'Exo 2', sans-serif", fontWeight: 500,
          transition: "color 0.2s",
        }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--slate-700)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--slate-400)"}>
          ← Home
        </button>
      </nav>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="app-main">
        <div className="content-fade" key={role}>
          {role === "commit" && <CommitmentGenerator />}
          {role === "payer" && (
            <PayerDashboard
              onEscrowCreated={(data) => setEscrowData(data)}
              demoState={demoState}
              connectedPayer={walletPubkey}
              addEvent={addEvent}
              updateLastEvent={updateLastEvent}
              txEvents={txEvents}
            />
          )}
          {role === "recipient" && (
            <RecipientDashboard
              escrowData={escrowData}
              demoState={demoState}
              addEvent={addEvent}
              updateLastEvent={updateLastEvent}
              txEvents={txEvents}
            />
          )}
          {role === "status" && <StatusChecker />}
        </div>
      </main>

      <footer className="app-footer">
        ZK B2B Payments · Circom · SnarkJS · Anchor · React · Dodo Payments — Hackathon 2026
      </footer>
    </div>
  );
}