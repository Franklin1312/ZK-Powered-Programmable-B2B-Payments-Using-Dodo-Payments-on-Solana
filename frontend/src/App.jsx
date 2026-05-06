import { useEffect, useState } from "react";
import LandingPage         from "./pages/Landingpage";
import PayerDashboard      from "./pages/PayerDashboard";
import RecipientDashboard  from "./pages/RecipientDashboard";
import StatusChecker       from "./pages/StatusChecker";
import CommitmentGenerator from "./pages/CommitmentGenerator";
import { getDemoState }    from "./utils/api";
import { getPhantomProvider } from "./utils/wallet";
import "./App.css";

const LockIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5.5 7V4.5a2.5 2.5 0 015 0V7" />
    <circle cx="8" cy="10.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const StarIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 2l1.8 3.6L14 6.4l-3 2.9.7 4.1L8 11.3l-3.7 2.1.7-4.1-3-2.9 4.2-.8L8 2z" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 2v8M5 7l3 3 3-3M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6" />
    <path d="M5.5 8l2 2 3-3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 1.5L16 5.5V9.5C16 13.5 12.5 16.5 9 17C5.5 16.5 2 13.5 2 9.5V5.5L9 1.5Z"
      stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.15)" />
    <path d="M6 9.5l2.5 2.5L12 7.5" stroke="white" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TABS = [
  { id: "commit",    label: "Generate Commitment",  Icon: StarIcon },
  { id: "payer",     label: "Lock Payment",         Icon: LockIcon },
  { id: "recipient", label: "Claim Payment",        Icon: DownloadIcon },
  { id: "status",    label: "Verify Status",        Icon: CheckIcon },
];

export default function App() {
  const _p = new URLSearchParams(window.location.search);
  const _isReturn = _p.get("status") === "success" && _p.get("payment");

  const [screen,       setScreen]       = useState(_isReturn ? "app" : "landing");
  const [role,         setRole]         = useState("payer");
  const [demoState,    setDemoState]    = useState(null);
  const [walletPubkey, setWalletPubkey] = useState(null);
  const [escrowData,   setEscrowData]   = useState(null);
  const [txEvents,     setTxEvents]     = useState([]);

  useEffect(() => {
    getDemoState().then(r => setDemoState(r.data)).catch(() => {});
  }, []);

  const connectWallet = async () => {
    try {
      const provider = getPhantomProvider();
      if (!provider) { alert("Please install Phantom wallet"); return; }
      const resp = await provider.connect();
      setWalletPubkey(resp.publicKey.toBase58());
    } catch (e) { console.error(e); }
  };

  const addEvent = (title, desc, status = "pending") => {
    setTxEvents(prev => [...prev, {
      title, desc, status,
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
    }]);
  };

  const updateLastEvent = (status, desc) => {
    setTxEvents(prev => prev.map((e, i) =>
      i === prev.length - 1 ? { ...e, status, ...(desc ? { desc } : {}) } : e
    ));
  };

  const onEscrowCreated = (data) => {
    setEscrowData(data);
    setDemoState(prev => ({ ...prev, ...data }));
  };

  if (screen === "landing") {
    return (
      <LandingPage
        onEnter={() => setScreen("app")}
        onEnterAs={(r) => { setScreen("app"); setRole(r); }}
      />
    );
  }

  const fmt = (pk) => pk ? `${pk.slice(0,4)}...${pk.slice(-4)}` : null;

  return (
    <div className="app-root">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-inner">
          <a className="header-brand" onClick={() => setScreen("landing")}>
            <div className="brand-logo"><ShieldIcon /></div>
            <span className="brand-name">ZK<span>Pay</span></span>
          </a>

          <div className="header-pills">
            <span className="header-pill active">
              <span className="pill-dot" />Solana Testnet
            </span>
            <span className="header-pill">Groth16 ZK</span>
            <span className="header-pill active">
              <span className="pill-dot" />Dodo Payments
            </span>
          </div>

          <div className="header-right">
            {walletPubkey ? (
              <button className="wallet-btn connected">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <circle cx="5" cy="5" r="4" />
                </svg>
                {fmt(walletPubkey)}
              </button>
            ) : (
              <button className="wallet-btn" onClick={connectWallet}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                  stroke="currentColor" strokeWidth="1.5">
                  <rect x="1.5" y="4" width="10" height="7.5" rx="1.5" />
                  <path d="M8.5 7.5h1.5" strokeLinecap="round" />
                  <path d="M3.5 4V3a2 2 0 014 0v1" />
                </svg>
                Connect Wallet
              </button>
            )}
            <span className="demo-pill">DEMO</span>
          </div>
        </div>
      </header>

      {/* ── Spec bar ───────────────────────────────────────────────────── */}
      <div className="spec-bar">
        <div className="spec-bar-inner">
          {[
            { label: "Network",     val: "Solana Testnet",   cls: "green" },
            { label: "ZK System",   val: "Groth16 · bn128",  cls: "" },
            { label: "Circuit",     val: "threshold.circom", cls: "violet" },
            { label: "Hash Fn",     val: "Poseidon",         cls: "" },
            { label: "Proof Size",  val: "~200 bytes",       cls: "" },
            { label: "Verify Time", val: "< 1s on-chain",    cls: "gold" },
          ].map(({ label, val, cls }) => (
            <div key={label} className="spec-item">
              <span className="spec-label">{label}</span>
              <span className={`spec-value ${cls}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <nav className="tab-bar">
        <div className="tab-bar-inner">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`tab-btn ${role === id ? "active" : ""}`}
              onClick={() => setRole(id)}
            >
              <span className="tab-icon"><Icon /></span>
              <span className="tab-label">{label}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setScreen("landing")}>
              ← Home
            </button>
          </div>
        </div>
      </nav>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <main className="main-content">
        <div className="content-fade" key={role}>
          {role === "payer" && (
            <PayerDashboard
              onEscrowCreated={onEscrowCreated}
              demoState={demoState}
              connectedPayer={walletPubkey}
              addEvent={addEvent}
              updateLastEvent={updateLastEvent}
              txEvents={txEvents}
            />
          )}
          {role === "commit"    && <CommitmentGenerator />}
          {role === "recipient" && (
            <RecipientDashboard
              demoState={escrowData || demoState}
              connectedRecipient={walletPubkey}
              addEvent={addEvent}
              updateLastEvent={updateLastEvent}
              txEvents={txEvents}
            />
          )}
          {role === "status" && <StatusChecker />}
        </div>
      </main>
    </div>
  );
}
