import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

const FEATURES = [
  { icon: 'fa-shield-halved', label: 'Auto Moderation', desc: 'AI-powered anti-spam & raid filters' },
  { icon: 'fa-chart-area',    label: 'Live Analytics',  desc: 'Real-time statistics' },
  { icon: 'fa-gavel',         label: 'Case Manager',    desc: 'Complete punishment history' },
  { icon: 'fa-terminal',      label: 'Command Center',  desc: 'Interactive command catalog' },
  { icon: 'fa-users',         label: 'Members',         desc: 'Profiles & repeat offenders' },
  { icon: 'fa-bell',          label: 'Notifications',   desc: 'Feed d\'activité en direct' },
];

const TICKER = [
  '🔨 Ban executed sur user#4821',
  '⚠️ Warning sent à user#2034',
  '🛡️ AutoMod rule triggered',
  '📊 Analytics updated',
  '🔇 Mute applied 30min',
  '✅ Case #1847 résolu',
  '🚨 Raid detected et bloqué',
  '👋 Kick executed sur user#9912',
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [tickerIdx, setTickerIdx] = useState(0);
  const [tickerVisible, setTickerVisible] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const canvasRef = useRef(null);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      const payload = parseJwt(token);
      if (!payload || payload.exp * 1000 < Date.now()) {
        setStatus('error');
        setErrorMsg('Token invalide ou expiré. Réessaie.');
        return;
      }
      setStatus('success');
      localStorage.setItem('zenith_token', token);
      localStorage.removeItem('zenith_guild_id');
      setTimeout(() => navigate('/dashboard'), 1400);
    } else if (error) {
      setStatus('error');
      setErrorMsg(decodeURIComponent(error).replace(/_/g, ' '));
    }
  }, [location, navigate]);

  // Ticker animation
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerVisible(false);
      setTimeout(() => {
        setTickerIdx(i => (i + 1) % TICKER.length);
        setTickerVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Mouse parallax on card
  useEffect(() => {
    const onMove = e => {
      setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(88,101,242,${p.alpha})`;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  const tiltX = mousePos.y * 6;
  const tiltY = -mousePos.x * 6;

  return (
    <div className="login-v2-root">
      <canvas ref={canvasRef} className="login-v2-canvas" />

      {/* Ambient orbs */}
      <div className="login-v2-orb login-v2-orb--a" />
      <div className="login-v2-orb login-v2-orb--b" />
      <div className="login-v2-orb login-v2-orb--c" />

      <div className="login-v2-layout">

        {/* LEFT — branding & features */}
        <div className="login-v2-left">
          <div className="login-v2-brand">
            <div className="login-v2-logo">Z</div>
            <span className="login-v2-brand-name">zyntra</span>
          </div>

          <div className="login-v2-headline">
            <h1>Intelligent Moderation<br /><span className="login-v2-accent">for Discord.</span></h1>
            <p>The all-in-one platform to protect your community — AI, analytics, cases, and more.</p>
          </div>

          <div className="login-v2-features">
            {FEATURES.map((f, i) => (
              <div key={f.label} className="login-v2-feature" style={{ '--fi': i }}>
                <div className="login-v2-feature-icon">
                  <i className={`fa-solid ${f.icon}`} />
                </div>
                <div>
                  <div className="login-v2-feature-label">{f.label}</div>
                  <div className="login-v2-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Live ticker */}
          <div className="login-v2-ticker">
            <span className="login-v2-ticker-dot" />
            <span className={`login-v2-ticker-text ${tickerVisible ? 'visible' : ''}`}>
              {TICKER[tickerIdx]}
            </span>
          </div>
        </div>

        {/* RIGHT — login card */}
        <div className="login-v2-right">
          <div
            ref={cardRef}
            className="login-v2-card glass-panel"
            style={{ transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)` }}
          >
            {/* Card glow ring */}
            <div className="login-v2-card-glow" />

            <div className="login-v2-card-header">
              <div className="login-v2-card-logo">
                <span>Z</span>
              </div>
              <h2>Login</h2>
              <p>Continue with your Discord account pour accéder au dashboard.</p>
            </div>

            {/* Status states */}
            {status === 'success' && (
              <div className="login-v2-status login-v2-status--success">
                <div className="login-v2-checkmark">
                  <i className="fa-solid fa-circle-check" />
                </div>
                <span>Successfully authenticated!</span>
                <p>Redirecting to dashboard…</p>
                <div className="login-v2-progress" />
              </div>
            )}

            {status === 'error' && (
              <div className="login-v2-status login-v2-status--error">
                <i className="fa-solid fa-circle-xmark login-v2-error-icon" />
                <span>Authentication failed</span>
                <p>{errorMsg || 'An error occurred. Try again.'}</p>
                <a href="/api/auth/login" className="login-v2-btn-discord">
                  <i className="fa-brands fa-discord" /> Réessayer
                </a>
              </div>
            )}

            {status === 'loading' && (
              <div className="login-v2-status login-v2-status--loading">
                <div className="login-v2-spinner" />
                <span>Login en cours…</span>
              </div>
            )}

            {!status && (
              <>
                <a
                  href="/api/auth/login"
                  className="login-v2-btn-discord"
                  onClick={() => setStatus('loading')}
                >
                  <i className="fa-brands fa-discord" />
                  Continue with Discord
                  <i className="fa-solid fa-arrow-right login-v2-btn-arrow" />
                </a>

                <div className="login-v2-divider">
                  <span>Login sécurisée via OAuth2</span>
                </div>

                <div className="login-v2-trust">
                  <div className="login-v2-trust-item">
                    <i className="fa-solid fa-lock" />
                    <span>End-to-end encrypted</span>
                  </div>
                  <div className="login-v2-trust-item">
                    <i className="fa-solid fa-shield-halved" />
                    <span>No passwords stored</span>
                  </div>
                  <div className="login-v2-trust-item">
                    <i className="fa-solid fa-rotate" />
                    <span>Local JWT session</span>
                  </div>
                </div>
              </>
            )}

            {/* Mini dashboard preview */}
            <div className="login-v2-preview">
              <div className="login-v2-preview-bar">
                <span className="login-v2-dot red" />
                <span className="login-v2-dot yellow" />
                <span className="login-v2-dot green" />
                <span style={{ fontSize: '0.65rem', color: '#949ba4', marginLeft: 6 }}>zyntra dashboard</span>
              </div>
              <div className="login-v2-preview-body">
                <div className="login-v2-preview-sidebar">
                  {['fa-chart-pie','fa-gavel','fa-shield-halved','fa-terminal','fa-users','fa-bell'].map((icon, i) => (
                    <div key={i} className={`login-v2-preview-nav ${i === 0 ? 'active' : ''}`}>
                      <i className={`fa-solid ${icon}`} />
                    </div>
                  ))}
                </div>
                <div className="login-v2-preview-content">
                  <div className="login-v2-preview-stats">
                    {[['247','Cases'],['98%','Health'],['12','Active']].map(([v,l]) => (
                      <div key={l} className="login-v2-preview-stat">
                        <strong>{v}</strong><small>{l}</small>
                      </div>
                    ))}
                  </div>
                  <div className="login-v2-preview-chart">
                    <svg viewBox="0 0 160 40" width="100%" height="40">
                      <defs>
                        <linearGradient id="lgPrev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff66b2" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#ff66b2" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,35 Q20,30 40,20 T80,15 T120,22 T160,5" fill="none" stroke="#ff66b2" strokeWidth="1.5"/>
                      <path d="M0,35 Q20,30 40,20 T80,15 T120,22 T160,5 L160,40 L0,40Z" fill="url(#lgPrev)"/>
                    </svg>
                  </div>
                  <div className="login-v2-preview-rows">
                    {['BAN · user#4821','WARN · user#2034','MUTE · user#7812'].map((t, i) => (
                      <div key={i} className="login-v2-preview-row">
                        <span className="login-v2-preview-row-dot" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
