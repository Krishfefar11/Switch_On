import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, Zap, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';

export default function RegisterPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(email, password);
      navigate('/dashboard');
      toast.success('Account created!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background:
        'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.1) 0%, transparent 55%), var(--bg)',
      padding: '2rem',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ width: '100%', maxWidth: 380, animation: 'slideUp 0.3s var(--ease)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.25rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--r)',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 4px 12px rgba(99,102,241,0.25)',
          }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.025em', color: 'var(--t1)' }}>
            SwitchOn
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '1.875rem' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.375rem' }}>
            Create your account
          </h1>
          <p style={{ fontSize: '0.8375rem', color: 'var(--t3)', lineHeight: 1.5 }}>
            The first registered user automatically becomes admin
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
            <label className="form-label">Password</label>
            <div className="input-wrap" style={{ position: 'relative' }}>
              <Lock size={14} className="input-icon" />
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                placeholder="Minimum 6 characters"
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
                  transition: 'color var(--t-base)', borderRadius: 'var(--r-sm)',
                }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="form-hint">Must be at least 6 characters</div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', height: 40, fontSize: '0.875rem', marginTop: '0.25rem' }}
          >
            {loading ? (
              <><span className="spinner spinner-sm" style={{ borderTopColor: 'rgba(255,255,255,0.7)' }} /> Creating account…</>
            ) : (
              <>Create account <ArrowRight size={14} /></>
            )}
          </button>
        </form>

        {/* RBAC note */}
        <div style={{
          marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          padding: '0.75rem 0.875rem',
          background: 'var(--accent-sub)', border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 'var(--r-md)', fontSize: '0.775rem', color: 'var(--t3)', lineHeight: 1.55,
        }}>
          <Shield size={13} color="var(--accent-l)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            If your organization already has an admin, ask them to send you an{' '}
            <strong style={{ color: 'var(--accent-l)' }}>invitation link</strong> via Settings.
          </span>
        </div>

        <div className="hr" style={{ margin: '1.25rem 0' }} />

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--t3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-l)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
