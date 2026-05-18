import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Zap, Radio, Shield, BarChart2, GitBranch } from 'lucide-react';

const DEMO_URL = import.meta.env.VITE_DEMO_URL || '#';

const features = [
  { icon: Radio,    title: 'Real-Time SSE Streaming',     desc: 'Flag changes push to every connected client instantly — zero polling.' },
  { icon: BarChart2,title: 'Deterministic Rollouts',       desc: 'MD5 bucketing ensures the same user always gets the same experience.' },
  { icon: Shield,   title: 'Role-Based Access Control',    desc: 'Admin, Developer, Viewer — each with strictly enforced permissions.' },
  { icon: GitBranch,title: 'Immutable Audit Trail',        desc: 'Every toggle is captured with before/after diff. Append-only by design.' },
];

const LoginPage = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
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

  const fillDemo = () => { setEmail('admin@demo.com'); setPassword('demo1234'); };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: 'var(--bg)',
      animation: 'fadeIn 0.4s ease',
    }}>

      {/* ── LEFT — Hero Panel ─────────────────────────────────────── */}
      <div style={{
        flex: '0 0 52%',
        background: 'linear-gradient(145deg, #06060f 0%, #0d0d24 50%, #0a0a1e 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '3rem',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* decorative blobs */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '-60px',
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative' }}>
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(124,58,237,0.5)',
          }}>
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f1f5f9', letterSpacing: '-0.3px' }}>SwitchOn</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>FEATURE FLAG CONTROL PLANE</div>
          </div>
        </div>

        {/* Main copy */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 20, padding: '0.3rem 0.9rem',
            fontSize: '0.72rem', color: 'rgba(124,58,237,0.9)',
            fontWeight: 600, letterSpacing: '0.5px',
            marginBottom: '1.25rem',
          }}>
            ● LIVE DEMO AVAILABLE
          </div>

          <h1 style={{
            fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.18,
            color: '#f1f5f9', marginBottom: '1rem', letterSpacing: '-1px',
          }}>
            Ship features safely.<br />
            <span style={{
              background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Toggle without deploying.</span>
          </h1>

          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 380 }}>
            A full-stack feature flag system with real-time SSE streaming, deterministic
            user bucketing, RBAC, and an immutable audit trail — built from scratch.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '2.5rem' }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(124,58,237,0.12)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={14} color="#a78bfa" />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.15rem' }}>{title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Demo app CTA */}
          {DEMO_URL !== '#' && (
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.7rem 1.4rem',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, color: '#e2e8f0',
              fontSize: '0.85rem', fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            >
              Open Demo App <ArrowRight size={14} />
            </a>
          )}
        </div>

        {/* Footer tech stack */}
        <div style={{ position: 'relative', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['Node.js', 'Express', 'MongoDB', 'React', 'SSE', 'JWT'].map(t => (
            <span key={t} style={{
              padding: '0.25rem 0.65rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6, fontSize: '0.68rem',
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'monospace', letterSpacing: '0.3px',
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── RIGHT — Login Form ─────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        background: 'var(--bg)',
      }}>
        <div style={{ width: '100%', maxWidth: 400, animation: 'slideUp 0.35s ease' }}>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>Welcome back</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--t3)' }}>Sign in to your SwitchOn dashboard</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-field">
              <label className="form-label">Email address</label>
              <div className="input-wrap">
                <Mail size={15} className="input-icon" />
                <input
                  type="email" className="input"
                  placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Password</label>
              <div className="input-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  type="password" className="input"
                  placeholder="Your password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.25rem', height: 46 }}
            >
              {loading ? 'Signing in…' : <><span>Sign in</span><ArrowRight size={16} /></>}
            </button>
          </form>

          {/* Demo quick-fill */}
          <div
            onClick={fillDemo}
            style={{
              marginTop: '1.25rem', padding: '0.85rem 1rem',
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: 'var(--r)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,58,237,0.06)'}
            title="Click to auto-fill demo credentials"
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--t3)', marginBottom: '0.2rem', fontWeight: 600, letterSpacing: '0.5px' }}>
              DEMO CREDENTIALS — click to fill
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--accent-l)', fontFamily: 'monospace' }}>
              admin@demo.com &nbsp;·&nbsp; demo1234
            </div>
          </div>

          <div className="hr" style={{ margin: '1.5rem 0' }} />

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--t3)' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-l)', textDecoration: 'none', fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
