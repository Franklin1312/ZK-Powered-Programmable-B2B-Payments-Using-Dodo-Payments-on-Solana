import { useEffect, useRef } from "react";

// Animated counter hook
function useCounter(target, duration = 1800) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = null;
    const isNum = !isNaN(parseFloat(target));
    const num = parseFloat(target);
    const suffix = isNum ? target.replace(String(num), "") : "";
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      if (isNum) {
        const val = num < 10 ? (ease * num).toFixed(0) : Math.floor(ease * num);
        el.textContent = val + suffix;
      }
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { requestAnimationFrame(step); obs.disconnect(); }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return ref;
}

// Reveal-on-scroll hook
function useReveal(delay = 0) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = `opacity 0.7s ${delay}ms ease, transform 0.7s ${delay}ms ease`;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
        obs.disconnect();
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return ref;
}

// Floating particles canvas
function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let raf;

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.5 + 0.1,
      c: Math.random() > 0.6 ? "#F59E0B" : Math.random() > 0.5 ? "#8B5CF6" : "#06B6D4",
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = p.a;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      });
      ctx.globalAlpha = 1;

      // Draw faint connecting lines
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach(q => {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(124,58,237,${0.06 * (1 - d / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 0,
    }} />
  );
}

export default function LandingPage({ onEnter, onEnterAs }) {
  const c1 = useCounter("<30s");
  const c2 = useCounter("Groth16");
  const c3 = useCounter("0");
  const c4 = useCounter("100%");

  const flowRef = useReveal(0);
  const statsRef = useReveal(100);

  return (
    <div className="landing-root">
      {/* Animated background layers */}
      <div className="landing-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <div className="landing-grid" />
      <Particles />

      <div className="landing-inner">
        {/* Nav */}
        <nav className="landing-nav">
          <div className="landing-brand">
            <div className="landing-brand-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1.5L16 5.5V9.5C16 13.5 12.5 16.5 9 17C5.5 16.5 2 13.5 2 9.5V5.5L9 1.5Z"
                  stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.1)" />
                <path d="M6 9.5l2.5 2.5L12 7.5" stroke="#F59E0B" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="landing-brand-name">ZK<span>Pay</span></span>
          </div>
          <div className="landing-live-pill">
            <span className="live-dot" />
            Live on Solana Testnet
          </div>
        </nav>

        {/* Hero */}
        <section className="landing-hero">
          <div className="hero-eyebrow">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 1L7.5 4.5H11L8 6.5 9 10 6 8 3 10 4 6.5 1 4.5h3.5L6 1z" />
            </svg>
            Programmable B2B Escrow · Zero-Knowledge Proofs
          </div>

          <h1 className="hero-title">
            <span className="line-1">Programmable B2B Payments</span>
            <span className="line-2">with Zero-Knowledge Proofs</span>
          </h1>

          <p className="hero-sub">
            Lock funds in escrow. Release automatically when conditions are
            proven — without revealing any sensitive business data on-chain.
          </p>

          <div className="hero-chips">
            {["Solana · Anchor", "Circom · Groth16", "SnarkJS", "Dodo Payments", "UptimeRobot Oracle"].map(c => (
              <div key={c} className="hero-chip">
                <span className="hero-chip-dot" />{c}
              </div>
            ))}
          </div>

          <div className="hero-cta">
            <button className="btn-hero-primary" onClick={onEnter}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2l6 3.5v4L8 13l-6-3.5v-4L8 2z" />
              </svg>
              Launch App
            </button>
            <button className="btn-hero-ghost" onClick={() => onEnterAs && onEnterAs("commit")}>
              Generate Commitment
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7h8M8 4l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="hero-stats" ref={statsRef}>
            {[
              { ref: c1, label: "Proof generation", val: "<30s" },
              { ref: c2, label: "ZK system", val: "Groth16" },
              { ref: c3, label: "Data revealed on-chain", val: "0" },
              { ref: c4, label: "Trustless", val: "100%" },
            ].map(({ ref: r, label, val }) => (
              <div key={label} className="hero-stat">
                <span className="hero-stat-num" ref={r}>{val}</span>
                <span className="hero-stat-lbl">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Flow section */}
        <section className="landing-flow" ref={flowRef}>
          <p className="landing-flow-title">How it works</p>
          <div className="flow-steps">
            {[
              { n: "01", label: "Pay via Dodo", desc: "Fiat → USDC conversion" },
              { n: "02", label: "Lock Escrow", desc: "ZK commitment on Solana" },
              { n: "03", label: "Prove SLA", desc: "Groth16 proof generation" },
              { n: "04", label: "Auto Release", desc: "On-chain verification" },
            ].map(({ n, label, desc }) => (
              <div key={n} className="flow-step">
                <div className="flow-num">{n}</div>
                <div className="flow-label">{label}</div>
                <div className="flow-desc">{desc}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}