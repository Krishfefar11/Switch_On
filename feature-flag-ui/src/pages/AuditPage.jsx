import { useEffect, useState } from 'react';
import { getAuditLogs } from '../api/auditApi';
import { ChevronDown, ChevronUp, Clock, ClipboardList, ChevronLeft, ChevronRight, User } from 'lucide-react';

const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

/* ── Diff Viewer ──────────────────────────────────────────── */
const DiffViewer = ({ diff }) => {
  if (!diff?.before && !diff?.after) return null;
  return (
    <div className="diff-wrap" style={{ marginTop: '0.875rem' }}>
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

/* ── Log Row ──────────────────────────────────────────────── */
const LogRow = ({ log, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = log.diff?.before || log.diff?.after;
  const email = log.userId?.email;
  const initials = email ? email.slice(0, 2).toUpperCase() : '??';

  return (
    <div style={{
      borderBottom: isLast ? 'none' : '1px solid var(--border-s)',
      transition: 'background var(--t-fast)',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8125rem 1.125rem', flexWrap: 'wrap' }}>
        {/* Action badge */}
        <span className={`action-badge action-${log.action}`} style={{ flexShrink: 0, minWidth: 52, textAlign: 'center' }}>
          {log.action}
        </span>

        {/* Resource name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '0.8125rem', fontWeight: 600, color: 'var(--t1)',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            letterSpacing: '-0.02em',
          }}>
            {log.resourceName || '—'}
          </span>
          {log.resourceType && (
            <span style={{
              fontSize: '0.72rem', color: 'var(--t4)', marginLeft: '0.5rem',
              fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {log.resourceType}
            </span>
          )}
        </div>

        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          fontSize: '0.775rem', color: 'var(--t3)', flexShrink: 0,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 'var(--r-sm)',
            background: 'var(--accent-sub)', border: '1px solid rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.52rem', fontWeight: 700, color: 'var(--accent-l)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <span className="hide-mobile" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email || 'System'}
          </span>
        </div>

        {/* Timestamp */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          fontSize: '0.72rem', color: 'var(--t4)', flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}>
          <Clock size={10} style={{ flexShrink: 0 }} />
          {fmtDate(log.createdAt)}
        </div>

        {/* Expand toggle */}
        {hasDiff && (
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Hide diff' : 'Show diff'}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {expanded && hasDiff && (
        <div style={{ padding: '0 1.125rem 1rem' }}>
          <DiffViewer diff={log.diff} />
        </div>
      )}
    </div>
  );
};

/* ── Skeleton row ──────────────────────────────────────────── */
const SkeletonRow = () => (
  <div style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1.125rem', alignItems: 'center', borderBottom: '1px solid var(--border-s)' }}>
    <div className="skeleton" style={{ width: 54, height: 20, borderRadius: 'var(--r-sm)', flexShrink: 0 }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div className="skeleton skeleton-text" style={{ width: '45%', height: 13 }} />
    </div>
    <div className="skeleton skeleton-text" style={{ width: 80, height: 12, flexShrink: 0 }} />
    <div className="skeleton skeleton-text" style={{ width: 100, height: 12, flexShrink: 0 }} />
  </div>
);

/* ── Action filter config ──────────────────────────────────── */
const ACTION_CONFIG = {
  '':       { label: 'All events', color: null },
  CREATE:   { label: 'Create',  color: 'var(--green-l)'  },
  UPDATE:   { label: 'Update',  color: 'var(--blue-l)'   },
  DELETE:   { label: 'Delete',  color: 'var(--red-l)'    },
  TOGGLE:   { label: 'Toggle',  color: 'var(--yellow-l)' },
};

/* ══════════════════════════════════════════════════════════════
   AUDIT PAGE
══════════════════════════════════════════════════════════════ */
const AuditPage = () => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const LIMIT = 20;

  const load = () => {
    setLoading(true);
    getAuditLogs({ limit: LIMIT, page, action: filter || undefined })
      .then(r => { setLogs(r.data.logs); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [filter]);
  useEffect(() => { load(); }, [page, filter]);

  const pages     = Math.ceil(total / LIMIT);
  const fromCount = (page - 1) * LIMIT + 1;
  const toCount   = Math.min(page * LIMIT, total);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="ph">
        <div>
          <h1>
            <ClipboardList size={17} style={{ color: 'var(--accent-l)', opacity: 0.85 }} />
            Audit Log
          </h1>
          <div className="ph-sub">
            {loading ? 'Loading…' : (
              <>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{total.toLocaleString()}</span>
                <span> event{total !== 1 ? 's' : ''} recorded</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: '1.25rem' }}>
        {Object.entries(ACTION_CONFIG).map(([key, { label, color }]) => (
          <button
            key={key}
            className={`tab${filter === key ? ' active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {color && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Log table */}
      <div className="card card-static" style={{ overflow: 'hidden' }}>
        {loading ? (
          <>
            {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
          </>
        ) : logs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><ClipboardList size={20} /></div>
            <div className="empty-title">No events found</div>
            <div className="empty-text">
              {filter ? `No ${filter.toLowerCase()} events recorded yet.` : 'Audit events will appear here as actions are performed.'}
            </div>
          </div>
        ) : (
          <>
            {logs.map((log, i) => (
              <LogRow key={log._id} log={log} isLast={i === logs.length - 1 && pages <= 1} />
            ))}

            {/* Pagination */}
            {pages > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.875rem 1.125rem',
                borderTop: '1px solid var(--border)',
                flexWrap: 'wrap', gap: '0.75rem',
              }}>
                <span style={{ fontSize: '0.775rem', color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
                  Showing {fromCount.toLocaleString()}–{toCount.toLocaleString()} of {total.toLocaleString()}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <button
                    className="btn btn-secondary btn-sm btn-icon"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    title="Previous page"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  {/* Page number pills */}
                  {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                    let p;
                    if (pages <= 5) {
                      p = i + 1;
                    } else if (page <= 3) {
                      p = i + 1;
                    } else if (page >= pages - 2) {
                      p = pages - 4 + i;
                    } else {
                      p = page - 2 + i;
                    }
                    return (
                      <button
                        key={p}
                        className={`btn btn-sm${page === p ? ' btn-primary' : ' btn-secondary'}`}
                        onClick={() => setPage(p)}
                        style={{ minWidth: 32, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    className="btn btn-secondary btn-sm btn-icon"
                    disabled={page === pages}
                    onClick={() => setPage(p => p + 1)}
                    title="Next page"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditPage;
