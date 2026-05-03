import { useEffect, useState } from 'react';
import { getAuditLogs } from '../api/auditApi';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

const DiffViewer = ({ diff }) => {
  if (!diff?.before && !diff?.after) return null;
  return (
    <div className="diff-wrap" style={{ marginTop: '0.75rem' }}>
      <div className="diff-before">
        <div className="diff-label">Before</div>
        <pre>{JSON.stringify(diff.before, null, 2)}</pre>
      </div>
      <div className="diff-after">
        <div className="diff-label">After</div>
        <pre>{JSON.stringify(diff.after, null, 2)}</pre>
      </div>
    </div>
  );
};

const LogRow = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = log.diff?.before || log.diff?.after;

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '0.9rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Action badge */}
        <span className={`action-badge action-${log.action}`} style={{ minWidth: 60, textAlign: 'center' }}>
          {log.action}
        </span>

        {/* Resource */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--t1)', fontFamily: 'monospace' }}>
            {log.resourceName || '—'}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--t3)', marginLeft: '0.5rem' }}>{log.resourceType}</span>
        </div>

        {/* User */}
        <div style={{ fontSize: '0.78rem', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
          <div className="avatar" style={{ width: 20, height: 20, fontSize: '0.55rem' }}>
            {(log.userId?.email || '?').slice(0,2).toUpperCase()}
          </div>
          {log.userId?.email || 'System'}
        </div>

        {/* Time */}
        <div style={{ fontSize: '0.75rem', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
          <Clock size={11} />
          {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Expand */}
        {hasDiff && (
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(v => !v)} style={{ padding: '0.25rem' }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {expanded && hasDiff && <DiffViewer diff={log.diff} />}
    </div>
  );
};

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'TOGGLE'];

const AuditPage = () => {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterAction, setFilter] = useState('');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);

  const LIMIT = 20;

  const load = () => {
    setLoading(true);
    getAuditLogs({ limit: LIMIT, page, action: filterAction || undefined })
      .then(r => { setLogs(r.data.logs); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [filterAction]);
  useEffect(() => { load(); }, [page, filterAction]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="ph">
        <div>
          <h1>Audit Logs</h1>
          <div className="ph-sub">{total} total event{total !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="tabs" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab${filterAction === '' ? ' active' : ''}`} onClick={() => setFilter('')}>All</button>
        {ACTIONS.map(a => (
          <button key={a} className={`tab${filterAction === a ? ' active' : ''}`} onClick={() => setFilter(a)}>{a}</button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--t3)' }}>
            <div style={{ fontSize: '2rem', opacity: 0.4, marginBottom: '0.75rem' }}>📋</div>
            No audit events found
          </div>
        ) : (
          <>
            {logs.map(log => <LogRow key={log._id} log={log} />)}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: '0.82rem', color: 'var(--t3)' }}>Page {page} of {pages}</span>
                <button className="btn btn-secondary btn-sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditPage;
