import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAccessToken } from '../api/axiosInstance';
import { getFlags, toggleFlag } from '../api/flagApi';
import { getAuditLogs } from '../api/auditApi';
import { getAnalyticsOverview } from '../api/analyticsApi';
import toast from 'react-hot-toast';
import {
  Flag, CheckCircle, Activity, Clock, ArrowRight,
  Radio, X, ExternalLink, Zap, BarChart2, Users,
  Target, TrendingUp, MousePointer, Copy, Check,
  GitBranch, Shield, Layers,
} from 'lucide-react';

const DEMO_URL = import.meta.env.VITE_DEMO_URL || null;

const fmtNum = (n) => (n ?? 0).toLocaleString();

/* ── Quick Start Card ─────────────────────────────────────────── */
const QuickStartCard = ({ user, onDismiss }) => {
  const [copied, setCopied] = useState(false);
  const sdkKey = user?.sdkKeys?.find(k => k.environment === 'development')?.key ?? '…';

  const snippet =
`import SwitchOnClient from 'switchon-js-sdk';

const client = new SwitchOnClient({
  apiUrl:      '${import.meta.env.VITE_API_URL || 'http://localhost:5005'}',
  consumerKey: '${sdkKey}',
  environment: 'development',
});

await client.init('user-123', { plan: 'pro' });

if (client.isEnabled('my-flag')) {
  // feature is on for this user
}`;

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid rgba(99,102,241,0.18)',
      borderRadius: 'var(--r-xl)',
      padding: '1.25rem',
      marginBottom: '1.5rem',
      position: 'relative',
      animation: 'fadeUp 0.4s var(--ease)',
      overflow: 'hidden',
    }}>
      {/* Glow accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)',
        pointerEvents: 'none',
      }} />

      <button onClick={onDismiss} style={{
        position: 'absolute', top: '0.875rem', right: '0.875rem',
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
        cursor: 'pointer', color: 'var(--t4)', padding: '0.25rem',
        borderRadius: 'var(--r-sm)', display: 'flex',
        transition: 'all var(--t-base)',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--t2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--t4)'; }}
      >
        <X size={13} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <div style={{ width: 22, height: 22, borderRadius: 'var(--r-sm)', background: 'var(--accent-sub)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={11} color="var(--accent-l)" />
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--t1)', letterSpacing: '-0.02em' }}>
          You're set up — start in 3 lines
        </span>
      </div>
      <p style={{ fontSize: '0.775rem', color: 'var(--t3)', marginBottom: '0.875rem', lineHeight: 1.5 }}>
        Your SDK key is ready. Install the package and paste this snippet:
      </p>

      <div style={{ position: 'relative' }}>
        <pre style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          padding: '0.875rem 1rem',
          fontSize: '0.72rem', color: 'var(--accent-l)',
          overflowX: 'auto', margin: 0,
          lineHeight: 1.8,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}>
          {snippet}
        </pre>
        <button onClick={copy} style={{
          position: 'absolute', top: '0.625rem', right: '0.625rem',
          background: 'var(--bg-3)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)', padding: '0.3rem 0.6rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
          fontSize: '0.7rem', color: copied ? 'var(--green-l)' : 'var(--t3)',
          transition: 'all var(--t-base)',
          fontFamily: 'inherit',
        }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
        <code style={{ fontSize: '0.72rem' }}>npm install switchon-js-sdk</code>
        <span style={{ color: 'var(--t4)', fontSize: '0.75rem' }}>
          Dev key: <span style={{ color: 'var(--accent-l)', fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>{sdkKey.slice(0, 16)}…</span>
        </span>
      </div>
    </div>
  );
};

/* ── Demo Guide ───────────────────────────────────────────────── */
const DemoGuide = ({ onDismiss }) => (
  <div style={{
    background: 'var(--bg-1)',
    border: '1px solid var(--border-h)',
    borderRadius: 'var(--r-lg)',
    padding: '0.875rem 1.125rem',
    marginBottom: '1.25rem',
    position: 'relative',
    animation: 'fadeUp 0.4s var(--ease)',
  }}>
    <button onClick={onDismiss} style={{
      position: 'absolute', top: '0.75rem', right: '0.75rem',
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'var(--t4)', padding: '0.15rem', display: 'flex',
      transition: 'color var(--t-base)', borderRadius: 'var(--r-sm)',
    }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--t4)'}
    >
      <X size={13} />
    </button>

    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
      <MousePointer size={13} color="var(--accent-l)" />
      <span style={{ fontWeight: 600, fontSize: '0.8375rem', color: 'var(--t1)', letterSpacing: '-0.02em' }}>
        See it in action — 30 seconds
      </span>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
      {[
        'Open Demo App',
        'Toggle a flag',
        'Watch it update instantly',
      ].map((text, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', fontWeight: 700, color: '#fff',
            flexShrink: 0,
          }}>
            {i + 1}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--t2)' }}>{text}</span>
          {i < 2 && <ArrowRight size={11} style={{ color: 'var(--t5)' }} />}
        </div>
      ))}

      {DEMO_URL && (
        <a
          href={DEMO_URL} target="_blank" rel="noopener noreferrer"
          style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.375rem 0.75rem',
            background: 'var(--accent)', borderRadius: 'var(--r)',
            color: '#fff', fontSize: '0.775rem', fontWeight: 600,
            textDecoration: 'none', flexShrink: 0,
            boxShadow: '0 2px 8px var(--accent-glow-s)',
          }}
        >
          Open Demo <ExternalLink size={11} />
        </a>
      )}
    </div>
  </div>
);

