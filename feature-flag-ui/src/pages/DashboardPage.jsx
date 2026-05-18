import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFlags } from '../api/flagApi';
import { getAuditLogs } from '../api/auditApi';
import { toggleFlag } from '../api/flagApi';
import { getAnalyticsOverview } from '../api/analyticsApi';
import toast from 'react-hot-toast';
import { Flag, CheckCircle, Activity, Clock, ArrowRight, Radio, X, ExternalLink, MousePointer, Zap, BarChart2, Users, Target, TrendingUp } from 'lucide-react';

const DEMO_URL = import.meta.env.VITE_DEMO_URL || null;

const DemoGuide = ({ onDismiss }) => (
  <div style={{
    background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(59,130,246,0.06) 100%)',
    border: '1px solid rgba(124,58,237,0.2)',
    borderRadius: 'var(--r)',
    padding: '1.1rem 1.25rem',
    marginBottom: '1.75rem',
    position: 'relative',
    animation: 'fadeUp 0.4s ease',
  }}>
    <button onClick={onDismiss} style={{
      position: 'absolute', top: '0.75rem', right: '0.75rem',
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'var(--t3)', padding: '0.2rem', borderRadius: 4,
    }}>
      <X size={14} />
    </button>

    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <Zap size={14} color="var(--accent-l)" />
      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-l)' }}>
        How to demo SwitchOn in 30 seconds
      </span>
    </div>

    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {[
        { n: '1', text: 'Open the Demo App in another tab' },
        { n: '2', text: 'Toggle any flag on this page' },
        { n: '3', text: 'Watch the Demo App update instantly — no refresh' },
      ].map(({ n, text }) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff',
          }}>{n}</div>
          <span style={{ fontSize: '0.82rem', color: 'var(--t2)' }}>{text}</span>
          {n !== '3' && <span style={{ color: 'var(--t3)', fontSize: '0.8rem' }}>→</span>}
        </div>
      ))}

      {DEMO_URL && (
        <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" style={{
          marginLeft: 'auto',
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.45rem 1rem',
          background: 'var(--accent)', borderRadius: 8,
          color: '#fff', fontSize: '0.8rem', fontWeight: 600,
          textDecoration: 'none', flexShrink: 0,
          boxShadow: '0 0 16px rgba(124,58,237,0.35)',
        }}>
          <MousePointer size={12} /> Open Demo App <ExternalLink size={11} />
        </a>
      )}
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, sub, iconBg, iconColor, delay }) => (
  <div className="card stat-card" style={{ animation: `fadeUp 0.4s ease ${delay}s both` }}>
    <div className="stat-icon" style={{ background: iconBg }}>
      <Icon size={16} color={iconColor} />
    </div>
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value grad">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const [flags, setFlags] = useState([]);
  const [showGuide, setShowGuide] = useState(() => localStorage.getItem('so_guide_dismissed') !== '1');
  const dismissGuide = () => { setShowGuide(false); localStorage.setItem('so_guide_dismissed', '1'); };
  const [allFlags, setAllFlags] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const esRef = useRef(null);

  useEffect(() => {
    getFlags({ limit: 50, environment: 'development' })
      .then(r => { setFlags(r.data.flags.slice(0, 6)); setAllFlags(r.data.flags); })
      .catch(() => {});
    getAuditLogs({ limit: 5 })
      .then(r => setRecentLogs(r.data.logs))
      .catch(() => {});
    getAnalyticsOverview()
      .then(r => setAnalyticsOverview(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5005';
    const url = `${apiBase}/sse/flags?environment=development`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('FLAG_SNAPSHOT', () => setSseConnected(true));
    es.onopen  = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);

    const refresh = () =>
      getFlags({ limit: 50, environment: 'development' })
        .then(r => { setFlags(r.data.flags.slice(0, 6)); setAllFlags(r.data.flags); })
        .catch(() => {});

    ['FLAG_CREATED','FLAG_UPDATED','FLAG_DELETED','FLAG_TOGGLED'].forEach(evt =>
      es.addEventListener(evt, refresh));

    return () => es.close();
  }, []);

  const activeCount = allFlags.filter(f => f.enabled).length;
  const envs = [...new Set(allFlags.map(f => f.environment))].length;

  const handleToggle = async (flag) => {
    try {
      await toggleFlag(flag._id);
      const r = await getFlags({ limit: 50, environment: 'development' });
      setFlags(r.data.flags.slice(0, 6));
      setAllFlags(r.data.flags);
      toast.success(`${flag.name} ${flag.enabled ? 'disabled' : 'enabled'}`);
    } catch { toast.error('Toggle failed'); }
  };

  const firstName = user?.email?.split('@')[0] ?? 'there';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {showGuide && <DemoGuide onDismiss={dismissGuide} />}
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
          <h1 style={{ fontWeight: 700, fontSize: '1.6rem' }}>
            Hey, <span className="grad">{firstName}</span> 👋
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="live-dot" />
          <span style={{ fontSize: '0.8rem', color: 'var(--t3)' }}>
            {sseConnected ? 'Live — changes appear instantly' : 'Connecting to live stream…'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard icon={Flag}        label="Total Flags"   value={allFlags.length}  sub="across all envs"    iconBg="var(--accent-sub)"    iconColor="var(--accent-l)" delay={0}    />
        <StatCard icon={CheckCircle} label="Active Flags"  value={activeCount}      sub={`${allFlags.length - activeCount} disabled`} iconBg="var(--green-bg)" iconColor="var(--green)" delay={0.05} />
        <StatCard icon={Radio}       label="Environments"  value={envs}             sub="dev · staging · prod" iconBg="var(--blue-bg)"    iconColor="var(--blue)"     delay={0.1}  />
        <StatCard icon={Activity}    label="Recent Events" value={recentLogs.length} sub="last 5 changes"     iconBg="var(--yellow-bg)"     iconColor="var(--yellow)"   delay={0.15} />
      </div>

      {/* Analytics Overview */}
      {analyticsOverview && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="ph" style={{ marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Analytics Overview</h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--t3)' }}>last 7 days · all environments</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: '0.9rem' }}>
            {[
              { icon: BarChart2, label: 'Total Evaluations', value: analyticsOverview.totalEvaluations?.toLocaleString() ?? '—', iconBg: 'rgba(124,58,237,0.12)', iconColor: 'var(--accent-l)' },
              { icon: Users,     label: 'Unique Users',       value: analyticsOverview.uniqueUsers?.toLocaleString() ?? '—',       iconBg: 'rgba(59,130,246,0.12)',   iconColor: 'var(--blue)' },
              { icon: Target,    label: 'Rule Matches',       value: analyticsOverview.ruleMatches?.toLocaleString() ?? '—',       iconBg: 'rgba(16,185,129,0.12)',   iconColor: 'var(--green)' },
              { icon: TrendingUp,label: 'Flags Evaluated',    value: analyticsOverview.flagsEvaluated ?? '—',                      iconBg: 'rgba(245,158,11,0.12)',   iconColor: 'var(--yellow)' },
            ].map(({ icon: Icon, label, value, iconBg, iconColor }) => (
              <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1.1rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={iconColor} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--t3)', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--t1)' }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Top flags */}
          {analyticsOverview.topFlags?.length > 0 && (
            <div className="card" style={{ marginTop: '0.9rem', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1.1rem', borderBottom: '1px solid var(--border)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--t2)' }}>
                Most Evaluated Flags
              </div>
              {analyticsOverview.topFlags.map((f, i) => {
                const pct = analyticsOverview.topFlags[0]?.count ? Math.round((f.count / analyticsOverview.topFlags[0].count) * 100) : 0;
                return (
                  <div key={f.flagName} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1.1rem', borderBottom: i < analyticsOverview.topFlags.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--t3)', width: 14, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--t1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.flagName}</span>
                    <div style={{ width: 80, height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--t3)', width: 40, textAlign: 'right' }}>{f.count.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', alignItems: 'start' }}>

        {/* Flag grid */}
        <div>
          <div className="ph" style={{ marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Flags</h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--t3)' }}>development environment</div>
            </div>
            <Link to="/flags" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="flag-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))' }}>
            {flags.map((f, i) => (
              <div key={f._id} className="card flag-card" style={{ animation: `fadeUp 0.35s ease ${i * 0.05}s both` }}>
                <div className="flag-card-top">
                  <div>
                    <div className="flag-name">{f.name}</div>
                    <div className="flag-desc">{f.description || <span style={{ fontStyle: 'italic' }}>No description</span>}</div>
                  </div>
                  <label className="toggle" onClick={e => { e.preventDefault(); handleToggle(f); }}>
                    <input type="checkbox" readOnly checked={f.enabled} />
                    <span className="toggle-track" />
                  </label>
                </div>
                <div className="flag-meta">
                  <span className={`env-${f.environment}`}>{f.environment}</span>
                  {f.enabled
                    ? <span className="badge badge-green">On</span>
                    : <span className="badge badge-muted">Off</span>}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--t3)', marginBottom: '0.3rem' }}>
                    <span>Rollout</span><span>{f.rolloutPercentage}%</span>
                  </div>
                  <div className="rollout-bar">
                    <div className="rollout-fill" style={{ width: `${f.rolloutPercentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {flags.length === 0 && (
              <div className="card" style={{ padding: '2rem', gridColumn: '1 / -1', textAlign: 'center', color: 'var(--t3)', fontSize: '0.875rem' }}>
                No flags yet. <Link to="/flags" style={{ color: 'var(--accent-l)' }}>Create your first flag →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Activity</h2>
          <div className="card" style={{ overflow: 'hidden' }}>
            {recentLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--t3)', fontSize: '0.85rem' }}>No activity yet</div>
            ) : recentLogs.map((log, i) => (
              <div key={log._id} style={{
                display: 'flex', gap: '0.75rem', padding: '0.9rem 1.1rem',
                borderBottom: i < recentLogs.length - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'flex-start',
              }}>
                <div style={{ paddingTop: '0.1rem' }}>
                  <span className={`action-badge action-${log.action}`}>{log.action}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--t1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.resourceName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--t3)', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={10} />
                    {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
