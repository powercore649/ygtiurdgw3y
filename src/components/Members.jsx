import React, { useState, useEffect, useMemo } from 'react';
import { toast } from './ToastSystem';

const ACTION_COLORS = {
  BAN:     { color: '#ff4444', bg: 'rgba(255,68,68,0.12)' },
  WARN:    { color: '#ffbb33', bg: 'rgba(255,187,51,0.12)' },
  MUTE:    { color: '#ff66b2', bg: 'rgba(255,102,178,0.12)' },
  KICK:    { color: '#ff8800', bg: 'rgba(255,136,0,0.12)' },
  TIMEOUT: { color: '#e67e22', bg: 'rgba(230,126,34,0.12)' },
  UNMUTE:  { color: '#00C851', bg: 'rgba(0,200,81,0.12)' },
  UNBAN:   { color: '#33b5e5', bg: 'rgba(51,181,229,0.12)' },
};

function getActionStyle(action) {
  return ACTION_COLORS[action?.toUpperCase()] || { color: '#64748b', bg: 'rgba(100,116,139,0.12)' };
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function MemberCard({ member, onViewCases }) {
  const latest = member.cases[0];
  const style = getActionStyle(latest?.action);
  const sanctionCount = member.cases.length;
  const severity = sanctionCount >= 5 ? 'high' : sanctionCount >= 2 ? 'medium' : 'low';
  const severityColors = { high: '#ff4444', medium: '#ffbb33', low: '#00C851' };

  return (
    <div className="member-card glass-panel">
      <div className="member-card-header">
        <img
          src={member.avatar
            ? `https://cdn.discordapp.com/avatars/${member.targetId}/${member.avatar}.png?size=64`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(member.targetId?.slice(-1) || 0) % 6}.png`}
          alt=""
          className="member-card-avatar"
          onError={e => { e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
        />
        <div className="member-card-info">
          <h4 className="member-card-name">{member.targetTag || `User ${member.targetId?.slice(-4)}`}</h4>
          <span className="member-card-id">ID {member.targetId}</span>
        </div>
        <div className="member-card-badge" style={{ background: severityColors[severity] + '22', color: severityColors[severity], border: `1px solid ${severityColors[severity]}44` }}>
          {sanctionCount} sanction{sanctionCount > 1 ? 's' : ''}
        </div>
      </div>

      <div className="member-card-actions">
        {member.cases.slice(0, 4).map((c, i) => {
          const s = getActionStyle(c.action);
          return (
            <span key={i} className="member-action-chip" style={{ background: s.bg, color: s.color }}>
              {c.action}
            </span>
          );
        })}
        {member.cases.length > 4 && (
          <span className="member-action-chip" style={{ background: 'rgba(255,255,255,0.06)', color: '#949ba4' }}>
            +{member.cases.length - 4}
          </span>
        )}
      </div>

      {latest && (
        <div className="member-card-latest">
          <i className="fa-solid fa-clock" style={{ color: '#949ba4', fontSize: '0.75rem' }} />
          <span>Dernière action : <strong style={{ color: getActionStyle(latest.action).color }}>{latest.action}</strong></span>
          <span style={{ marginLeft: 'auto', color: '#949ba4', fontSize: '0.75rem' }}>{timeAgo(latest.createdAt)}</span>
        </div>
      )}

      <button className="member-card-btn" onClick={() => onViewCases(member)}>
        <i className="fa-solid fa-folder-open" /> View cases ({sanctionCount})
      </button>
    </div>
  );
}

function CaseModal({ member, onClose }) {
  if (!member) return null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card glass-panel pop-in" style={{ maxWidth: 600, width: '100%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={member.avatar
                ? `https://cdn.discordapp.com/avatars/${member.targetId}/${member.avatar}.png?size=64`
                : 'https://cdn.discordapp.com/embed/avatars/0.png'}
              alt=""
              style={{ width: 40, height: 40, borderRadius: '50%' }}
            />
            <div>
              <h3 style={{ margin: 0 }}>{member.targetTag}</h3>
              <span style={{ fontSize: '0.78rem', color: '#949ba4' }}>ID {member.targetId}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: 420, overflowY: 'auto' }}>
          {member.cases.map((c, i) => {
            const s = getActionStyle(c.action);
            return (
              <div key={i} className="case-row glass-panel" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="member-action-chip" style={{ background: s.bg, color: s.color }}>{c.action}</span>
                  <span style={{ fontSize: '0.75rem', color: '#949ba4' }}>Case #{c.caseId} · {timeAgo(c.createdAt)}</span>
                </div>
                {c.reason && <p style={{ margin: 0, fontSize: '0.85rem', color: '#dbdee1' }}>{c.reason}</p>}
                {c.moderatorTag && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#949ba4' }}>
                    <i className="fa-solid fa-shield" /> Moderated by {c.moderatorTag}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Members({ selectedGuild }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('sanctions');
  const [filter, setFilter] = useState('All');
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    if (!selectedGuild) return;
    fetchCases();
  }, [selectedGuild]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('zenith_token');
      const res = await fetch(`/api/moderation/${selectedGuild}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setCases(await res.json());
    } catch (e) {
      console.error('[Members]', e);
      setError('Unable to load members.');
    } finally {
      setLoading(false);
    }
  };

  // Group cases by targetId
  const members = useMemo(() => {
    const map = new Map();
    for (const c of cases) {
      if (!map.has(c.targetId)) {
        map.set(c.targetId, {
          targetId: c.targetId,
          targetTag: c.targetTag,
          avatar: c.targetAvatar,
          cases: [],
        });
      }
      map.get(c.targetId).cases.push(c);
    }
    let arr = Array.from(map.values());

    // Sort by date descending within each member
    arr.forEach(m => m.cases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

    // Filter by action type
    if (filter !== 'All') {
      arr = arr.filter(m => m.cases.some(c => c.action?.toUpperCase() === filter));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(m =>
        m.targetTag?.toLowerCase().includes(q) ||
        m.targetId?.includes(q)
      );
    }

    // Sort
    if (sort === 'sanctions') arr.sort((a, b) => b.cases.length - a.cases.length);
    else if (sort === 'recent') arr.sort((a, b) => new Date(b.cases[0]?.createdAt) - new Date(a.cases[0]?.createdAt));

    return arr;
  }, [cases, filter, search, sort]);

  const actionTypes = useMemo(() => {
    const s = new Set();
    cases.forEach(c => c.action && s.add(c.action.toUpperCase()));
    return ['All', ...Array.from(s).sort()];
  }, [cases]);

  const stats = useMemo(() => ({
    total: members.length,
    banned: members.filter(m => m.cases.some(c => c.action?.toUpperCase() === 'BAN')).length,
    warned: members.filter(m => m.cases.some(c => c.action?.toUpperCase() === 'WARN')).length,
    repeat: members.filter(m => m.cases.length >= 3).length,
  }), [members]);

  if (loading) return <div className="loader">Loading members…</div>;

  if (error) return (
    <div className="glass-panel" style={{ padding: 32, textAlign: 'center' }}>
      <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '2rem', marginBottom: 12, color: '#ff4444' }} />
      <p style={{ color: '#ff4444', marginBottom: 16 }}>{error}</p>
      <button className="btn-secondary" onClick={fetchCases}><i className="fa-solid fa-rotate-right" /> Réessayer</button>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="command-hero glass-panel">
        <div>
          <p className="command-eyebrow">Moderation History</p>
          <h2 className="glow-text">Sanctioned Members</h2>
          <p className="subtitle">All users who have received at least one sanction on this server.</p>
        </div>
        <div className="command-hero-stats">
          <div className="command-stat-chip"><strong style={{ color: '#ff66b2' }}>{stats.total}</strong><span>Members</span></div>
          <div className="command-stat-chip"><strong style={{ color: '#ff4444' }}>{stats.banned}</strong><span>Banned</span></div>
          <div className="command-stat-chip"><strong style={{ color: '#ffbb33' }}>{stats.warned}</strong><span>Warned</span></div>
          <div className="command-stat-chip"><strong style={{ color: '#ff8800' }}>{stats.repeat}</strong><span>Repeat Offenders</span></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel analytics-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#949ba4', fontSize: '0.85rem' }} />
          <input
            type="text"
            placeholder="Search for a member..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 32, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px 8px 32px', color: 'var(--text-primary, #dbdee1)', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none' }}
          />
        </div>

        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary, #dbdee1)', fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary, #dbdee1)', fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          <option value="sanctions">Most Sanctioned</option>
          <option value="recent">Most Recent</option>
        </select>

        <button className="btn-icon" onClick={fetchCases} title="Actualiser" style={{ marginLeft: 'auto' }}>
          <i className="fa-solid fa-rotate-right" />
        </button>
      </div>

      {/* Results count */}
      <p style={{ color: '#949ba4', fontSize: '0.82rem', margin: 0 }}>
        {members.length} membre{members.length !== 1 ? 's' : ''} found{members.length !== 1 ? 's' : ''}
        {search && ` for "${search}"`}
      </p>

      {/* Grid */}
      {members.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
          <i className="fa-solid fa-users-slash" style={{ fontSize: '2.5rem', color: '#949ba4', marginBottom: 12 }} />
          <p style={{ color: '#949ba4' }}>No members found.</p>
        </div>
      ) : (
        <div className="members-grid">
          {members.map(m => (
            <MemberCard key={m.targetId} member={m} onViewCases={setSelectedMember} />
          ))}
        </div>
      )}

      <CaseModal member={selectedMember} onClose={() => setSelectedMember(null)} />
    </div>
  );
}
