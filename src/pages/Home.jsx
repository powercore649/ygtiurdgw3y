import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: 'fa-solid fa-shield-halved',
    title: 'Auto Moderation',
    desc: 'AI-powered filters that detect spam, raids, and toxic content before they spread.',
    gradient: 'linear-gradient(135deg, #5865F2, #8A5CF6)'
  },
  {
    icon: 'fa-solid fa-gavel',
    title: 'Case Management',
    desc: 'Full moderation history with cases, warnings, and appeals — all in one place.',
    gradient: 'linear-gradient(135deg, #ff66b2, #d4418e)'
  },
  {
    icon: 'fa-solid fa-chart-pie',
    title: 'Live Analytics',
    desc: 'Real-time charts & insights on server activity, member growth, and mod actions.',
    gradient: 'linear-gradient(135deg, #63b3ff, #00A8FC)'
  },
  {
    icon: 'fa-solid fa-terminal',
    title: 'Command Center',
    desc: 'Browse, search, and document every bot command with a powerful catalog UI.',
    gradient: 'linear-gradient(135deg, #10b981, #059669)'
  },
  {
    icon: 'fa-solid fa-user-shield',
    title: 'Account Control',
    desc: 'Discord-backed profile, live guild sync, session health, and device preferences in one hub.',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
  },
  {
    icon: 'fa-solid fa-signal',
    title: 'Status Page',
    desc: 'Monitor bot uptime, API latency, and command metadata from the live control plane.',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)'
  }
];

