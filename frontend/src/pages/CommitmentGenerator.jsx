import { useState } from "react";
import { fetchUptimeRobot, fetchGitHub, generateCommitment } from "../utils/api";

/* ── SVG Icons ─────────────────────────────────────────────────────────── */
const IconMonitor = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="2" y="3" width="14" height="10" rx="2"/>
    <path d="M6 16h6M9 13v3" strokeLinecap="round"/>
    <circle cx="9" cy="8" r="2"/>
    <path d="M5.5 5.5a5 5 0 017 0M4 4a7.5 7.5 0 0110 0" strokeLinecap="round"/>
  </svg>
);

const IconGitMerge = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="5" cy="5" r="2"/><circle cx="5" cy="13" r="2"/><circle cx="13" cy="5" r="2"/>
    <path d="M5 7v4M7 5h2a2 2 0 012 2v3a2 2 0 002 2h0" strokeLinecap="round"/>
  </svg>
);

const IconIssue = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="9" cy="9" r="7"/>
    <path d="M9 5.5v4M9 11.5v1" strokeLinecap="round"/>
  </svg>
);

const IconCommit = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="9" cy="9" r="3"/>
    <path d="M2 9h4M12 9h4" strokeLinecap="round"/>
  </svg>
);

const IconCopy  = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="4" y="4" width="6" height="6" rx="1"/>
    <path d="M8 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1h1" strokeLinecap="round"/>
  </svg>
);

const IconDownload = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M6 2v5M4 5.5L6 7.5l2-2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 9h8" strokeLinecap="round"/>
  </svg>
);

/* ── Methods config ─────────────────────────────────────────────────────── */
const METHODS = [
  { id:"uptimerobot",     Icon:IconMonitor,  label:"UptimeRobot",             color:"#7c3aed", pale:"#f5f3ff", desc:"Prove service uptime from real 30-day monitoring data", badge:"Best for: Uptime SLAs" },
  { id:"github_prs",      Icon:IconGitMerge, label:"GitHub — PR Delivery",    color:"#0f172a", pale:"#f8fafc", desc:"Prove % of opened PRs merged in last 30 days",           badge:"Best for: Software delivery" },
  { id:"github_issues",   Icon:IconIssue,    label:"GitHub — Issue Resolution",color:"#059669", pale:"#ecfdf5", desc:"Prove % of issues closed in last 30 days",             badge:"Best for: Support SLAs" },
  { id:"github_commits",  Icon:IconCommit,   label:"GitHub — Commit Activity", color:"#d97706", pale:"#fffbeb", desc:"Prove commit count against a monthly target",          badge:"Best for: Dev activity" },
];

