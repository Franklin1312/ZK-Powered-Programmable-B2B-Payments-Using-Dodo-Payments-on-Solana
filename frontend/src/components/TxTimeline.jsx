import { useEffect, useState } from "react";

// Pass `events` array from parent — each event added as flow progresses
// events = [{ id, label, sub, status: 'pending'|'done'|'error', ts }]

export default function TxTimeline({ events = [] }) {
  if (events.length === 0) return null;

  return (
    <div style={s.root}>
      <p style={s.title}>Live transaction flow</p>
      <div style={s.track}>
        {events.map((ev, i) => (
          <TimelineRow key={ev.id} ev={ev} isLast={i === events.length - 1} />
        ))}
      </div>
    </div>
  );
}

function TimelineRow({ ev, isLast }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 30); }, []);

  const colors = {
    pending: { dot: "#fbbf24", line: "#fde68a", text: "#92400e", bg: "#fffbeb", border: "#fde68a" },
    done:    { dot: "#34d399", line: "#a7f3d0", text: "#065f46", bg: "#ecfdf5", border: "#a7f3d0" },
    error:   { dot: "#fb7185", line: "#fecdd3", text: "#9f1239", bg: "#fff1f2", border: "#fecdd3" },
  };
  const c = colors[ev.status] || colors.pending;

  return (
    <div style={{
      display: "flex", gap: 0,
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateX(-8px)",
      transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
    }}>
      {/* Left: dot + line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 14 }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: c.dot, flexShrink: 0, marginTop: 6,
          boxShadow: ev.status === "pending" ? `0 0 0 4px ${c.dot}30` : "none",
          animation: ev.status === "pending" ? "pulse-dot 1.5s ease-in-out infinite" : "none",
        }} />
        {!isLast && <div style={{ width: 1, flex: 1, background: c.line, minHeight: 16, marginTop: 4 }} />}
      </div>

      {/* Right: content */}
      <div style={{
        flex: 1, background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 10, padding: "10px 14px", marginBottom: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{ev.label}</span>
          <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
            {ev.ts}
          </span>
        </div>
        {ev.sub && <p style={{ fontSize: 11, color: "#64748b", margin: "3px 0 0",
          fontFamily: "'DM Mono', monospace", wordBreak: "break-all" }}>{ev.sub}</p>}
        {ev.status === "pending" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div style={{ width: 10, height: 10, border: "2px solid #fbbf24",
              borderTopColor: "transparent", borderRadius: "50%",
              animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 10, color: "#b45309" }}>processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  root:  { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
           padding: "20px 20px 10px", marginTop: 20 },
  title: { fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.5px",
           textTransform: "uppercase", marginBottom: 16 },
  track: { },
};