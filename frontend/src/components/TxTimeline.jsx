const DoneIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 5l2.5 2.5L8 3"/>
  </svg>
);
const ErrorIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 3l4 4M7 3L3 7"/>
  </svg>
);

export default function TxTimeline({ events = [] }) {
  if (!events.length) return null;

  const cls = (s) => s === "done" ? "done" : s === "error" ? "error" : "pending";

  return (
    <div className="tx-timeline">
      <div className="tx-timeline-header">Live Transaction Flow</div>
      {events.map((ev, i) => {
        const c = cls(ev.status);
        return (
          <div key={ev.id || i} className="tx-item">
            <div className={`tx-dot ${c}`}>
              {c === "done"    ? <DoneIcon /> :
               c === "error"   ? <ErrorIcon /> :
               <span className="spinner" style={{ width:8,height:8,borderWidth:1.5,borderTopColor:"var(--violet-500)",borderColor:"rgba(124,58,237,0.2)" }} />}
            </div>
            <div className={`tx-body ${c}`}>
              <div className="tx-title">
                <span>{ev.label}</span>
                <span className="tx-time">{ev.ts}</span>
              </div>
              {ev.sub && <div className="tx-sub">{ev.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}