import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const PREF_KEYS = {
  compact: 'zenith_pref_compact',
  notifSound: 'zenith_pref_notif_sound',
  autoRefresh: 'zenith_pref_autorefresh',
  memberCount: 'zenith_pref_member_count'
};

const LIVE_SYNC_KEY = 'zenith_account_live_sync';
const SYNC_INTERVAL_KEY = 'zenith_account_sync_interval_ms';

function readBoolPref(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === '1' || v === 'true';
  } catch {
    return fallback;
  }
}

function readIntervalMs() {
  try {
    const v = parseInt(localStorage.getItem(SYNC_INTERVAL_KEY) || '', 10);
    if (v === 10000 || v === 15000 || v === 30000 || v === 60000) return v;
  } catch { /* ignore */ }
  return 15000;
}

function readLiveSync() {
  try {
    const v = localStorage.getItem(LIVE_SYNC_KEY);
    if (v === null) return true;
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
}

function formatRelativeTime(date) {
  if (!date) return '—';
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return date.toLocaleDateString();
}

function discordBannerUrl(u) {
  if (!u?.id || !u.banner) return null;
  const ext = String(u.banner).startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/banners/${u.id}/${u.banner}.${ext}?size=600`;
}

function accentFromDiscord(n) {
  if (n == null || typeof n !== 'number') return null;
  const hex = (n & 0xffffff).toString(16).padStart(6, '0');
  return `#${hex}`;
}

function isAdminPermission(permissions) {
  if (permissions == null) return false;
  try {
    const p = typeof permissions === 'string' ? BigInt(permissions) : BigInt(permissions);
    return (p & 0x8n) !== 0n;
  } catch {
    return false;
  }
}

function memberCountLabel(g) {
  const n = g.approximate_member_count ?? g.member_count ?? g.memberCount;
  if (n == null || Number.isNaN(Number(n))) return null;
  return Number(n).toLocaleString();
}

export default function AccountManager({ user }) {
  const mounted = useRef(true);
  const loadedOnceRef = useRef(false);
  const [discordUser, setDiscordUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  /** When true, `guilds` came from a successful /api/account/guilds response (may be empty). */
  const [guildsFromApi, setGuildsFromApi] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [guildsError, setGuildsError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [latency, setLatency] = useState({ profile: null, guilds: null });
  const [liveSync, setLiveSync] = useState(readLiveSync);
  const [syncIntervalMs, setSyncIntervalMs] = useState(readIntervalMs);
  const [syncLog, setSyncLog] = useState([]);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [serverQuery, setServerQuery] = useState('');

  const [prefs, setPrefs] = useState({
    compact: readBoolPref(PREF_KEYS.compact, false),
    notifSound: readBoolPref(PREF_KEYS.notifSound, false),
    autoRefresh: readBoolPref(PREF_KEYS.autoRefresh, false),
    memberCount: readBoolPref(PREF_KEYS.memberCount, true)
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const broadcastPrefs = useCallback(() => {
    try {
      window.dispatchEvent(new CustomEvent('zenith-prefs-changed', { detail: { ...prefs } }));
    } catch { /* ignore */ }
  }, [prefs]);

  const setPref = useCallback(
    (key, value) => {
      const k = PREF_KEYS[key];
      if (!k) return;
      try {
        localStorage.setItem(k, value ? '1' : '0');
      } catch { /* ignore */ }
      setPrefs((p) => ({ ...p, [key]: value }));
    },
    []
  );

  useEffect(() => {
    broadcastPrefs();
  }, [prefs, broadcastPrefs]);

  const fetchAccountData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setError(null);
        if (!loadedOnceRef.current) {
          setInitialLoad(true);
        } else {
          setSyncing(true);
        }
      } else {
        setSyncing(true);
      }
      setProfileError(null);
      setGuildsError(null);

      const token = localStorage.getItem('zenith_token');
      const headers = { Authorization: `Bearer ${token}` };

      let profileRes;
      let guildsRes;
      let profileMs = 0;
      let guildsMs = 0;

      try {
        const t0p = performance.now();
        try {
          profileRes = await fetch('/api/account/profile', { headers });
        } catch {
          profileRes = { ok: false, status: 0 };
        }
        profileMs = Math.round(performance.now() - t0p);

        const t0g = performance.now();
        try {
          guildsRes = await fetch('/api/account/guilds', { headers });
        } catch {
          guildsRes = { ok: false, status: 0 };
        }
        guildsMs = Math.round(performance.now() - t0g);

        if (!mounted.current) return;

        setLatency({ profile: profileMs, guilds: guildsMs });

        if (profileRes.ok) {
          try {
            setDiscordUser(await profileRes.json());
          } catch {
            setProfileError('Invalid profile response');
          }
        } else {
          setProfileError(
            profileRes.status === 401
              ? 'Session expired — sign in again.'
              : `Profile API failed (${profileRes.status || 'network'}).`
          );
        }

        if (guildsRes.ok) {
          try {
            const data = await guildsRes.json();
            setGuilds(Array.isArray(data) ? data : []);
            setGuildsFromApi(true);
          } catch {
            setGuildsError('Invalid guilds response');
            setGuildsFromApi(false);
          }
        } else {
          setGuildsFromApi(false);
          setGuildsError(
            guildsRes.status === 401
              ? 'Session expired — sign in again.'
              : `Guilds API failed (${guildsRes.status || 'network'}).`
          );
        }

        const at = new Date();
        setLastSyncedAt(at);
        setSyncLog((prev) => {
          const row = {
            at,
            profileMs,
            guildsMs,
            okProfile: profileRes.ok,
            okGuilds: guildsRes.ok
          };
          return [row, ...prev].slice(0, 10);
        });

        if (!profileRes.ok && !guildsRes.ok) {
          setError('Could not synchronize with Discord. Check your connection or sign in again.');
        } else {
          setError(null);
        }
      } catch (e) {
        console.error('[AccountManager]', e);
        if (mounted.current) {
          setError('Unexpected error while syncing with Discord.');
        }
      } finally {
        if (mounted.current) {
          setSyncing(false);
          if (!silent && !loadedOnceRef.current) {
            loadedOnceRef.current = true;
            setInitialLoad(false);
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchAccountData({ silent: false });
  }, [fetchAccountData]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchAccountData({ silent: true });
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [fetchAccountData]);

  useEffect(() => {
    if (!liveSync) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchAccountData({ silent: true });
    }, syncIntervalMs);
    return () => clearInterval(id);
  }, [liveSync, syncIntervalMs, fetchAccountData]);

  const handleLogout = () => {
    localStorage.removeItem('zenith_token');
    localStorage.removeItem('zenith_guild_id');
    window.location.href = '/login';
  };

  const toggleLiveSync = () => {
    const v = !liveSync;
    setLiveSync(v);
    try {
      localStorage.setItem(LIVE_SYNC_KEY, v ? '1' : '0');
    } catch { /* ignore */ }
  };

  const changeInterval = (ms) => {
    setSyncIntervalMs(ms);
    try {
      localStorage.setItem(SYNC_INTERVAL_KEY, String(ms));
    } catch { /* ignore */ }
  };

  const avatarUrl = discordUser?.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=256`
    : user?.avatar
      ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png?size=256`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

  const bannerImageUrl = discordBannerUrl(discordUser);
  const bannerColor = discordUser?.banner_color || '#5865F2';
  const accentHex = accentFromDiscord(discordUser?.accent_color);

  const displayUser = discordUser || {
    username: user?.username || 'Unknown',
    id: user?.userId || '—',
    global_name: user?.global_name || user?.username || 'Unknown'
  };

  const createdAt =
    displayUser.id && displayUser.id !== '—'
      ? new Date(Number(BigInt(displayUser.id) >> 22n) + 1420070400000)
      : null;

  const sessionExpiry = user?.exp ? new Date(user.exp * 1000) : null;
  const sessionMsLeft = sessionExpiry ? sessionExpiry.getTime() - nowTick : null;
  const sessionUrgency =
    sessionMsLeft == null
      ? 'ok'
      : sessionMsLeft < 0
        ? 'expired'
        : sessionMsLeft < 15 * 60 * 1000
          ? 'critical'
          : sessionMsLeft < 2 * 60 * 60 * 1000
            ? 'warn'
            : 'ok';

  const allowedIds = useMemo(
    () => new Set((user?.allowedGuilds || []).map((g) => g.id)),
    [user?.allowedGuilds]
  );

  const mergedGuilds = useMemo(() => {
    const raw = guildsFromApi ? guilds : user?.allowedGuilds || [];
    const list = [...raw];
    list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    return list;
  }, [guilds, guildsFromApi, user?.allowedGuilds]);

  const filteredGuilds = useMemo(() => {
    const q = serverQuery.trim().toLowerCase();
    if (!q) return mergedGuilds;
    return mergedGuilds.filter(
      (g) =>
        (g.name || '').toLowerCase().includes(q) ||
        String(g.id || '').includes(q)
    );
  }, [mergedGuilds, serverQuery]);

  const copyUserId = async () => {
    const id = displayUser.id;
    if (!id || id === '—') return;
    try {
      await navigator.clipboard.writeText(String(id));
    } catch {
      /* ignore */
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'fa-solid fa-user' },
    { id: 'servers', label: 'Servers', icon: 'fa-solid fa-server' },
    { id: 'session', label: 'Session', icon: 'fa-solid fa-key' },
    { id: 'preferences', label: 'Preferences', icon: 'fa-solid fa-sliders' }
  ];

  const showMemberCounts = prefs.memberCount;

  return (
    <div className={`account-manager animate-fade-in${prefs.compact ? ' account-manager--compact' : ''}`}>
      <div className="settings-page-header">
        <div className="settings-page-header-text">
          <h2 className="glow-text">
            <i className="fa-brands fa-discord" /> Account control
          </h2>
          <p className="subtitle">
            Identity and servers are loaded from the Discord-backed API and refreshed automatically while this page is
            open.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary settings-refresh-btn"
          onClick={() => fetchAccountData({ silent: false })}
          disabled={syncing}
        >
          <i className={`fa-solid fa-rotate-right${syncing ? ' fa-spin' : ''}`} /> Full refresh
        </button>
      </div>

      <div className="glass-panel account-sync-bar">
        <div className="account-sync-bar-left">
          <span className={`account-sync-pulse${liveSync ? ' account-sync-pulse--on' : ''}`} title="Live sync" />
          <div>
            <p className="account-sync-title">
              {liveSync ? 'Live sync with Discord' : 'Live sync paused'}
            </p>
            <p className="account-sync-meta">
              Last pull: <strong>{formatRelativeTime(lastSyncedAt)}</strong>
              {lastSyncedAt && <span className="account-sync-meta-sub"> ({lastSyncedAt.toLocaleTimeString()})</span>}
            </p>
          </div>
        </div>
        <div className="account-sync-bar-metrics">
          <span className="account-sync-chip" title="GET /api/account/profile">
            Profile <strong>{latency.profile != null ? `${latency.profile} ms` : '—'}</strong>
          </span>
          <span className="account-sync-chip" title="GET /api/account/guilds">
            Guilds <strong>{latency.guilds != null ? `${latency.guilds} ms` : '—'}</strong>
          </span>
        </div>
        <div className="account-sync-bar-actions">
          <label className="account-sync-toggle">
            <input type="checkbox" checked={liveSync} onChange={toggleLiveSync} />
            <span>Auto-sync</span>
          </label>
          <select
            className="account-sync-select"
            value={syncIntervalMs}
            onChange={(e) => changeInterval(Number(e.target.value))}
            disabled={!liveSync}
            aria-label="Sync interval"
          >
            <option value={10000}>Every 10s</option>
            <option value={15000}>Every 15s</option>
            <option value={30000}>Every 30s</option>
            <option value={60000}>Every 60s</option>
          </select>
          <button
            type="button"
            className="btn-secondary btn-sync-now"
            onClick={() => fetchAccountData({ silent: true })}
            disabled={syncing}
          >
            {syncing ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-cloud-arrow-down" />}{' '}
            Sync now
          </button>
        </div>
      </div>

      {(profileError || guildsError) && (
        <div className="glass-panel account-sync-warnings">
          {profileError && (
            <p>
              <i className="fa-solid fa-user-xmark" /> <strong>Profile:</strong> {profileError}
            </p>
          )}
          {guildsError && (
            <p>
              <i className="fa-solid fa-server" /> <strong>Guilds:</strong> {guildsError}
            </p>
          )}
        </div>
      )}

      <div className="settings-tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {error && !initialLoad && (
        <div className="glass-panel settings-error-banner">
          <i className="fa-solid fa-circle-exclamation" />
          <span>{error}</span>
          <button type="button" className="btn-secondary" onClick={() => fetchAccountData({ silent: false })}>
            Retry
          </button>
        </div>
      )}

      {initialLoad && <div className="loader">Connecting to Discord account services…</div>}

      {!initialLoad && activeTab === 'profile' && (
        <div className="settings-section animate-fade-in">
          <div className="glass-panel settings-profile-card">
            <div
              className="settings-profile-banner settings-profile-banner--rich"
              style={
                bannerImageUrl
                  ? undefined
                  : { background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor}88)` }
              }
            >
              {bannerImageUrl && (
                <img className="settings-profile-banner-img" src={bannerImageUrl} alt="" />
              )}
              <div className="settings-profile-banner-overlay" />
            </div>
            <div className="settings-profile-body">
              <div className="settings-profile-avatar-wrapper">
                <img className="settings-profile-avatar" src={avatarUrl} alt="" />
                <div className="settings-profile-status-dot" title="Synced from Discord" />
              </div>
              <div className="settings-profile-main-info">
                <h2 className="settings-profile-display-name">
                  {displayUser.global_name || displayUser.username}
                </h2>
                <p className="settings-profile-username">@{displayUser.username}</p>
                {displayUser.discriminator && displayUser.discriminator !== '0' && (
                  <p className="settings-profile-discriminator">#{displayUser.discriminator}</p>
                )}
                <div className="settings-profile-actions">
                  <button type="button" className="btn-secondary btn-sm" onClick={copyUserId}>
                    <i className="fa-regular fa-copy" /> Copy user ID
                  </button>
                  {displayUser.id && displayUser.id !== '—' && (
                    <a
                      className="btn-secondary btn-sm"
                      href={`https://discord.com/users/${displayUser.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="fa-brands fa-discord" /> Open in Discord
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="settings-details-grid">
            <div className="glass-panel settings-detail-card">
              <div className="settings-detail-icon">
                <i className="fa-solid fa-id-badge" />
              </div>
              <div className="settings-detail-content">
                <span className="settings-detail-label">User ID</span>
                <span className="settings-detail-value settings-mono">{displayUser.id}</span>
              </div>
            </div>

            {createdAt && (
              <div className="glass-panel settings-detail-card">
                <div className="settings-detail-icon">
                  <i className="fa-solid fa-calendar" />
                </div>
                <div className="settings-detail-content">
                  <span className="settings-detail-label">Account created</span>
                  <span className="settings-detail-value">
                    {createdAt.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            )}

            {accentHex && (
              <div className="glass-panel settings-detail-card">
                <div
                  className="settings-detail-icon"
                  style={{
                    background: `${accentHex}22`,
                    color: accentHex,
                    border: `1px solid ${accentHex}44`
                  }}
                >
                  <i className="fa-solid fa-palette" />
                </div>
                <div className="settings-detail-content">
                  <span className="settings-detail-label">Accent (Discord)</span>
                  <span className="settings-detail-value settings-accent-swatch">
                    <span className="settings-accent-dot" style={{ background: accentHex }} />
                    {accentHex}
                  </span>
                </div>
              </div>
            )}

            {discordUser?.verified !== undefined && (
              <div className="glass-panel settings-detail-card">
                <div className="settings-detail-icon">
                  <i className="fa-solid fa-circle-check" />
                </div>
                <div className="settings-detail-content">
                  <span className="settings-detail-label">Verified email</span>
                  <span className="settings-detail-value">
                    {discordUser.verified ? (
                      <span className="status-ok">Yes</span>
                    ) : (
                      <span className="status-bad">No</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {discordUser?.email && (
              <div className="glass-panel settings-detail-card">
                <div className="settings-detail-icon">
                  <i className="fa-solid fa-envelope" />
                </div>
                <div className="settings-detail-content">
                  <span className="settings-detail-label">Email (from Discord)</span>
                  <span className="settings-detail-value settings-email">{discordUser.email}</span>
                </div>
              </div>
            )}

            {discordUser?.locale && (
              <div className="glass-panel settings-detail-card">
                <div className="settings-detail-icon">
                  <i className="fa-solid fa-globe" />
                </div>
                <div className="settings-detail-content">
                  <span className="settings-detail-label">Locale</span>
                  <span className="settings-detail-value">{discordUser.locale}</span>
                </div>
              </div>
            )}

            {discordUser?.mfa_enabled !== undefined && (
              <div className="glass-panel settings-detail-card">
                <div className="settings-detail-icon">
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <div className="settings-detail-content">
                  <span className="settings-detail-label">Two-factor authentication</span>
                  <span className="settings-detail-value">
                    {discordUser.mfa_enabled ? (
                      <span className="status-ok">
                        <i className="fa-solid fa-check-circle" /> Enabled
                      </span>
                    ) : (
                      <span className="status-bad">
                        <i className="fa-solid fa-xmark-circle" /> Disabled
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {discordUser?.premium_type !== undefined && (
              <div className="glass-panel settings-detail-card">
                <div
                  className="settings-detail-icon"
                  style={{ color: '#f47fff', background: 'rgba(244, 127, 255, 0.1)' }}
                >
                  <i className="fa-solid fa-gem" />
                </div>
                <div className="settings-detail-content">
                  <span className="settings-detail-label">Nitro</span>
                  <span className="settings-detail-value">
                    {discordUser.premium_type === 0 && 'None'}
                    {discordUser.premium_type === 1 && 'Nitro Classic'}
                    {discordUser.premium_type === 2 && 'Nitro'}
                    {discordUser.premium_type === 3 && 'Nitro Basic'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {(discordUser?.public_flags != null || discordUser?.flags != null) && (
            <div className="glass-panel settings-badges-card">
              <h3>
                <i className="fa-solid fa-award" /> Public flags
              </h3>
              <div className="settings-badge-list">
                {renderBadges(discordUser.public_flags ?? discordUser.flags)}
              </div>
            </div>
          )}

          {syncLog.length > 0 && (
            <div className="glass-panel account-sync-log">
              <h3>
                <i className="fa-solid fa-clock-rotate-left" /> Recent API sync
              </h3>
              <ul>
                {syncLog.map((row, i) => (
                  <li key={`${row.at.getTime()}-${i}`}>
                    <span className="account-sync-log-time">{row.at.toLocaleTimeString()}</span>
                    <span className={row.okProfile ? 'status-ok' : 'status-bad'}>profile {row.profileMs} ms</span>
                    <span className={row.okGuilds ? 'status-ok' : 'status-bad'}>guilds {row.guildsMs} ms</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!initialLoad && activeTab === 'servers' && (
        <div className="settings-section animate-fade-in">
          <div className="settings-section-intro glass-panel">
            <i className="fa-solid fa-diagram-project" style={{ fontSize: '1.2rem', color: 'var(--electric-blue)' }} />
            <div>
              <h3>Your Discord servers</h3>
              <p>
                List from <code className="account-inline-code">/api/account/guilds</code> when available; otherwise
                dashboard-eligible guilds from your session. Zyntra-enabled servers are highlighted.
              </p>
            </div>
          </div>
          <div className="glass-panel account-server-toolbar">
            <div className="command-search account-server-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="search"
                placeholder="Filter by name or snowflake…"
                value={serverQuery}
                onChange={(e) => setServerQuery(e.target.value)}
                aria-label="Filter servers"
              />
            </div>
            <span className="account-server-count">
              {filteredGuilds.length} / {mergedGuilds.length} shown
            </span>
          </div>
          {filteredGuilds.length > 0 ? (
            <div className="settings-servers-grid">
              {filteredGuilds.map((g) => {
                const zenith = allowedIds.has(g.id);
                const members = showMemberCounts ? memberCountLabel(g) : null;
                return (
                  <div key={g.id} className={`glass-panel settings-server-card${zenith ? ' settings-server-card--zenith' : ''}`}>
                    <div className="settings-server-icon-wrap">
                      {g.icon ? (
                        <img
                          src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`}
                          alt=""
                          className="settings-server-icon"
                        />
                      ) : (
                        <div className="settings-server-placeholder">{g.name?.charAt(0) || '#'}</div>
                      )}
                    </div>
                    <div className="settings-server-info">
                      <h4>{g.name}</h4>
                      <span className="settings-server-id">{g.id}</span>
                      {members && (
                        <p className="settings-server-members">
                          <i className="fa-solid fa-users" /> {members} members
                        </p>
                      )}
                      <div className="settings-server-badges">
                        {zenith && <span className="badge badge-zenith">Zyntra dashboard</span>}
                        {g.owner && <span className="badge">Owner</span>}
                        {g.permissions != null && (
                          <span
                            className="badge"
                            style={{ background: 'rgba(99, 179, 255, 0.15)', color: '#63b3ff' }}
                          >
                            {isAdminPermission(g.permissions) ? 'Administrator' : 'Member'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel settings-empty-state">
              <i className="fa-solid fa-filter" style={{ fontSize: '2rem', opacity: 0.3 }} />
              <p>No servers match this filter.</p>
            </div>
          )}
        </div>
      )}

      {!initialLoad && activeTab === 'session' && (
        <div className="settings-section animate-fade-in">
          <div className="glass-panel settings-session-card">
            <div className="settings-session-header">
              <h3>
                <i className="fa-solid fa-shield-halved" /> Session &amp; access
              </h3>
              <div className="settings-session-status">
                <span
                  className={`settings-status-dot ${sessionUrgency === 'expired' ? 'expired' : sessionUrgency === 'critical' ? 'warn' : 'active'}`}
                />
                {sessionUrgency === 'expired' ? 'Expired' : 'Active'}
              </div>
            </div>
            <div className={`session-expiry-meter session-expiry-meter--${sessionUrgency}`}>
              {sessionExpiry && (
                <>
                  <div className="session-expiry-row">
                    <span className="settings-detail-label">Dashboard token expires</span>
                    <span className="settings-detail-value">{sessionExpiry.toLocaleString()}</span>
                  </div>
                  {sessionMsLeft != null && (
                    <p className="session-expiry-relative">
                      {sessionMsLeft < 0
                        ? 'Refresh the page and sign in again to keep managing servers.'
                        : `Approximately ${Math.max(1, Math.round(sessionMsLeft / 60000))} minutes of session time remaining.`}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="settings-session-grid">
              <div className="settings-session-item">
                <i className="fa-solid fa-building-shield" />
                <div>
                  <span className="settings-detail-label">Zyntra-eligible guilds</span>
                  <span className="settings-detail-value">{user?.allowedGuilds?.length || 0}</span>
                </div>
              </div>
              <div className="settings-session-item">
                <i className="fa-solid fa-cloud" />
                <div>
                  <span className="settings-detail-label">Guild directory (API)</span>
                  <span className="settings-detail-value">{guilds.length} guilds synced</span>
                </div>
              </div>
              <div className="settings-session-item">
                <i className="fa-brands fa-discord" />
                <div>
                  <span className="settings-detail-label">Authentication</span>
                  <span className="settings-detail-value">Discord OAuth2 (Bearer)</span>
                </div>
              </div>
            </div>
            <div className="settings-session-actions">
              <button type="button" className="btn-primary" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket" /> Log out everywhere (this device)
              </button>
              <button type="button" className="btn-secondary" onClick={() => fetchAccountData({ silent: true })}>
                <i className="fa-solid fa-rotate-right" /> Re-sync Discord data
              </button>
            </div>
          </div>
        </div>
      )}

      {!initialLoad && activeTab === 'preferences' && (
        <div className="settings-section animate-fade-in">
          <div className="glass-panel settings-prefs-card">
            <h3>
              <i className="fa-solid fa-sliders" /> Dashboard preferences
            </h3>
            <p className="subtitle" style={{ marginBottom: '24px' }}>
              Stored on this browser. Other devices are unaffected until the control API supports cloud preferences.
            </p>

            <div className="settings-pref-group">
              <div className="settings-pref-item">
                <div className="settings-pref-info">
                  <h4>Compact account layout</h4>
                  <p>Tighter spacing on this page for dense monitoring.</p>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={prefs.compact}
                    onChange={(e) => setPref('compact', e.target.checked)}
                  />
                  <span className="settings-toggle-slider" />
                </label>
              </div>

              <div className="settings-pref-item">
                <div className="settings-pref-info">
                  <h4>Notification sounds</h4>
                  <p>Reserved for future moderation alerts in the dashboard.</p>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={prefs.notifSound}
                    onChange={(e) => setPref('notifSound', e.target.checked)}
                  />
                  <span className="settings-toggle-slider" />
                </label>
              </div>

              <div className="settings-pref-item">
                <div className="settings-pref-info">
                  <h4>Auto-refresh analytics</h4>
                  <p>Other pages can listen for this flag to poll overview data (when implemented).</p>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={prefs.autoRefresh}
                    onChange={(e) => setPref('autoRefresh', e.target.checked)}
                  />
                  <span className="settings-toggle-slider" />
                </label>
              </div>

              <div className="settings-pref-item">
                <div className="settings-pref-info">
                  <h4>Show member counts</h4>
                  <p>When the API returns member counts on guild objects, show them on server cards.</p>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={prefs.memberCount}
                    onChange={(e) => setPref('memberCount', e.target.checked)}
                  />
                  <span className="settings-toggle-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderBadges(flags) {
  if (!flags) {
    return <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No public flags.</p>;
  }
  const BADGES = [
    { flag: 1 << 0, name: 'Discord Employee', icon: 'fa-solid fa-briefcase' },
    { flag: 1 << 1, name: 'Partnered Server Owner', icon: 'fa-solid fa-handshake' },
    { flag: 1 << 2, name: 'HypeSquad Events', icon: 'fa-solid fa-calendar-star' },
    { flag: 1 << 3, name: 'Bug Hunter Level 1', icon: 'fa-solid fa-bug' },
    { flag: 1 << 6, name: 'HypeSquad Bravery', icon: 'fa-solid fa-shield' },
    { flag: 1 << 7, name: 'HypeSquad Brilliance', icon: 'fa-solid fa-gem' },
    { flag: 1 << 8, name: 'HypeSquad Balance', icon: 'fa-solid fa-scale-balanced' },
    { flag: 1 << 9, name: 'Early Supporter', icon: 'fa-solid fa-heart' },
    { flag: 1 << 14, name: 'Bug Hunter Level 2', icon: 'fa-solid fa-bug-slash' },
    { flag: 1 << 17, name: 'Verified Bot Developer', icon: 'fa-solid fa-robot' },
    { flag: 1 << 18, name: 'Certified Moderator', icon: 'fa-solid fa-certificate' },
    { flag: 1 << 22, name: 'Active Developer', icon: 'fa-solid fa-code' }
  ];

  const userBadges = BADGES.filter((b) => (flags & b.flag) !== 0);
  if (userBadges.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No matching badges for this flag set.</p>;
  }

  return (
    <>
      {userBadges.map((b) => (
        <span key={b.flag} className="settings-badge-chip" title={b.name}>
          <i className={b.icon} /> {b.name}
        </span>
      ))}
    </>
  );
}
