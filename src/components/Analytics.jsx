import React, { useState, useEffect, useMemo } from 'react';

const ACTION_COLORS = {
  WARN:    '#ffbb33',
  BAN:     '#ff4444',
  MUTE:    '#ff66b2',
  KICK:    '#ff8800',
  UNMUTE:  '#00C851',
  UNBAN:   '#33b5e5',
  PURGE:   '#aa66cc',
  MASSBAN: '#cc0000',
  TIMEOUT: '#e67e22',
};

function getHealthColor(score) {
  if (!score && score !== 0) return '#64748b';
  if (score >= 80) return '#00C851';
  if (score >= 50) return '#ffbb33';
  return '#ff4444';
}

function SparkLine({ points, color }) {
  if (!points || points.length < 2) return null;
  const W = 200, H = 48;
  const max = Math.max(...points, 1);
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - (v / max) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const safeColor = color.replace('#', '');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${safeColor}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${coords} ${W},${H}`} fill={`url(#sg-${safeColor})`} />
      <polyline points={coords} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Analytics({ selectedGuild }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState(30);

  useEffect(() => {
    if (!selectedGuild) return;
    fetchStats();
  }, [selectedGuild]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('zenith_token');
      const res = await fetch(`/api/moderation/${selectedGuild}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setStats(await res.json());
    } catch (e) {
      console.error('[Analytics]', e);
      setError('Unable to load data. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const dailyData = useMemo(() => {
    if (!stats?.dailyData) return [];
    return stats.dailyData.slice(-range);
  }, [stats, range]);

  const dailyCounts = useMemo(() => dailyData.map(d => d.count ?? 0), [dailyData]);

  const breakdown = useMemo(() => {
    if (!stats?.actionBreakdown) return [];
    return Object.entries(stats.actionBreakdown).sort((a, b) => b[1] - a[1]);
  }, [stats]);

  const totalActions = useMemo(() => breakdown.reduce((s, [, v]) => s + v, 0), [breakdown]);

  const peakDay = useMemo(() => {
    if (!dailyData.length) return null;
    return dailyData.reduce((best, d) => (d.count ?? 0) > (best.count ?? 0) ? d : best, dailyData[0]);
  }, [dailyData]);

  const activeDays = useMemo(() => dailyData.filter(d => (d.count ?? 0) > 0).length, [dailyData]);
  const maxDaily = useMemo(() => Math.max(...dailyCounts, 1), [dailyCounts]);

  if (loading) return <div className="loader">Loading analytics…</div>;

  if (error) return (
    <div className="glass-panel" style={{ padding: 32, textAlign: 'center' }}>
      <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '2rem', marginBottom: 12, color: '#ff4444' }} />
      <p style={{ color: '#ff4444' }}>{error}</p>
      <button className="btn-secondary" onClick={fetchStats} style={{ marginTop: 12 }}>
        <i className="fa-solid fa-rotate-right" /> Retry
      </button>
    </div>
  );

  if (!stats) return null;

  return (
    <div className="analytics-page animate-fade-in">

      {/* Header */}
      <div className="command-hero glass-panel">
        <div>
          <p className="command-eyebrow">Live Data · /api/moderation/{selectedGuild}/stats</p>
          <h2 className="glow-text">Analytics</h2>
          <p className="subtitle">Real moderation statistics from your Discord server.</p>
        </div>
        <div className="command-hero-stats">
          <div className="command-stat-chip">
            <strong style={{ color: '#ff66b2' }}>{stats.totalCases ?? '—'}</strong>
            <span>Total cases</span>
          </div>
          <div className="command-stat-chip">
            <strong style={{ color: '#ffbb33' }}>{stats.last24h ?? '—'}</strong>
            <span>Last 24h</span>
          </div>
          <div className="command-stat-chip">
            <strong style={{ color: getHealthColor(stats.healthScore) }}>
              {stats.healthScore != null ? `${stats.healthScore}%` : '—'}
            </strong>
            <span>Health Score</span>
          </div>
        </div>
      </div>

      {/* Range + refresh */}
      <div className="glass-panel analytics-toolbar">
        <span className="analytics-toolbar-label">Period :</span>
        {[7, 14, 30].map(r => (
          <button key={r} className={`analytics-range-btn${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>
            {r}j
          </button>
        ))}
        <button className="btn-icon" onClick={fetchStats} title="Refresh" style={{ marginLeft: 'auto' }}>
          <i className="fa-solid fa-rotate-right" />
        </button>
      </div>

      {/* KPI cards */}
      <div className="analytics-kpi-grid">
        <div className="glass-panel analytics-kpi-card">
          <p className="analytics-kpi-label">Actions on {range}j</p>
          <h3 className="analytics-kpi-value" style={{ color: '#ff66b2' }}>{dailyCounts.reduce((s, v) => s + v, 0)}</h3>
          <SparkLine points={dailyCounts} color="#ff66b2" />
        </div>
        <div className="glass-panel analytics-kpi-card">
          <p className="analytics-kpi-label">Peak activity</p>
          <h3 className="analytics-kpi-value" style={{ color: '#ffbb33' }}>{peakDay?.count ?? 0}</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>{peakDay?.date ?? '—'}</p>
        </div>
        <div className="glass-panel analytics-kpi-card">
          <p className="analytics-kpi-label">Active days</p>
          <h3 className="analytics-kpi-value" style={{ color: '#33b5e5' }}>{activeDays}</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>of {dailyData.length} days</p>
        </div>
        <div className="glass-panel analytics-kpi-card">
          <p className="analytics-kpi-label">Total warnings</p>
          <h3 className="analytics-kpi-value" style={{ color: '#ff8800' }}>{stats.totalWarnings ?? '—'}</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>cumulative</p>
        </div>
      </div>

      {/* Daily bar chart */}
      <div className="glass-panel analytics-main-chart">
        <h3 className="analytics-chart-title">
          <i className="fa-solid fa-chart-area" /> Daily activity ({range} days)
        </h3>
        <div className="analytics-stacked-chart">
          {dailyData.map((d, i) => {
            const val = d.count ?? 0;
            const heightPct = (val / maxDaily) * 100;
            const label = (() => {
              try {
                return new Date(`${d.date}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
              } catch { return d.date; }
            })();
            const showLabel = i % Math.ceil(dailyData.length / 8) === 0;
            return (
              <div key={i} className="analytics-stacked-col" title={`${label} : ${val} actions`}>
                <div className="analytics-stacked-bar-wrap" style={{
                  height: `${Math.max(4, heightPct)}%`,
                  background: 'linear-gradient(180deg, #ff66b2, #aa66cc)',
                  borderRadius: '3px 3px 0 0',
                  opacity: val > 0 ? 0.85 : 0.15,
                }} />
                {showLabel && <span className="analytics-stacked-label">{label}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown + Top Mods */}
      <div className="status-grid-two">
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h3 className="analytics-chart-title"><i className="fa-solid fa-chart-pie" /> Action breakdown</h3>
          {breakdown.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No actions recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {breakdown.map(([action, count]) => {
                const color = ACTION_COLORS[action] ?? '#64748b';
                const pct = totalActions > 0 ? Math.round((count / totalActions) * 100) : 0;
                return (
                  <div key={action}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color }}>{action}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{count} <span style={{ opacity: 0.6 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h3 className="analytics-chart-title"><i className="fa-solid fa-shield" /> Top Moderators</h3>
          {!stats.topModerators?.length ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {stats.topModerators.map((mod, i) => {
                const maxCount = stats.topModerators[0]?.count ?? 1;
                const pct = Math.round((mod.count / maxCount) * 100);
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={mod.id ?? i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {medals[i] ?? `#${i + 1}`}
                        <img
                          src={mod.avatar ? `https://cdn.discordapp.com/avatars/${mod.id}/${mod.avatar}.png?size=32` : 'https://cdn.discordapp.com/embed/avatars/0.png'}
                          alt="" style={{ width: 22, height: 22, borderRadius: '50%' }}
                        />
                        {mod.username ?? mod.id}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{mod.count} actions</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #5865F2, #ff66b2)', borderRadius: 4, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top targets */}
      {stats.topTargets?.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h3 className="analytics-chart-title"><i className="fa-solid fa-user-xmark" /> Most sanctioned users</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 8 }}>
            {stats.topTargets.map((target, i) => (
              <div key={target.id ?? i} className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={target.avatar ? `https://cdn.discordapp.com/avatars/${target.id}/${target.avatar}.png?size=32` : 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt="" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {target.username ?? target.id}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#ff4444' }}>{target.count} sanctions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
