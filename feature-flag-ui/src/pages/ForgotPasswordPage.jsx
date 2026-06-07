import { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Zap, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axiosInstance.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 55%), var(--bg)',
      padding: '2rem', animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ width: '100%', maxWidth: 380, animation: 'slideUp 0.3s var(--ease)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.5rem' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 'var(--r)',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 4px 12px rgba(99,102,241,0.25)',
          }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.02em' }}>SwitchOn</span>
        </div>

        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)', padding: '2rem',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', margin: '0 auto 1.25rem',
                background: 'var(--green-bg)', border: '1px solid var(--green-bd)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={24} color="var(--green)" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.625rem', letterSpacing: '-0.03em' }}>
                Check your email
              </h2>
              <p style={{ fontSize: '0.8375rem', color: 'var(--t3)', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                If <strong style={{ color: 'var(--t1)' }}>{email}</strong> is registered,
                we sent a reset link. It expires in <strong style={{ color: 'var(--t1)' }}>1 hour</strong>.
              </p>
              <p style={{ fontSize: '0.775rem', color: 'var(--t4)', marginBottom: '1.5rem' }}>
                Didn't receive it?{' '}
                <button
                  onClick={() => setSent(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-l)', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: '0.775rem', fontFamily: 'inherit' }}
                >
                  Try again
                </button>
              </p>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--t4)', fontSize: '0.8rem', textDecoration: 'none' }}>
                <ArrowLeft size={13} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
                Reset your password
              </h2>
              <p style={{ fontSize: '0.8375rem', color: 'var(--t3)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-field">
                  <label className="form-label">Email address</label>
                  <div className="input-wrap">
                    <Mail size={14} className="input-icon" />
                    <input
                      type="email" className="input"
                      placeholder="you@company.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      required autoFocus style={{ paddingLeft: '2.25rem' }}
                    />
                  </div>
                </div>

                <button
                  type="submit" className="btn btn-primary"
                  disabled={loading}
                  style={{ width: '100%', height: 40, fontSize: '0.875rem' }}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--t4)', fontSize: '0.8rem', textDecoration: 'none' }}>
                  <ArrowLeft size={13} /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
