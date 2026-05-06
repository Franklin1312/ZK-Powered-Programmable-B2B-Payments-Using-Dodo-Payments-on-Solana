const DoneIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 5l2.5 2.5L8 3" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 3l4 4M7 3L3 7" />
  </svg>
);

export default function TxTimeline({ events = [] }) {
  if (!events.length) return null;

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 16 }}>
        Live Transaction Flow
      </div>
      <div className="timeline">
        {events.map((ev, i) => {
          const cls = ev.status === "done" ? "done" : ev.status === "error" ? "error" : "pending";
          return (
            <div key={i} className="timeline-item">
              <div className={`timeline-dot ${cls}`}>
                {ev.status === "done"    ? <DoneIcon /> :
                 ev.status === "error"   ? <ErrorIcon /> :
                 ev.status === "pending" ? <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }} /> : null}
              </div>
              <div className={`timeline-body ${cls}`}>
                <div className="timeline-title">
                  {ev.title}
                  <span className="timeline-time">{ev.time}</span>
                </div>
                <div className="timeline-desc">{ev.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
