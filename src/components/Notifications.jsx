import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from './ToastSystem';

const ACTION_META = {
  BAN:     { icon: 'fa-ban',               color: '#ff4444', label: 'Ban' },
  WARN:    { icon: 'fa-triangle-exclamation', color: '#ffbb33', label: 'Warn' },
  MUTE:    { icon: 'fa-microphone-slash',  color: '#ff66b2', label: 'Mute' },
  KICK:    { icon: 'fa-boot',              color: '#ff8800', label: 'Kick' },
  TIMEOUT: { icon: 'fa-clock',             color: '#e67e22', label: 'Timeout' },
  UNMUTE:  { icon: 'fa-microphone',        color: '#00C851', label: 'Unmute' },
  UNBAN:   { icon: 'fa-circle-check',      color: '#33b5e5', label: 'Unban' },
  PURGE:   { icon: 'fa-trash',             color: '#aa66cc', label: 'Purge' },
  MASSBAN: { icon: 'fa-skull',             color: '#cc0000', label: 'Massban' },
};

function getActionMeta(action) {
  return ACTION_META[action?.toUpperCase()] || { icon: 'fa-circle-dot', color: '#64748b', label: action || '?' };
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

function NotifItem({ item, isNew }) {
  const meta = getActionMeta(item.action);
  return (
    <div className={`notif-item glass-panel ${isNew ? 'notif-item--new' : ''}`}>
      <div className="notif-item-icon" style={{ background: meta.color + '22', color: meta.color }}>
        <i className={`fa-solid ${meta.icon}`} />
      </div>
      <div className="notif-item-body">
        <div className="notif-item-title">
          <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
          {' — '}
          <span>{item.targetTag || item.targetId}</span>
        </div>
        {item.reason && <p className="notif-item-reason">{item.reason}</p>}
        <div className="notif-item-meta">
          {item.moderatorTag && (
            <span><i className="fa-solid fa-shield" style={{ opacity: 0.6 }} /> {item.moderatorTag}</span>
          )}
          <span className="notif-item-time">{timeAgo(item.createdAt)}</span>
          {item.caseId && <span style={{ opacity: 0.5, fontSize: '0.72rem' }}>Case #{item.caseId}</span>}
        </div>
      </div>
      {isNew && <span className="notif-item-badge">NOUVEAU</span>}
    </div>
  );
}

export default function Notifications({ selectedGuild }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [newIds, setNewIds] = useState(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(30);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const knownIds = useRef(new Set());

  const fetchCases = useCallback(async (silent = false) => {
    if (!selectedGuild) return;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const token = localStorage.getItem('zenith_token');
      const res = await fetch(`/api/moderation/${selectedGuild}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      // Detect genuinely new entries
      const freshIds = new Set();
      if (knownIds.current.size > 0) {
        for (const c of data) {
          const id = c._id || c.caseId;
          if (id && !knownIds.current.has(id)) {
            freshIds.add(id);
          }
        }
        if (freshIds.size > 0) {
          toast(`${freshIds.size} nouvelle${freshIds.size > 1 ? 's' : ''} action${freshIds.size > 1 ? 's' : ''} de modération`, 'info');
          setNewIds(prev => new Set([...prev, ...freshIds]));
          setTimeout(() => setNewIds(new Set()), 8000);
        }
      }
      for (const c of data) {
        const id = c._id || c.caseId;
        if (id) knownIds.current.add(id);
      }

      setCases(data);
      setLastFetch(new Date());
      setNextRefresh(30);
    } catch (e) {
      console.error('[Notifications]', e);
      if (!silent) setError('Unable to load notifications.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedGuild]);

  // Initial fetch
  useEffect(() => {
    knownIds.current = new Set();
    fetchCases();
  }, [fetchCases]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
      return;
    }
    timerRef.current = setInterval(() => fetchCases(true), 30000);
    countdownRef.current = setInterval(() => {
      setNextRefresh(n => n <= 1 ? 30 : n - 1);
    }, 1000);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [autoRefresh, fetchCases]);

  const actionTypes = ['All', ...Array.from(new Set(cases.map(c => c.action?.toUpperCase()).filter(Boolean))).sort()];

  const filtered = cases.filter(c =>
    filter === 'All' || c.action?.toUpperCase() === filter
  );

  // Stats
  const todayCount = cases.filter(c => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  if (loading) return <div className="loader">Loading notifications…</div>;

  if (error) return (
    <div className="glass-panel" style={{ padding: 32, textAlign: 'center' }}>
      <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '2rem', color: '#ff4444', marginBottom: 12 }} />
      <p style={{ color: '#ff4444' }}>{error}</p>
      <button className="btn-secondary" onClick={() => fetchCases()} style={{ marginTop: 12 }}>
        <i className="fa-solid fa-rotate-right" /> Retry
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="command-hero glass-panel">
        <div>
          <p className="command-eyebrow">
            Live Feed
            {autoRefresh && <span style={{ marginLeft: 10, color: '#00C851', fontSize: '0.75rem' }}>● Refresh dans {nextRefresh}s</span>}
          </p>
          <h2 className="glow-text">Notifications</h2>
          <p className="subtitle">All moderation actions de ton serveur, in real-time.</p>
        </div>
        <div className="command-hero-stats">
          <div className="command-stat-chip">
            <strong style={{ color: '#ff66b2' }}>{cases.length}</strong>
            <span>Total</span>
          </div>
          <div className="command-stat-chip">
            <strong style={{ color: '#ffbb33' }}>{todayCount}</strong>
            <span>Today</span>
          </div>
          <div className="command-stat-chip">
            <strong style={{ color: '#00C851' }}>{newIds.size}</strong>
            <span>New</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel analytics-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        {actionTypes.map(a => (
          <button
            key={a}
            className={`analytics-range-btn${filter === a ? ' active' : ''}`}
            onClick={() => setFilter(a)}
            style={{ fontSize: '0.78rem' }}
          >
            {a}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className={`analytics-range-btn${autoRefresh ? ' active' : ''}`}
            onClick={() => setAutoRefresh(v => !v)}
            title="Auto-refresh every 30s"
          >
            <i className={`fa-solid fa-rotate${autoRefresh ? ' fa-spin' : ''}`} style={{ animationDuration: '3s' }} />
            {autoRefresh ? ' Live' : ' Paused'}
          </button>
          <button className="btn-icon" onClick={() => fetchCases()} title="Refresh maintenant">
            <i className="fa-solid fa-rotate-right" />
          </button>
        </div>
      </div>

      {/* Last fetch info */}
      {lastFetch && (
        <p style={{ color: '#949ba4', fontSize: '0.78rem', margin: 0 }}>
          Last updated : {lastFetch.toLocaleTimeString('fr-FR')} · {filtered.length} action{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Feed */}
      <div className="notif-feed">
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
            <i className="fa-solid fa-bell-slash" style={{ fontSize: '2.5rem', color: '#949ba4', marginBottom: 12 }} />
            <p style={{ color: '#949ba4' }}>No notifications for this filter.</p>
          </div>
        ) : (
          filtered.map(item => {
            const id = item._id || item.caseId;
            return <NotifItem key={id || Math.random()} item={item} isNew={newIds.has(id)} />;
          })
        )}
      </div>
    </div>
  );
}