/* ── Commitment output ──────────────────────────────────────────────────── */
function CommitmentOutput({ data, onReset }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(data.commitment);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([JSON.stringify({
      privateValue: data.privateValue, salt: data.salt,
      commitment: data.commitment, method: data.method, label: data.label,
      generatedAt: new Date().toISOString(),
      warning: "KEEP PRIVATE — share only the commitment hash",
    }, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "sla-keys.json" });
    a.click();
  };

  return (
    <div style={{ animation: "fade-up 0.3s ease both" }}>
      <div className="alert alert-success" style={{ marginBottom: 18, display:"flex", alignItems:"center", gap:10 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6.5"/><path d="M5 8l2.5 2.5L11 5.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <p className="alert-title">Commitment generated from real data</p>
          <p style={{ fontSize:11, margin:"2px 0 0", fontFamily:"var(--font-mono)" }}>{data.label}</p>
        </div>
      </div>

      {/* Public hash */}
      <div className="field" style={{ marginBottom:16 }}>
        <label className="field-label" style={{ display:"flex", alignItems:"center", gap:7 }}>
          Commitment hash
          <span style={{ background:"var(--green-50)", color:"var(--green-600)", border:"1px solid rgba(5,150,105,0.2)", borderRadius:4, padding:"1px 7px", fontSize:8, fontWeight:700, letterSpacing:"0.08em" }}>
            SHARE WITH PAYER
          </span>
        </label>
        <div style={{ position:"relative" }}>
          <input className="field-input field-mono" readOnly value={data.commitment}
            style={{ paddingRight:80, background:"rgba(245,243,255,0.6)", fontSize:11 }} />
          <button onClick={copy} style={{
            position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
            padding:"4px 12px", borderRadius:6, fontSize:10, cursor:"pointer",
            border:"none", background: copied ? "var(--green-600)" : "var(--violet-600)",
            color:"#fff", fontFamily:"var(--font-display)", fontWeight:700,
            letterSpacing:"0.06em", transition:"background 0.2s", display:"flex", alignItems:"center", gap:5,
          }}>
            <IconCopy />{copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="field-hint">Poseidon hash — reveals nothing about your actual score.</p>
      </div>

      {/* Private keys */}
      <div style={{ background:"rgba(254,243,199,0.7)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"var(--radius-md)", padding:"14px 16px", marginBottom:18, backdropFilter:"blur(8px)" }}>
        <p style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:10, color:"#92400e", letterSpacing:"0.08em", marginBottom:12 }}>
          KEEP PRIVATE — needed to claim payment later
        </p>
        <div className="grid-2">
          <div>
            <p style={{ fontSize:9, color:"#92400e", margin:"0 0 3px", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" }}>Private value</p>
            <p style={{ fontFamily:"var(--font-mono)", fontSize:15, fontWeight:700, color:"#78350f", margin:0 }}>
              {data.privateValue}
              <span style={{ fontSize:11, fontWeight:400, marginLeft:6, color:"#92400e" }}>= {(data.privateValue/100).toFixed(2)}%</span>
            </p>
          </div>
          <div>
            <p style={{ fontSize:9, color:"#92400e", margin:"0 0 3px", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" }}>Salt</p>
            <p style={{ fontFamily:"var(--font-mono)", fontSize:15, fontWeight:700, color:"#78350f", margin:0 }}>{data.salt}</p>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <button className="btn btn-success" onClick={download} style={{ flex:1, gap:6 }}>
          <IconDownload />Download sla-keys.json
        </button>
        <button className="btn btn-primary" onClick={copy} style={{ flex:1, gap:6 }}>
          <IconCopy />{copied ? "Copied!" : "Copy commitment"}
        </button>
      </div>
      <button onClick={onReset} style={{ marginTop:12, width:"100%", background:"none", border:"none", color:"var(--slate-400)", fontSize:11, cursor:"pointer", padding:"6px 0" }}>
        Start over with a different method
      </button>
    </div>
  );
}

/* ── UptimeRobot panel ─────────────────────────────────────────────────── */
function UptimeRobotPanel({ onCommitment }) {
  const [apiKey,   setApiKey]   = useState("");
  const [monitors, setMonitors] = useState([]);
  const [step,     setStep]     = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const fetch = async () => {
    if (!apiKey.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetchUptimeRobot(apiKey.trim());
      setMonitors(res.data.monitors || []); setStep(1);
    } catch (e) { setError(e.response?.data?.error || "Failed — check your API key."); }
    setLoading(false);
  };

  const pick = async (m) => {
    setSelected(m); setLoading(true); setError(null);
    try {
      const res = await generateCommitment(m.privateValue);
      onCommitment({ ...res.data, method:"UptimeRobot", label:`${m.name} — ${m.uptimePct}% uptime (30-day)` });
    } catch (e) { setError(e.response?.data?.error || "Commitment generation failed."); }
    setLoading(false);
  };

  const statusDot = (s) => s === 2 ? "#10b981" : s === 9 ? "#ef4444" : "#94a3b8";

  return (
    <>
      {step === 0 && (
        <>
          <div className="field">
            <label className="field-label">UptimeRobot API Key</label>
            <input className="field-input field-mono" type="password" value={apiKey}
              onChange={e => setApiKey(e.target.value)} onKeyDown={e => e.key === "Enter" && fetch()}
              placeholder="ur1234567-xxxxxxxxxxxxxxxxxxxxxxxx" />
            <p className="field-hint">
              Find at <a href="https://dashboard.uptimerobot.com/account" target="_blank" rel="noreferrer"
                style={{ color:"var(--violet-600)", textDecoration:"underline", textUnderlineOffset:2 }}>
                UptimeRobot → My Settings → API Settings
              </a>
            </p>
          </div>
          <button className="btn btn-primary" onClick={fetch} disabled={loading || !apiKey.trim()}>
            {loading ? <><span className="spinner" style={{ borderTopColor:"#fff",borderColor:"rgba(255,255,255,0.3)" }} />Fetching…</> : "Fetch monitors →"}
          </button>
        </>
      )}
      {step === 1 && (
        <>
          <p style={{ fontSize:12, color:"var(--slate-500)", marginBottom:12 }}>Select the monitor to prove:</p>
          {monitors.map(m => (
            <div key={m.id} onClick={() => !loading && pick(m)} className={`monitor-card ${selected?.id===m.id?"selected":""}`}>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:"var(--slate-900)", marginBottom:2, display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:statusDot(m.status), display:"inline-block", flexShrink:0 }} />
                  {m.name}
                </div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--slate-400)" }}>{m.url}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:20, color:"var(--green-600)", lineHeight:1 }}>{m.uptimePct}%</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--slate-400)", marginTop:2 }}>30-day</div>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginTop:4 }} onClick={() => setStep(0)}>← Change key</button>
        </>
      )}
      {error && <div className="alert alert-error" style={{ marginTop:12 }}><p className="alert-title">Error</p><p style={{ fontSize:12,marginTop:3 }}>{error}</p></div>}
    </>
  );
}

/* ── GitHub panel ──────────────────────────────────────────────────────── */
function GitHubPanel({ metric, onCommitment }) {
  const [form, setForm] = useState({ token:"", owner:"", repo:"", days:30, targetCommits:50 });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const h = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const run = async () => {
    if (!form.token || !form.owner || !form.repo) return;
    setLoading(true); setError(null);
    try {
      const r  = await fetchGitHub({ ...form, metric, days:Number(form.days), targetCommits:Number(form.targetCommits) });
      const c  = await generateCommitment(r.data.privateValue);
      const labels = { merged_prs:"GitHub PR Delivery", closed_issues:"GitHub Issue Resolution", commit_count:"GitHub Commit Activity" };
      onCommitment({ ...c.data, method:labels[metric]||"GitHub", label:`${form.owner}/${form.repo} — ${r.data.label}` });
    } catch (e) { setError(e.response?.data?.error || e.message); }
    setLoading(false);
  };

  return (
    <>
      <div className="grid-2">
        <div className="field">
          <label className="field-label">GitHub Token</label>
          <input className="field-input field-mono" type="password" value={form.token}
            onChange={h("token")} placeholder="ghp_xxxxxxxxxxxx" />
          <p className="field-hint"><a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" style={{ color:"var(--violet-600)" }}>github.com/settings/tokens</a> — repo read access</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <div className="field" style={{ flex:1 }}>
            <label className="field-label">Owner</label>
            <input className="field-input" value={form.owner} onChange={h("owner")} placeholder="octocat" />
          </div>
          <div className="field" style={{ flex:1 }}>
            <label className="field-label">Repo</label>
            <input className="field-input" value={form.repo} onChange={h("repo")} placeholder="my-app" />
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="field-label">Days to look back</label>
          <input className="field-input" type="number" value={form.days} onChange={h("days")} min={1} max={90} />
        </div>
        {metric === "commit_count" && (
          <div className="field">
            <label className="field-label">Target commits (100%)</label>
            <input className="field-input" type="number" value={form.targetCommits} onChange={h("targetCommits")} min={1} />
            <p className="field-hint">score = actual / target × 100</p>
          </div>
        )}
      </div>
      <button className="btn btn-primary" onClick={run} disabled={loading || !form.token || !form.owner || !form.repo}>
        {loading ? <><span className="spinner" style={{ borderTopColor:"#fff",borderColor:"rgba(255,255,255,0.3)" }} />Fetching from GitHub…</> : "Fetch & generate commitment →"}
      </button>
      {error && <div className="alert alert-error" style={{ marginTop:12 }}><p className="alert-title">Error</p><p style={{ fontSize:12,marginTop:3 }}>{error}</p></div>}
    </>
  );
}

const METRIC_MAP = { github_prs:"merged_prs", github_issues:"closed_issues", github_commits:"commit_count" };

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function CommitmentGenerator() {
  const [method,     setMethod]     = useState(null);
  const [commitment, setCommitment] = useState(null);

  const reset = () => { setMethod(null); setCommitment(null); };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:24, alignItems:"start" }}>

      {/* Main card */}
      <div className="card card-violet">
        <div className="card-header">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h2 className="card-title">Generate SLA Commitment</h2>
              <p className="card-sub">Fetch your real performance data and generate a ZK commitment hash. Share only the hash — your actual data stays private.</p>
            </div>
            <span className="tag tag-violet">Recipient</span>
          </div>
        </div>

        {commitment ? (
          <CommitmentOutput data={commitment} onReset={reset} />
        ) : method ? (
          <>
            {/* Back header */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22, padding:"10px 14px", background:"rgba(255,255,255,0.6)", borderRadius:"var(--radius-md)", border:"1px solid rgba(148,163,184,0.18)", backdropFilter:"blur(8px)" }}>
              <button onClick={() => setMethod(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--slate-400)", fontSize:12, padding:0, display:"flex", alignItems:"center", gap:5, transition:"color 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.color="var(--slate-700)"}
                onMouseLeave={e=>e.currentTarget.style.color="var(--slate-400)"}>
                ← Back
              </button>
              <span style={{ width:1, height:16, background:"rgba(148,163,184,0.3)" }} />
              <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:11, color:"var(--slate-900)", letterSpacing:"0.05em" }}>
                {METHODS.find(m=>m.id===method)?.label}
              </span>
            </div>
            {method === "uptimerobot" && <UptimeRobotPanel onCommitment={setCommitment} />}
            {["github_prs","github_issues","github_commits"].includes(method) && (
              <GitHubPanel metric={METRIC_MAP[method]} onCommitment={setCommitment} />
            )}
          </>
        ) : (
          <>
            <div className="section-label">Choose verification method</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {METHODS.map(({ id, Icon, label, color, pale, desc, badge }) => (
                <button key={id} onClick={() => setMethod(id)} className="method-card"
                  style={{ '--method-color': color }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color + "60"; e.currentTarget.style.background = pale; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.75)"; }}
                >
                  <div className="method-card-icon" style={{ background: pale, border:`1px solid ${color}25`, color }}>
                    <Icon />
                  </div>
                  <div className="method-card-name">{label}</div>
                  <div className="method-card-desc">{desc}</div>
                  <span className="method-card-badge" style={{ color, background:pale, borderColor:`${color}30` }}>{badge}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right sidebar */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

        {/* How it works */}
        <div className="card">
          <p style={{ fontFamily:"var(--font-display)", fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"var(--slate-500)", marginBottom:14, textTransform:"uppercase" }}>
            How this works
          </p>
          {[
            ["Choose a method",    "Connect UptimeRobot or GitHub"],
            ["Fetch real data",    "We pull your actual performance stats"],
            ["Get commitment",     "Poseidon(value, salt) — binding"],
            ["Share with payer",   "They lock funds with this hash"],
            ["Claim payment",      "Prove value > threshold on-chain"],
          ].map(([t,d],i) => (
            <div key={t} style={{ display:"flex", gap:10, marginBottom:10, paddingBottom:10, borderBottom:"1px solid rgba(148,163,184,0.12)" }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:"var(--violet-600)", color:"#fff", fontFamily:"var(--font-display)", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</div>
              <div>
                <p style={{ fontWeight:700, fontSize:11, margin:"0 0 1px", color:"var(--slate-800)" }}>{t}</p>
                <p style={{ fontSize:10, color:"var(--slate-400)", margin:0 }}>{d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy */}
        <div className="card" style={{ background:"rgba(236,253,245,0.7)", border:"1px solid rgba(5,150,105,0.2)" }}>
          <p style={{ fontFamily:"var(--font-display)", fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"var(--green-700)", marginBottom:10, textTransform:"uppercase" }}>
            Privacy guarantees
          </p>
          {[
            ["Your exact score",         true],
            ["API key / GitHub token",   true],
            ["Salt value",               true],
            ["Proof: value > threshold", false],
            ["Commitment hash",          false],
          ].map(([label, hidden]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid rgba(5,150,105,0.1)" }}>
              <span style={{ fontSize:11, color:"var(--green-700)" }}>{label}</span>
              <span className={`tag ${hidden ? "tag-amber" : "tag-green"}`} style={{ fontSize:9 }}>
                {hidden ? "Hidden" : "Shared ✓"}
              </span>
            </div>
          ))}
        </div>

        {/* Method table */}
        <div className="card">
          <p style={{ fontFamily:"var(--font-display)", fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"var(--slate-500)", marginBottom:10, textTransform:"uppercase" }}>
            Method comparison
          </p>
          {[["UptimeRobot","Uptime SLAs","3rd party"],["GitHub PRs","Dev delivery","GitHub"],["GitHub Issues","Support SLAs","GitHub"],["GitHub Commits","Dev activity","GitHub"]].map(([n,u,t]) => (
            <div key={n} style={{ display:"grid", gridTemplateColumns:"90px 1fr auto", padding:"6px 0", borderBottom:"1px solid rgba(148,163,184,0.1)", gap:8, alignItems:"center" }}>
              <span style={{ fontFamily:"var(--font-display)", fontSize:9, fontWeight:700, color:"var(--slate-800)", letterSpacing:"0.04em" }}>{n}</span>
              <span style={{ fontSize:10, color:"var(--slate-500)" }}>{u}</span>
              <span style={{ fontSize:9, color:"var(--green-600)", fontFamily:"var(--font-mono)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}