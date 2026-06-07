import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Zap, Radio, Shield, BarChart2, GitBranch, Eye, EyeOff } from 'lucide-react';

const DEMO_URL = import.meta.env.VITE_DEMO_URL || '#';

const FEATURES = [
  {
    icon: Radio,
    title: 'Real-time SSE streaming',
    desc: 'Flag changes propagate to every connected client in < 50ms.',
  },
  {
    icon: BarChart2,
    title: 'Deterministic rollouts',
    desc: 'MD5 user bucketing ensures consistent experiences across sessions.',
  },
  {
    icon: Shield,
    title: 'Role-based access control',
    desc: 'Admin, Developer, Viewer — enforced at the API layer.',
  },
  {
    icon: GitBranch,
    title: 'Immutable audit trail',
    desc: 'Every toggle captured with before/after diffs. Append-only.',
  },
];

const TECH = ['Node.js', 'Express', 'MongoDB', 'React', 'SSE', 'JWT', 'RBAC'];

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('admin@demo.com');
    setPassword('demo1234');
  };

  return (
    <div className="auth-shell" style={{ animation: 'fadeIn 0.35s ease' }}>

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="auth-left">
        {/* Decorative elements */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }} />
        <div style={{
          position: 'absolute', top: '-100px', left: '-60px', width: 380, height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '-40px', width: 280, height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--r)',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.5), 0 4px 16px rgba(99,102,241,0.25)',
          }}>
            <Zap size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.025em', color: 'var(--t1)' }}>
            SwitchOn
          </span>
        </div>

        {/* Hero copy */}
        <div style={{ position: 'relative', maxWidth: 440 }}>
          {/* Status pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            background: 'var(--accent-sub)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 'var(--r-full)',
            padding: '0.3rem 0.75rem',
            marginBottom: '1.375rem',
          }}>
            <span className="live-dot" />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-l)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Live Demo Available
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.75rem, 3vw, 2.375rem)',
            fontWeight: 800, lineHeight: 1.15,
            color: 'var(--t1)', marginBottom: '0.875rem',
            letterSpacing: '-0.04em',
          }}>
            Ship features safely.{' '}
            <span className="grad">Toggle without deploying.</span>
          </h1>

          <p style={{
            fontSize: '0.875rem', color: 'var(--t3)', lineHeight: 1.7,
            marginBottom: '1.875rem', maxWidth: 400,
          }}>
            A production-grade feature flag platform with real-time streaming,
            deterministic user bucketing, RBAC, and an immutable audit trail.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.875rem' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 'var(--r)', flexShrink: 0,
                  background: 'var(--accent-sub)',
                  border: '1px solid rgba(99,102,241,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>
                  <Icon size={13} color="var(--accent-l)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8375rem', fontWeight: 600, color: 'var(--t1)', marginBottom: '0.175rem', letterSpacing: '-0.015em' }}>
                    {title}
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--t4)', lineHeight: 1.55 }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Demo CTA */}
          {DEMO_URL !== '#' && (
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer"
              className="btn btn-secondary btn-sm">
              View live demo <ArrowRight size={12} />
            </a>
          )}
        </div>

        {/* Tech stack */}
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', position: 'relative' }}>
          {TECH.map(t => (
            <span key={t} style={{
              padding: '0.175rem 0.5rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              fontSize: '0.65rem', fontWeight: 500,
              color: 'var(--t4)',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              letterSpacing: '0.01em',
            }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ────────────────────────────────── */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          {/* Mobile logo (shown when left panel is hidden) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '2.25rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--r)',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 4px 12px rgba(99,102,241,0.25)',
            }}>
              <Zap size={14} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.025em', color: 'var(--t1)' }}>SwitchOn</span>
          </div>

          {/* Header */}
          <div style={{ marginBottom: '1.875rem' }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.375rem' }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '0.8375rem', color: 'var(--t3)', lineHeight: 1.5 }}>
              Sign in to your SwitchOn dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="form-stack">
            <div className="form-field">
              <label className="form-label">Email</label>
              <div className="input-wrap">
                <Mail size={14} className="input-icon" />
                <input
                  type="email"
                  className="input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            <div className="form-field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <Link to="/forgot-password"
                  style={{ fontSize: '0.775rem', color: 'var(--accent-l)', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot?
                </Link>
              </div>
              <div className="input-wrap" style={{ position: 'relative' }}>
                <Lock size={14} className="input-icon" />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--t4)', display: 'flex', padding: '0.2rem',
                    transition: 'color var(--t-base)',
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', height: 40, fontSize: '0.875rem', marginTop: '0.25rem' }}
            >
              {loading ? (
                <><span className="spinner spinner-sm" style={{ borderTopColor: 'rgba(255,255,255,0.7)' }} /> Signing in…</>
              ) : (
                <>Continue <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <button
            onClick={fillDemo}
            style={{
              marginTop: '0.875rem', width: '100%',
              display: 'flex', flexDirection: 'column', gap: '0.25rem',
              padding: '0.75rem 0.875rem',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
              transition: 'border-color var(--t-base), background var(--t-base)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-h)'; e.currentTarget.style.background = 'var(--bg-3)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';   e.currentTarget.style.background = 'var(--bg-2)'; }}
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Demo credentials
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-l)', fontFamily: "'JetBrains Mono', ui-monospace, monospace", letterSpacing: '-0.01em' }}>
              admin@demo.com · demo1234
            </div>
          </button>

          <div className="hr" style={{ margin: '1.25rem 0' }} />

          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--t3)' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-l)', textDecoration: 'none', fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
