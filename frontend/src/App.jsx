import { useState } from "react";
import LandingPage        from "./pages/Landingpage";
import PayerDashboard     from "./pages/PayerDashboard";
import RecipientDashboard from "./pages/RecipientDashboard";
import StatusChecker      from "./pages/StatusChecker";
import { getDemoState }   from "./utils/api";
import "./App.css";

const TABS = [
  { id: "payer",     label: "Lock Payment",  icon: "⬡" },
  { id: "recipient", label: "Claim Payment", icon: "◈" },
  { id: "status",    label: "Verify Status", icon: "◎" },
];

export default function App() {
  const [screen,     setScreen]     = useState("landing");
  const [role,       setRole]       = useState("payer");
  const [escrowData, setEscrowData] = useState(null);
  const [demoState,  setDemoState]  = useState(null);
  const [txEvents,   setTxEvents]   = useState([]);

  const addEvent = (label, sub, status = "done") => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setTxEvents(prev => [...prev, { id: Date.now(), label, sub, status, ts }]);
  };

  const updateLastEvent = (status, sub) => {
    setTxEvents(prev => {
      const copy = [...prev];
      if (!copy.length) return copy;
      copy[copy.length - 1] = { ...copy[copy.length - 1], status, ...(sub ? { sub } : {}) };
      return copy;
    });
  };

  if (screen === "landing") {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
        <LandingPage onEnter={(r) => { setRole(r); setScreen("app"); }} />
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="bg-mesh" />

      <header className="app-header">
        <div className="header-brand">
          <div className="brand-mark" style={{ cursor: "pointer" }}
            onClick={() => setScreen("landing")}>ZK</div>
          <div>
            <h1 className="brand-title">B2B Payments</h1>
            <p className="brand-sub">Zero-Knowledge · Solana · Programmable Escrow</p>
          </div>
        </div>
        <div className="header-pills">
          <StatusPill color="#6366f1" dot="#818cf8" label="Solana Testnet" />
          <StatusPill color="#0891b2" dot="#22d3ee" label="Groth16 ZK"   />
          <StatusPill color="#059669" dot="#34d399" label="Dodo Payments" />
          <button onClick={async () => {
              try { const r = await getDemoState(); setDemoState(r.data); }
              catch { setDemoState({ _demo: true }); }
            }}
            style={{ marginLeft: 8, background: "#fffbeb", border: "1px solid #fde68a",
              color: "#92400e", borderRadius: 20, padding: "4px 12px", fontSize: 11,
              fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.5px" }}>
            DEMO
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div style={{ position:"relative", zIndex:9, background:"#fff",
        borderBottom:"1px solid #f1f5f9", display:"flex", overflowX:"auto", padding:"0 40px" }}>
        {[
          ["Network",     "Solana Testnet"],
          ["ZK System",   "Groth16 · bn128"],
          ["Circuit",     "threshold.circom"],
          ["Hash fn",     "Poseidon"],
          ["Proof size",  "~200 bytes"],
          ["Verify time", "< 1s on-chain"],
        ].map(([label, value]) => (
          <div key={label} style={{ display:"flex", flexDirection:"column",
            padding:"8px 0", marginRight:32, flexShrink:0 }}>
            <span style={{ fontSize:9, fontWeight:600, color:"#94a3b8",
              textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</span>
            <span style={{ fontSize:12, fontWeight:500, color:"#334155",
              fontFamily:"'DM Mono', monospace", marginTop:2 }}>{value}</span>
          </div>
        ))}
      </div>

      <nav className="tab-nav" style={{ display:"flex", alignItems:"stretch" }}>
        <div className="tab-track">
          {TABS.map(tab => (
            <button key={tab.id}
              className={`tab-btn ${role === tab.id ? "tab-active" : ""}`}
              onClick={() => setRole(tab.id)}>
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          <div className="tab-indicator"
            style={{ transform:`translateX(${TABS.findIndex(t=>t.id===role)*100}%)` }} />
        </div>
        <button onClick={() => setScreen("landing")}
          style={{ marginLeft:"auto", background:"none", border:"none",
            color:"var(--gray-400)", fontSize:12, cursor:"pointer",
            padding:"0 20px", display:"flex", alignItems:"center", gap:4 }}>
          ← Home
        </button>
      </nav>

      <main className="app-main">
        <div className="content-fade" key={role}>
          {role === "payer" && (
            <PayerDashboard
              onEscrowCreated={(data) => { setEscrowData(data); setDemoState(data); }}
              demoState={demoState}
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

function StatusPill({ color, dot, label }) {
  return (
    <span className="status-pill" style={{ borderColor: color + "40", color }}>
      <span className="pill-dot" style={{ background: dot }} />
      {label}
    </span>
  );
}