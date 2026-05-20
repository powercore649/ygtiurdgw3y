import React, { useState, useEffect, useMemo, useRef } from 'react';

const ACTION_COLORS = {
  BAN:     '#ff4444', WARN: '#ffbb33', MUTE: '#ff66b2',
  KICK:    '#ff8800', TIMEOUT: '#e67e22', UNMUTE: '#00C851',
  UNBAN:   '#33b5e5', PURGE: '#aa66cc', MASSBAN: '#cc0000',
};

function chip(action) {
  const color = ACTION_COLORS[action?.toUpperCase()] || '#64748b';
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 5, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.03em',
    }}>
      {action}
    </span>
  );
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function AuditLog({ selectedGuild }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [moderatorFilter, setModeratorFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const [expanded, setExpanded] = useState(null);

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
      setError('Impossible de charger l\'audit log.');
    } finally {
      setLoading(false);
    }
  };

  const actionTypes = useMemo(() =>
    ['All', ...Array.from(new Set(cases.map(c => c.action?.toUpperCase()).filter(Boolean))).sort()],
    [cases]);

  const moderators = useMemo(() =>
    ['All', ...Array.from(new Set(cases.map(c => c.moderatorTag).filter(Boolean))).sort()],
    [cases]);

  const filtered = useMemo(() => {
    let arr = [...cases];

    if (actionFilter !== 'All') arr = arr.filter(c => c.action?.toUpperCase() === actionFilter);
    if (moderatorFilter !== 'All') arr = arr.filter(c => c.moderatorTag === moderatorFilter);
    if (dateFrom) arr = arr.filter(c => new Date(c.createdAt) >= new Date(dateFrom));
    if (dateTo)   arr = arr.filter(c => new Date(c.createdAt) <= new Date(dateTo + 'T23:59:59'));

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(c =>
        c.targetTag?.toLowerCase().includes(q) ||
        c.targetId?.includes(q) ||
        c.moderatorTag?.toLowerCase().includes(q) ||
        c.reason?.toLowerCase().includes(q) ||
        String(c.caseId).includes(q)
      );
    }

    if (sort === 'newest') arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'oldest') arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sort === 'caseId') arr.sort((a, b) => (b.caseId || 0) - (a.caseId || 0));

    return arr;
  }, [cases, actionFilter, moderatorFilter, dateFrom, dateTo, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, actionFilter, moderatorFilter, dateFrom, dateTo, sort]);

  const resetFilters = () => {
    setSearch(''); setActionFilter('All'); setModeratorFilter('All');
    setDateFrom(''); setDateTo(''); setSort('newest');
  };

  if (loading) return <div className="loader">Loading audit log…</div>;

  if (error) return (
    <div className="glass-panel" style={{ padding: 32, textAlign: 'center' }}>
      <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '2rem', color: '#ff4444', marginBottom: 12 }} />
      <p style={{ color: '#ff4444' }}>{error}</p>
      <button className="btn-secondary" onClick={fetchCases} style={{ marginTop: 12 }}>
        <i className="fa-solid fa-rotate-right" /> Retry
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="command-hero glass-panel">
        <div>
          <p className="command-eyebrow">Complete History</p>
          <h2 className="glow-text">Audit Log</h2>
          <p className="subtitle">All moderation actions with advanced filters, sorting and pagination.</p>
        </div>
        <div className="command-hero-stats">
          <div className="command-stat-chip">
            <strong style={{ color: '#ff66b2' }}>{cases.length}</strong>
            <span>Total cases</span>
          </div>
          <div className="command-stat-chip">
            <strong style={{ color: '#ffbb33' }}>{filtered.length}</strong>
            <span>Filtered</span>
          </div>
          <div className="command-stat-chip">
            <strong style={{ color: '#33b5e5' }}>{moderators.length - 1}</strong>
            <span>Moderators</span>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#949ba4', fontSize: '0.82rem' }} />
          <input
            type="text"
            placeholder="Search (user, reason, case ID…)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="audit-input"
            style={{ paddingLeft: 30 }}
          />
        </div>

        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="audit-select">
          {actionTypes.map(a => <option key={a} value={a}>{a === 'All' ? 'All actions' : a}</option>)}
        </select>

        <select value={moderatorFilter} onChange={e => setModeratorFilter(e.target.value)} className="audit-select">
          {moderators.map(m => <option key={m} value={m}>{m === 'All' ? 'All moderators' : m}</option>)}
        </select>

        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="audit-input audit-date" title="Start date" />
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="audit-input audit-date" title="End date" />

        <select value={sort} onChange={e => setSort(e.target.value)} className="audit-select">
          <option value="newest">Most recent</option>
          <option value="oldest">Oldest first</option>
          <option value="caseId">Case ID ↓</option>
        </select>

        <button className="btn-secondary" onClick={resetFilters} style={{ fontSize: '0.82rem', padding: '7px 12px' }}>
          <i className="fa-solid fa-xmark" /> Reset
        </button>

        <button className="btn-icon" onClick={fetchCases} title="Refresh" style={{ marginLeft: 'auto' }}>
          <i className="fa-solid fa-rotate-right" />
        </button>
      </div>

      {/* Results */}
      <p style={{ color: '#949ba4', fontSize: '0.8rem', margin: 0 }}>
        {filtered.length} result{filtered.length !== 1 ? 's' : ''} · Page {page}/{totalPages}
      </p>

      {/* Table */}
      <div className="glass-panel audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Action</th>
              <th>User</th>
              <th>Moderator</th>
              <th>Reason</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: '#949ba4' }}>
                  No results for these filters.
                </td>
              </tr>
            ) : paginated.map((c, i) => (
              <React.Fragment key={c._id || c.caseId || i}>
                <tr
                  className={`audit-row ${expanded === (c._id || c.caseId) ? 'audit-row--expanded' : ''}`}
                  onClick={() => setExpanded(prev => prev === (c._id || c.caseId) ? null : (c._id || c.caseId))}
                >
                  <td style={{ color: '#949ba4', fontSize: '0.78rem' }}>#{c.caseId || '—'}</td>
                  <td>{chip(c.action)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img
                        src={c.targetAvatar
                          ? `https://cdn.discordapp.com/avatars/${c.targetId}/${c.targetAvatar}.png?size=32`
                          : `https://cdn.discordapp.com/embed/avatars/0.png`}
                        alt=""
                        style={{ width: 22, height: 22, borderRadius: '50%' }}
                        onError={e => { e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
                      />
                      <span style={{ fontSize: '0.85rem' }}>{c.targetTag || c.targetId}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#949ba4' }}>{c.moderatorTag || '—'}</td>
                  <td style={{ fontSize: '0.82rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.reason || <span style={{ opacity: 0.4 }}>No reason</span>}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#949ba4', whiteSpace: 'nowrap' }}>{fmt(c.createdAt)}</td>
                  <td>
                    <i className={`fa-solid fa-chevron-${expanded === (c._id || c.caseId) ? 'up' : 'down'}`}
                       style={{ color: '#949ba4', fontSize: '0.75rem' }} />
                  </td>
                </tr>
                {expanded === (c._id || c.caseId) && (
                  <tr className="audit-expanded-row">
                    <td colSpan={7}>
                      <div className="audit-expanded-body">
                        <div><span className="audit-expanded-label">User ID</span><span>{c.targetId || '—'}</span></div>
                        <div><span className="audit-expanded-label">Mod ID</span><span>{c.moderatorId || '—'}</span></div>
                        <div><span className="audit-expanded-label">Full reason</span><span>{c.reason || 'No reason provided'}</span></div>
                        {c.duration && <div><span className="audit-expanded-label">Duration</span><span>{c.duration}</span></div>}
                        {c.expiresAt && <div><span className="audit-expanded-label">Expires</span><span>{fmt(c.expiresAt)}</span></div>}
                        <div><span className="audit-expanded-label">Full date</span><span>{fmt(c.createdAt)}</span></div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="audit-pagination">
          <button className="analytics-range-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="analytics-range-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(totalPages - 6, page - 3)) + i;
            return (
              <button
                key={p}
                className={`analytics-range-btn${p === page ? ' active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            );
          })}
          <button className="analytics-range-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          <button className="analytics-range-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}
    </div>
  );
}
