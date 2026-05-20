import React, { useCallback, useEffect, useMemo, useState } from 'react';

const STATUS_ENDPOINTS = [
  '/api/meta/status',
  '/api/bot/status',
  '/api/status',
  '/api/health'
];

function authHeaders() {
  const token = localStorage.getItem('zenith_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function timedFetch(url, options = {}) {
  const t0 = performance.now();
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    return { res: null, ms: Math.round(performance.now() - t0), error: e };
  }
  const ms = Math.round(performance.now() - t0);
  return { res, ms, error: null };
}

async function readJsonOrText(res) {
  if (!res) return { json: null, text: null };
  const text = await res.text();
  if (!text.trim()) return { json: null, text: null };
  try {
    return { json: JSON.parse(text), text: null };
  } catch {
    return { json: null, text: text.trim() };
  }
}

function formatMetricLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_.]/g, ' ')
    .replace(/^\s+/, '')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function rowsFromStatusPayload(json) {
  if (!json || typeof json !== 'object') return [];
  if (Array.isArray(json)) {
    return [{ key: 'Response', value: JSON.stringify(json) }];
  }
  const rows = [];
  for (const [k, v] of Object.entries(json)) {
    if (v === null || v === undefined) {
      rows.push({ key: k, value: '—' });
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      rows.push({ key: k, value: JSON.stringify(v) });
    } else if (Array.isArray(v)) {
      rows.push({
        key: k,
        value: v.length > 8 ? `${v.length} entries` : JSON.stringify(v)
      });
    } else {
      rows.push({ key: k, value: String(v) });
    }
  }
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

export default function BotStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  const [statusSource, setStatusSource] = useState(null);
  const [statusPayload, setStatusPayload] = useState(null);

  const [commandsOk, setCommandsOk] = useState(false);
  const [commandsMs, setCommandsMs] = useState(null);
  const [commandsMeta, setCommandsMeta] = useState(null);

  const [profileOk, setProfileOk] = useState(false);
  const [profileMs, setProfileMs] = useState(null);
  const [profileSummary, setProfileSummary] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const headers = { ...authHeaders() };

    try {
      setStatusSource(null);
      setStatusPayload(null);

      for (const url of STATUS_ENDPOINTS) {
        const { res, ms } = await timedFetch(url, { headers });
        if (res && res.ok) {
          const { json, text } = await readJsonOrText(res);
          if (json !== null && typeof json === 'object') {
            setStatusSource(`${url} · ${ms} ms`);
            setStatusPayload(json);
            break;
          }
          if (text) {
            setStatusSource(`${url} · ${ms} ms`);
            setStatusPayload({ status: text });
            break;
          }
        }
      }

      const cmd = await timedFetch('/api/meta/commands', { headers });
      setCommandsMs(cmd.ms);
      if (cmd.res && cmd.res.ok) {
        setCommandsOk(true);
        setCommandsMeta(await cmd.res.json());
      } else {
        setCommandsOk(false);
        setCommandsMeta(null);
      }

      const prof = await timedFetch('/api/account/profile', { headers });
      setProfileMs(prof.ms);
      if (prof.res && prof.res.ok) {
        setProfileOk(true);
        const body = await prof.res.json();
        setProfileSummary({
          id: body.id,
          username: body.username,
          global_name: body.global_name
        });
      } else {
        setProfileOk(false);
        setProfileSummary(null);
      }

      setRefreshedAt(new Date());
    } catch (e) {
      console.error('[BotStatus]', e);
      setError('Could not reach the control API. Check your connection or proxy configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusRows = useMemo(() => rowsFromStatusPayload(statusPayload), [statusPayload]);

  const overallHealthy = commandsOk;

  return (
    <div className="bot-status-page animate-fade-in">
      <div className="command-hero glass-panel status-hero">
        <div>
          <p className="command-eyebrow">Live infrastructure</p>
          <h2 className="glow-text">Bot &amp; API status</h2>
          <p className="subtitle">
            Data is read from the same backend as the dashboard (proxied <code className="status-inline-code">/api</code>
            ). Command counts and latency reflect real responses, not mock values.
          </p>
          {refreshedAt && (
            <p className="status-refreshed">
              Last check: {refreshedAt.toLocaleString()}
            </p>
          )}
          <button type="button" className="btn-secondary status-refresh-inline" onClick={load} disabled={loading}>
            <i className="fa-solid fa-rotate-right" /> Refresh
          </button>
        </div>
        <div className="command-hero-stats">
          <div className="command-stat-chip">
            <strong className={overallHealthy ? 'status-ok' : 'status-bad'}>
              {overallHealthy ? 'Operational' : 'Degraded'}
            </strong>
            <span>Meta API</span>
          </div>
          <div className="command-stat-chip">
            <strong>{commandsMs != null ? `${commandsMs} ms` : '—'}</strong>
            <span>/api/meta/commands</span>
          </div>
          <div className="command-stat-chip">
            <strong>{profileMs != null ? `${profileMs} ms` : '—'}</strong>
            <span>/api/account/profile</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-panel status-banner status-banner-error">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {loading && <div className="loader">Probing bot and API endpoints…</div>}

      {!loading && (
        <>
          <div className="status-grid-two">
            <section className="glass-panel status-panel">
              <h3 className="status-panel-title">
                <i className="fa-solid fa-robot" /> Bot runtime snapshot
              </h3>
              {statusSource ? (
                <>
                  <p className="status-panel-source">{statusSource}</p>
                  {statusRows.length > 0 ? (
                    <dl className="status-dl">
                      {statusRows.map(({ key, value }) => (
                        <div key={key} className="status-dl-row">
                          <dt>{formatMetricLabel(key)}</dt>
                          <dd title={value}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="status-muted">Empty payload from status endpoint.</p>
                  )}
                </>
              ) : (
                <p className="status-muted">
                  No dedicated status route answered with HTTP 200 among{' '}
                  <code className="status-inline-code">{STATUS_ENDPOINTS.join(', ')}</code>.
                  If your bot exposes one (for example <code className="status-inline-code">/api/meta/status</code>),
                  add it on the server and it will appear here automatically. The sections below still use live API data.
                </p>
              )}
            </section>

            <section className="glass-panel status-panel">
              <h3 className="status-panel-title">
                <i className="fa-solid fa-plug" /> Control API checks
              </h3>
              <dl className="status-dl">
                <div className="status-dl-row">
                  <dt>Command metadata</dt>
                  <dd>
                    {commandsOk ? (
                      <span className="status-ok">
                        <i className="fa-solid fa-check" /> OK
                      </span>
                    ) : (
                      <span className="status-bad">
                        <i className="fa-solid fa-xmark" /> Failed
                      </span>
                    )}
                  </dd>
                </div>
                {commandsMeta && (
                  <>
                    <div className="status-dl-row">
                      <dt>Commands registered</dt>
                      <dd>{commandsMeta.total ?? '—'}</dd>
                    </div>
                    <div className="status-dl-row">
                      <dt>Slash-capable</dt>
                      <dd>{commandsMeta.slashCount ?? '—'}</dd>
                    </div>
                    <div className="status-dl-row">
                      <dt>Categories</dt>
                      <dd>{commandsMeta.categories ? Object.keys(commandsMeta.categories).length : '—'}</dd>
                    </div>
                  </>
                )}
                <div className="status-dl-row">
                  <dt>Account profile</dt>
                  <dd>
                    {profileOk ? (
                      <span className="status-ok">
                        <i className="fa-solid fa-check" /> OK
                      </span>
                    ) : (
                      <span className="status-bad">
                        <i className="fa-solid fa-xmark" /> Failed
                      </span>
                    )}
                  </dd>
                </div>
                {profileSummary && (
                  <div className="status-dl-row">
                    <dt>Linked Discord user</dt>
                    <dd>
                      {profileSummary.global_name || profileSummary.username}
                      {profileSummary.username ? (
                        <span className="status-muted"> @{profileSummary.username}</span>
                      ) : null}
                      {profileSummary.id ? (
                        <span className="status-muted"> · id {profileSummary.id}</span>
                      ) : null}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
