import React, { useEffect, useRef, useState } from 'react';

const PAGES = [
  { key: 'overview',    label: 'Dashboard Overview',    icon: 'fa-chart-pie',       desc: 'Stats & moderation charts' },
  { key: 'analytics',   label: 'Analytics',             icon: 'fa-chart-area',      desc: 'Charts & trends' },
  { key: 'moderation',  label: 'Server Moderation',     icon: 'fa-gavel',           desc: 'Mod logs & cases' },
  { key: 'automod',     label: 'Auto Moderation',       icon: 'fa-shield-halved',   desc: 'Automod rules & filters' },
  { key: 'members',     label: 'Members',               icon: 'fa-users',           desc: 'Profiles & repeat offenders' },
  { key: 'notifications', label: 'Notifications',       icon: 'fa-bell',            desc: 'Live activity feed' },
  { key: 'audit',       label: 'Audit Log',             icon: 'fa-scroll',          desc: 'Filtered history' },
  { key: 'commands',    label: 'Command Center',        icon: 'fa-terminal',        desc: 'Browse all bot commands' },
  { key: 'docs',        label: 'Docs & Guides',         icon: 'fa-book',            desc: 'Documentation' },
  { key: 'status',      label: 'Bot Status',            icon: 'fa-signal',          desc: 'API & uptime checks' },
  { key: 'account',     label: 'Account Manager',       icon: 'fa-user-gear',       desc: 'Profile & settings' },
];

export default function GlobalSearch({ open, onClose, setActivePage }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const q = query.toLowerCase();
  const results = PAGES.filter(p =>
    p.label.toLowerCase().includes(q) ||
    p.desc.toLowerCase().includes(q) ||
    p.key.toLowerCase().includes(q)
  );

  const navigate = (key) => {
    setActivePage(key);
    try { localStorage.setItem('zenith_active_page', key); } catch {}
    onClose();
  };

  return (
    <div
      className="modal-overlay global-search-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="global-search-card glass-panel pop-in">
        <div className="global-search-input-wrap">
          <i className="fa-solid fa-magnifying-glass global-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="global-search-input"
            placeholder="Search pages, commands…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results.length > 0) navigate(results[0].key);
            }}
          />
          <kbd className="global-search-esc-hint">Esc</kbd>
        </div>

        <div className="global-search-results">
          {results.length === 0 ? (
            <p className="global-search-empty">No results for "<strong>{query}</strong>"</p>
          ) : (
            results.map(p => (
              <button
                key={p.key}
                className="global-search-result"
                onClick={() => navigate(p.key)}
              >
                <i className={`fa-solid ${p.icon} global-search-result-icon`} />
                <div>
                  <div className="global-search-result-label">{p.label}</div>
                  <div className="global-search-result-desc">{p.desc}</div>
                </div>
                <i className="fa-solid fa-arrow-right global-search-result-arrow" />
              </button>
            ))
          )}
        </div>

        <div className="global-search-footer">
          <span><kbd>↵</kbd> to navigate</span>
          <span><kbd>Esc</kbd> to close</span>
          <span><kbd>Ctrl K</kbd> to toggle</span>
        </div>
      </div>
    </div>
  );
}