/* ── Stat Card ────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, iconBg, iconColor, delay = 0 }) => (
  <div className="card stat-card" style={{ animation: `fadeUp 0.4s var(--ease) ${delay}s both` }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="stat-icon" style={{ background: iconBg }}>
        <Icon size={13} color={iconColor} />
      </div>
    </div>
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  </div>
);

/* ── Flag Card (dashboard variant) ──────────────────────────── */
const FlagCard = ({ flag, onToggle, delay = 0 }) => (
  <div
    className={`card flag-card flag-${flag.enabled ? 'enabled' : 'disabled'}`}
    style={{ animation: `fadeUp 0.35s var(--ease) ${delay}s both` }}
  >
    <div className="flag-card-top">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flag-name">{flag.name}</div>
        {flag.description
          ? <div className="flag-desc">{flag.description}</div>
          : <div className="flag-desc" style={{ fontStyle: 'italic', color: 'var(--t5)' }}>No description</div>
        }
      </div>
      <label className="toggle" style={{ flexShrink: 0 }}>
        <input type="checkbox" readOnly checked={flag.enabled} onChange={() => onToggle(flag)} />
        <span className="toggle-track" />
      </label>
    </div>

    <div className="flag-meta">
      <span className={`env-${flag.environment}`}>{flag.environment}</span>
      {flag.enabled
        ? <span className="badge badge-green">Enabled</span>
        : <span className="badge badge-muted">Disabled</span>
      }
    </div>

    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--t4)', marginBottom: '0.3rem' }}>
        <span>Rollout</span>
        <span style={{ fontWeight: 600, color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
          {flag.rolloutPercentage}%
        </span>
      </div>
      <div className="rollout-bar">
        <div className="rollout-fill" style={{ width: `${flag.rolloutPercentage}%` }} />
      </div>
    </div>
  </div>
);

/* ── Skeleton row ─────────────────────────────────────────────── */
const SkeletonActivity = () => (
  <div style={{ display: 'flex', gap: '0.625rem', padding: '0.75rem 1rem', alignItems: 'center' }}>
    <div className="skeleton" style={{ width: 52, height: 18, borderRadius: 'var(--r-sm)' }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
      <div className="skeleton skeleton-text" style={{ width: '35%', height: 10 }} />
    </div>
  </div>
);

/* ── Activity Row ─────────────────────────────────────────────── */
const ActivityRow = ({ log, isLast }) => (
  <div style={{
    display: 'flex', gap: '0.625rem',
    padding: '0.75rem 1rem',
    borderBottom: isLast ? 'none' : '1px solid var(--border-s)',
    alignItems: 'flex-start',
    transition: 'background var(--t-fast)',
  }}>
    <span className={`action-badge action-${log.action}`} style={{ flexShrink: 0, marginTop: '0.125rem' }}>
      {log.action}
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: '0.775rem', color: 'var(--t1)', fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        letterSpacing: '-0.02em',
      }}>
        {log.resourceName}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--t4)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <Clock size={9} style={{ flexShrink: 0 }} />
        {new Date(log.createdAt).toLocaleString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuth();
  const [flags,     setFlags]     = useState([]);
  const [allFlags,  setAllFlags]  = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [sseOk,     setSseOk]     = useState(false);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [logsLoading,  setLogsLoading]  = useState(true);
  const [showGuide, setShowGuide] = useState(() => localStorage.getItem('so_guide_dismissed') !== '1');
  const [showQS,    setShowQS]    = useState(() => localStorage.getItem('so_qs_dismissed') !== '1');
  const esRef = useRef(null);

  const dismissGuide = () => { setShowGuide(false); localStorage.setItem('so_guide_dismissed', '1'); };
  const dismissQS    = () => { setShowQS(false);    localStorage.setItem('so_qs_dismissed', '1'); };

  const loadFlags = () => {
    setFlagsLoading(true);
    getFlags({ limit: 50, environment: 'development' })
      .then(r => { setFlags(r.data.flags.slice(0, 6)); setAllFlags(r.data.flags); })
      .catch(() => {})
      .finally(() => setFlagsLoading(false));
  };

  useEffect(() => {
    loadFlags();
    getAuditLogs({ limit: 8 })
      .then(r => setLogs(r.data.logs))
      .catch(() => {})
      .finally(() => setLogsLoading(false));
    getAnalyticsOverview()
      .then(r => setAnalytics(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const base      = import.meta.env.VITE_API_URL || 'http://localhost:5005';
    const token     = getAccessToken();
    const projectId = user?.project?.id || '';
    const qs        = token
      ? `?environment=development&token=${token}&projectId=${projectId}`
      : `?environment=development&projectId=${projectId}`;
    const es    = new EventSource(`${base}/sse/flags${qs}`);
    esRef.current = es;

    es.addEventListener('FLAG_SNAPSHOT', () => setSseOk(true));
    es.onopen  = () => setSseOk(true);
    es.onerror = () => setSseOk(false);
    ['FLAG_CREATED','FLAG_UPDATED','FLAG_DELETED','FLAG_TOGGLED'].forEach(e => es.addEventListener(e, loadFlags));

    return () => es.close();
  }, []);

  const handleToggle = async (flag) => {
    try {
      await toggleFlag(flag._id);
      await loadFlags();
      toast.success(`${flag.name} ${flag.enabled ? 'disabled' : 'enabled'}`);
    } catch { toast.error('Toggle failed'); }
  };

  const activeCount   = allFlags.filter(f => f.enabled).length;
  const disabledCount = allFlags.length - activeCount;
  const envCount      = [...new Set(allFlags.map(f => f.environment))].length || 1;
  const firstName     = user?.email?.split('@')[0] ?? 'there';

  /* ── Greeting ──────────────────────────────────────────────── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>

      {showQS && user?.sdkKeys?.length > 0 && (
        <QuickStartCard user={user} onDismiss={dismissQS} />
      )}
      {showGuide && DEMO_URL && (
        <DemoGuide onDismiss={dismissGuide} />
      )}

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', fontWeight: 700, letterSpacing: '-0.035em', marginBottom: '0.375rem', color: 'var(--t1)' }}>
          {greeting},{' '}
          <span className="grad">{firstName}</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="live-dot" style={{ background: sseOk ? 'var(--green)' : 'var(--t5)' }} />
          <span style={{ fontSize: '0.775rem', color: 'var(--t4)' }}>
            {sseOk ? 'Live — flag changes propagate instantly' : 'Connecting to live stream…'}
          </span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <StatCard icon={Flag}        label="Total Flags"   value={allFlags.length}  sub="in this project"                    iconBg="var(--accent-sub)"  iconColor="var(--accent-l)" delay={0}    />
        <StatCard icon={CheckCircle} label="Enabled"       value={activeCount}      sub={`${disabledCount} disabled`}         iconBg="var(--green-bg)"    iconColor="var(--green)"    delay={0.04} />
        <StatCard icon={Radio}       label="Environments"  value={envCount}         sub="dev · staging · prod"                iconBg="var(--blue-bg)"     iconColor="var(--blue)"     delay={0.08} />
        <StatCard icon={Activity}    label="Recent Events" value={logs.length}      sub="last 24 hours"                       iconBg="var(--yellow-bg)"   iconColor="var(--yellow)"   delay={0.12} />
      </div>

      {/* ── Analytics ── */}
      {analytics && (
        <div style={{ marginBottom: '1.625rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.025em' }}>Analytics</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--t4)', marginTop: '0.15rem' }}>Last 7 days</p>
            </div>
          </div>

          {/* Mini stat cards */}
          <div className="analytics-grid" style={{ marginBottom: '0.75rem' }}>
            {[
              { icon: BarChart2,  label: 'Evaluations',  value: fmtNum(analytics.evaluations ?? analytics.totalEvaluations), iconBg: 'var(--accent-sub)', iconColor: 'var(--accent-l)' },
              { icon: Users,      label: 'Unique Users',  value: fmtNum(analytics.uniqueUsers),    iconBg: 'var(--blue-bg)',   iconColor: 'var(--blue)'     },
              { icon: Target,     label: 'Rule Matches',  value: fmtNum(analytics.ruleMatches),    iconBg: 'var(--green-bg)',  iconColor: 'var(--green)'    },
              { icon: TrendingUp, label: 'Flags Served',  value: fmtNum(analytics.flagsEvaluated), iconBg: 'var(--yellow-bg)', iconColor: 'var(--yellow)'   },
            ].map(({ icon: Icon, label, value, iconBg, iconColor }) => (
              <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: 'var(--r)', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color={iconColor} />
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--t4)', marginBottom: '0.15rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: '1.0625rem', fontWeight: 700, letterSpacing: '-0.035em', color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Top flags mini chart */}
          {analytics.topFlags?.length > 0 && (
            <div className="card card-static" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--t2)', letterSpacing: '-0.015em' }}>
                  Most Evaluated
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--t4)' }}>evaluations</span>
              </div>
              {analytics.topFlags.slice(0, 5).map((f, i) => {
                const pct = analytics.topFlags[0]?.count
                  ? Math.round((f.count / analytics.topFlags[0].count) * 100) : 0;
                return (
                  <div key={f.flagName ?? i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5625rem 1rem',
                    borderBottom: i < Math.min(analytics.topFlags.length, 5) - 1 ? '1px solid var(--border-s)' : 'none',
                  }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--t5)', width: 14, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{i + 1}</span>
                    <span style={{
                      fontSize: '0.775rem', color: 'var(--t1)', flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      letterSpacing: '-0.02em',
                    }}>
                      {f.name ?? f.flagName}
                    </span>
                    <div style={{ width: 80, height: 3, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.6s var(--ease)' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--t3)', minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {fmtNum(f.count)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Two columns: Flags + Activity ── */}
      <div className="dashboard-cols">

        {/* Recent Flags */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.025em' }}>Recent Flags</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--t4)', marginTop: '0.15rem' }}>Development environment</p>
            </div>
            <Link to="/flags" className="btn btn-secondary btn-sm">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {flagsLoading ? (
            <div className="flag-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card" style={{ padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                      <div className="skeleton skeleton-text" style={{ width: '50%', height: 10 }} />
                    </div>
                    <div className="skeleton" style={{ width: 38, height: 22, borderRadius: 99 }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <div className="skeleton" style={{ width: 70, height: 18, borderRadius: 99 }} />
                    <div className="skeleton" style={{ width: 54, height: 18, borderRadius: 99 }} />
                  </div>
                  <div className="skeleton" style={{ width: '100%', height: 3, borderRadius: 99 }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flag-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {flags.map((f, i) => (
                <FlagCard key={f._id} flag={f} onToggle={handleToggle} delay={i * 0.04} />
              ))}
              {flags.length === 0 && (
                <div className="card empty" style={{ gridColumn: '1 / -1' }}>
                  <div className="empty-icon">
                    <Flag size={20} />
                  </div>
                  <div className="empty-title">No flags yet</div>
                  <div className="empty-text">Create your first feature flag to start controlling feature rollouts.</div>
                  <Link to="/flags" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                    <Flag size={12} /> Create Flag
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.025em' }}>Activity</h2>
            <Link to="/audit" style={{ fontSize: '0.75rem', color: 'var(--accent-l)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              All logs <ArrowRight size={11} />
            </Link>
          </div>

          <div className="card card-static" style={{ overflow: 'hidden' }}>
            {logsLoading ? (
              <>
                {[...Array(5)].map((_, i) => <SkeletonActivity key={i} />)}
              </>
            ) : logs.length === 0 ? (
              <div className="empty">
                <div className="empty-icon"><Activity size={18} /></div>
                <div className="empty-title">No activity yet</div>
                <div className="empty-text">Changes to flags will appear here</div>
              </div>
            ) : (
              logs.map((log, i) => (
                <ActivityRow key={log._id} log={log} isLast={i === logs.length - 1} />
              ))
            )}
          </div>

          {/* Feature tiles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {[
              { icon: Radio,      color: 'var(--blue)',   bg: 'var(--blue-bg)',   title: 'Real-time SSE',   desc: 'Changes propagate in < 50ms' },
              { icon: Shield,     color: 'var(--green)',  bg: 'var(--green-bg)',  title: 'RBAC enforced',   desc: 'Admin · Developer · Viewer' },
              { icon: GitBranch,  color: 'var(--yellow)', bg: 'var(--yellow-bg)', title: 'Audit trail',     desc: 'Every change captured' },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="card" style={{ padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--r)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--t2)', letterSpacing: '-0.01em' }}>{title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--t4)', marginTop: '0.1rem' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