const STATS = [
  { value: '99.9%', label: 'Uptime' },
  { value: '<50ms', label: 'Avg Latency' },
  { value: '24/7', label: 'Monitoring' },
  { value: '∞', label: 'Scalability' }
];

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export default function Home() {
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const alive = useRef(true);
  const [scrollY, setScrollY] = useState(0);
  const [loggedInUser, setLoggedInUser] = useState(() => {
    const token = localStorage.getItem('zenith_token');
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        return payload;
      }
    }
    return null;
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [liveProfile, setLiveProfile] = useState(null);
  const [liveProfileLoading, setLiveProfileLoading] = useState(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClick = () => setProfileMenuOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [profileMenuOpen]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;
    const sections = root.querySelectorAll('.home-reveal-section');
    if (!sections.length) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('home-reveal--visible');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [loggedInUser, liveProfile]);

  const refreshLiveProfile = useCallback(async () => {
    if (!loggedInUser) {
      setLiveProfile(null);
      return;
    }
    const token = localStorage.getItem('zenith_token');
    if (!token) return;
    setLiveProfileLoading(true);
    const ac = new AbortController();
    try {
      const r = await fetch('/api/account/profile', {
        headers: { Authorization: `Bearer ${token}` },
        signal: ac.signal
      });
      if (!alive.current) return;
      if (r.ok) {
        setLiveProfile(await r.json());
      } else {
        setLiveProfile(null);
      }
    } catch {
      if (alive.current && !ac.signal.aborted) setLiveProfile(null);
    } finally {
      if (alive.current) setLiveProfileLoading(false);
    }
  }, [loggedInUser]);

  useEffect(() => {
    refreshLiveProfile();
  }, [refreshLiveProfile]);

  const avatarUrl = loggedInUser?.avatar
    ? `https://cdn.discordapp.com/avatars/${loggedInUser.userId}/${loggedInUser.avatar}.png?size=128`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  const liveAvatar =
    liveProfile?.id && liveProfile?.avatar
      ? `https://cdn.discordapp.com/avatars/${liveProfile.id}/${liveProfile.avatar}.png?size=128`
      : avatarUrl;

  const handleLogout = () => {
    localStorage.removeItem('zenith_token');
    localStorage.removeItem('zenith_guild_id');
    setLoggedInUser(null);
    setLiveProfile(null);
  };

  const displayName = liveProfile?.global_name || liveProfile?.username || loggedInUser?.global_name || loggedInUser?.username;
  const handleName = liveProfile?.username || loggedInUser?.username;
  const guildCount = loggedInUser?.allowedGuilds?.length ?? 0;

  return (
    <div ref={pageRef} className="home-page animate-route-enter">
      <div className="home-ambient-orbs" aria-hidden="true">
        <span className="home-orb home-orb--a" />
        <span className="home-orb home-orb--b" />
        <span className="home-orb home-orb--c" />
      </div>

      <nav
        className="home-nav"
        style={{
          background: scrollY > 50 ? 'rgba(8, 9, 17, 0.95)' : 'transparent',
          backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent'
        }}
      >
        <div className="home-nav-inner">
          <div className="home-nav-brand">
            <span className="home-nav-logo home-nav-logo--shine">Z</span>
            <span className="brand-text-glow" style={{ fontSize: '1.4rem' }}>
              zyntra
            </span>
          </div>
          <div className="home-nav-links">
            <a href="#features">Features</a>
            <a href="#stats">Performance</a>
            <a href="#account">Account</a>
            {loggedInUser ? (
              <>
                <button
                  type="button"
                  className="btn-discord home-nav-cta"
                  onClick={() => navigate('/dashboard')}
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-gauge-high" /> Dashboard
                </button>
                <div
                  className="home-profile-widget"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileMenuOpen(!profileMenuOpen);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setProfileMenuOpen((o) => !o);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="true"
                >
                  <img src={liveAvatar} alt="" className="home-profile-avatar" />
                  {liveProfileLoading && <span className="home-profile-sync" title="Syncing with Discord" />}
                  <div className={`home-profile-dropdown ${profileMenuOpen ? 'active' : ''}`}>
                    <div className="home-profile-dropdown-header">
                      <img src={liveAvatar} alt="" className="home-profile-dropdown-avatar" />
                      <div>
                        <span className="home-profile-dropdown-name">{displayName}</span>
                        <span className="home-profile-dropdown-tag">@{handleName}</span>
                        {liveProfile?.id && (
                          <span className="home-profile-dropdown-id">ID {liveProfile.id}</span>
                        )}
                      </div>
                    </div>
                    <div className="home-profile-dropdown-meta">
                      <span className="home-profile-live-pill">
                        <i className="fa-solid fa-cloud" /> Discord API
                      </span>
                      {guildCount > 0 && (
                        <span className="home-profile-guild-pill">
                          <i className="fa-solid fa-building-shield" /> {guildCount} servers
                        </span>
                      )}
                    </div>
                    <div className="home-profile-dropdown-divider" />
                    <button type="button" className="home-profile-dropdown-item" onClick={() => navigate('/dashboard')}>
                      <i className="fa-solid fa-gauge-high" /> Dashboard
                    </button>
                    <button
                      type="button"
                      className="home-profile-dropdown-item"
                      onClick={() => navigate('/dashboard?tab=account')}
                    >
                      <i className="fa-solid fa-user-gear" /> Account &amp; sync
                    </button>
                    <div className="home-profile-dropdown-divider" />
                    <button type="button" className="home-profile-dropdown-item" onClick={refreshLiveProfile}>
                      <i className={`fa-solid fa-rotate-right${liveProfileLoading ? ' fa-spin' : ''}`} /> Refresh profile
                    </button>
                    <button type="button" className="home-profile-dropdown-item home-profile-dropdown-item--danger" onClick={handleLogout}>
                      <i className="fa-solid fa-right-from-bracket" /> Log out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <a href="/api/auth/login" className="btn-discord home-nav-cta">
                <i className="fa-brands fa-discord" /> Login
              </a>
            )}
          </div>
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-hero-glow" />
        <div className="home-hero-content home-hero-stagger">
          <div className="home-hero-badge">
            <i className="fa-solid fa-bolt" />
            <span>AI-Powered Discord Moderation</span>
          </div>
          <h1 className="home-hero-title">
            Protect your server.
            <br />
            <span className="home-hero-accent">Empower your community.</span>
          </h1>
          <p className="home-hero-subtitle">
            zyntra is the all-in-one moderation platform for Discord — smart automation, deep analytics, and a
            control surface built for teams that care.
          </p>
          <div className="home-hero-actions">
            {loggedInUser ? (
              <button
                type="button"
                className="btn-primary home-hero-btn"
                onClick={() => navigate('/dashboard')}
                style={{ border: 'none', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-gauge-high" /> Go to Dashboard
              </button>
            ) : (
              <a href="/api/auth/login" className="btn-primary home-hero-btn">
                <i className="fa-brands fa-discord" /> Get Started with Discord
              </a>
            )}
            <a href="#features" className="btn-secondary home-hero-btn-alt">
              Explore Features <i className="fa-solid fa-arrow-down" />
            </a>
          </div>
        </div>

        <div className="home-hero-visual home-hero-stagger">
          <div className="home-hero-mockup">
            <div className="home-mockup-bar">
              <span className="home-dot red" />
              <span className="home-dot yellow" />
              <span className="home-dot green" />
              <span className="home-mockup-title">zyntra Dashboard</span>
            </div>
            <div className="home-mockup-body">
              <div className="home-mockup-sidebar">
                <div className="home-mockup-nav-item active">
                  <i className="fa-solid fa-chart-pie" />
                </div>
                <div className="home-mockup-nav-item">
                  <i className="fa-solid fa-gavel" />
                </div>
                <div className="home-mockup-nav-item">
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <div className="home-mockup-nav-item">
                  <i className="fa-solid fa-terminal" />
                </div>
              </div>
              <div className="home-mockup-content">
                <div className="home-mockup-stat-row">
                  <div className="home-mockup-stat">
                    <span>128</span>
                    <small>Servers</small>
                  </div>
                  <div className="home-mockup-stat">
                    <span>54K</span>
                    <small>Users</small>
                  </div>
                  <div className="home-mockup-stat">
                    <span>99.9%</span>
                    <small>Uptime</small>
                  </div>
                </div>
                <div className="home-mockup-chart">
                  <svg viewBox="0 0 200 60" className="home-chart-svg home-chart-svg--animate">
                    <defs>
                      <linearGradient id="chartGradHome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,102,178,0.45)" />
                        <stop offset="100%" stopColor="rgba(255,102,178,0)" />
                      </linearGradient>
                    </defs>
                    <path
                      className="home-chart-line"
                      d="M0,50 Q25,45 50,35 T100,20 T150,30 T200,10"
                      fill="none"
                      stroke="#ff66b2"
                      strokeWidth="2"
                    />
                    <path
                      d="M0,50 Q25,45 50,35 T100,20 T150,30 T200,10 L200,60 L0,60 Z"
                      fill="url(#chartGradHome)"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-reveal-section home-account-bridge" id="account">
        <div className="home-account-bridge-inner glass-panel">
          <div className="home-account-bridge-header">
            <span className="home-section-badge">Account</span>
            <h2>{loggedInUser ? 'Your Discord identity' : 'Sign in with Discord'}</h2>
            <p>
              {loggedInUser
                ? 'Profile data below is pulled from the same Discord-backed API as the dashboard — refreshed when you open this page.'
                : 'OAuth connects your administrator servers to the zyntra control surface. No password is stored on our servers.'}
            </p>
          </div>
          {loggedInUser ? (
            <div className="home-account-live">
              <div className="home-account-live-avatar">
                <img src={liveAvatar} alt="" />
                {liveProfileLoading && <span className="home-account-live-spinner" />}
              </div>
              <div className="home-account-live-body">
                <h3>{displayName}</h3>
                <p className="home-account-live-handle">@{handleName}</p>
                {liveProfile?.id && <p className="home-account-live-id">{liveProfile.id}</p>}
                <div className="home-account-live-actions">
                  <button type="button" className="btn-primary" onClick={() => navigate('/dashboard')}>
                    <i className="fa-solid fa-gauge-high" /> Open dashboard
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard?tab=account')}>
                    <i className="fa-solid fa-user-gear" /> Account manager
                  </button>
                  <button type="button" className="btn-secondary" onClick={refreshLiveProfile} disabled={liveProfileLoading}>
                    <i className={`fa-solid fa-rotate-right${liveProfileLoading ? ' fa-spin' : ''}`} /> Sync now
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="home-account-guest">
              <ul className="home-account-guest-list">
                <li>
                  <i className="fa-solid fa-check" /> Live profile &amp; guild metadata in the dashboard
                </li>
                <li>
                  <i className="fa-solid fa-check" /> Auto-sync and session health in Account Control
                </li>
                <li>
                  <i className="fa-solid fa-check" /> Encrypted session token (JWT) on this device only
                </li>
              </ul>
              <a href="/api/auth/login" className="btn-discord home-account-guest-cta">
                <i className="fa-brands fa-discord" /> Continue with Discord
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="home-reveal-section home-stats" id="stats">
        <div className="home-stats-grid">
          {STATS.map((s, i) => (
            <div key={s.label} className="home-stat-card" style={{ '--i': i }}>
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-reveal-section home-features" id="features">
        <div className="home-features-header">
          <span className="home-section-badge">Features</span>
          <h2>Everything your server needs</h2>
          <p>From AI-powered moderation to live analytics — one platform, zero compromises.</p>
        </div>
        <div className="home-features-grid">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="home-feature-card glass-panel" style={{ '--i': i }}>
              <div className="home-feature-icon" style={{ background: f.gradient }}>
                <i className={f.icon} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-reveal-section home-cta">
        <div className="home-cta-inner glass-panel">
          <h2>Ready to level up your server?</h2>
          <p>Join communities using zyntra for safer, smarter moderation.</p>
          {loggedInUser ? (
            <button
              type="button"
              className="btn-primary home-hero-btn"
              onClick={() => navigate('/dashboard')}
              style={{ border: 'none', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-gauge-high" /> Open Dashboard
            </button>
          ) : (
            <a href="/api/auth/login" className="btn-primary home-hero-btn">
              <i className="fa-brands fa-discord" /> Login with Discord
            </a>
          )}
        </div>
      </section>

      <footer className="home-reveal-section home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <span className="brand-text-glow" style={{ fontSize: '1.2rem' }}>
              zyntra
            </span>
            <p>AI Moderation Platform for Discord</p>
          </div>
          <div className="home-footer-links">
            <a href="#features">Features</a>
            <a href="#stats">Performance</a>
            <a href="#account">Account</a>
            <button
              type="button"
              className="home-footer-link-btn"
              onClick={() => navigate(loggedInUser ? '/dashboard' : '/login')}
            >
              Dashboard
            </button>
          </div>
        </div>
        <div className="home-footer-bottom">
          <p>&copy; {new Date().getFullYear()} zyntra. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
