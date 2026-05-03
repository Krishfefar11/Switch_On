import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, Zap, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="auth-shell">
      <div className="card auth-card" style={{ animation: 'slideUp 0.3s ease' }}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <div className="auth-logo-name">SwitchOn</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--t3)' }}>Feature Flag Console</div>
          </div>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.4rem' }}>Welcome back</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--t3)', marginBottom: '1.75rem' }}>
          Sign in to manage your feature flags
        </p>

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-field">
            <label className="form-label">Email address</label>
            <div className="input-wrap">
              <Mail size={15} className="input-icon" />
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Password</label>
            <div className="input-wrap">
              <Lock size={15} className="input-icon" />
              <input
                type="password"
                className="input"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Signing in…' : (
              <><span>Sign in</span><ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div className="hr" />

        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--t3)' }}>
          No account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-l)', textDecoration: 'none', fontWeight: 600 }}>
            Create one
          </Link>
        </p>

        <div style={{
          marginTop: '1.5rem',
          padding: '0.75rem 1rem',
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.15)',
          borderRadius: 'var(--r)',
          fontSize: '0.78rem',
          color: 'var(--t3)',
        }}>
          <strong style={{ color: 'var(--accent-l)' }}>Demo:</strong>{' '}
          admin@demo.com · demo1234
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
