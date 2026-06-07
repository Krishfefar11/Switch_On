import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import toast from 'react-hot-toast';
import { Lock, ArrowLeft, Zap, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams]       = useSearchParams();
  const navigate              = useNavigate();
  const token                 = searchParams.get('token');

  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [verifying,  setVerifying]  = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [done,       setDone]       = useState(false);

  useEffect(() => {
    if (!token) { setVerifying(false); return; }
    axiosInstance.get(`/auth/reset-password/verify?token=${token}`)
      .then(r  => setTokenValid(r.data.valid === true))
      .catch(() => setTokenValid(false))
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 8)  { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await axiosInstance.post('/auth/reset-password', { token, password });
      setDone(true);
      toast.success('Password updated!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--t4)', fontSize: '0.875rem' }}>
          <span style={{ width: 16, height: 16, border: '1.5px solid var(--border-h)', borderTopColor: 'var(--accent-l)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
          Verifying link…
        </div>
      </div>
    );
  }

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

        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '2rem' }}>

          {/* Invalid token */}
          {!tokenValid && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 1.25rem', background: 'var(--red-bg)', border: '1px solid var(--red-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={24} color="var(--red)" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.625rem', letterSpacing: '-0.03em' }}>Link expired</h2>
              <p style={{ fontSize: '0.8375rem', color: 'var(--t3)', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                This link is invalid or has expired. Reset links are valid for <strong style={{ color: 'var(--t1)' }}>1 hour</strong>.
              </p>
              <Link to="/forgot-password" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                Request a new link
              </Link>
              <div>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--t4)', fontSize: '0.8rem', textDecoration: 'none' }}>
                  <ArrowLeft size={13} /> Back to sign in
                </Link>
              </div>
            </div>
          )}

          {/* Success */}
          {tokenValid && done && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 1.25rem', background: 'var(--green-bg)', border: '1px solid var(--green-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={24} color="var(--green)" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.625rem', letterSpacing: '-0.03em' }}>Password updated</h2>
              <p style={{ fontSize: '0.8375rem', color: 'var(--t3)' }}>Redirecting you to sign in…</p>
            </div>
          )}

          {/* Form */}
          {tokenValid && !done && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
                Set a new password
              </h2>
              <p style={{ fontSize: '0.8375rem', color: 'var(--t3)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Choose a strong password — at least 8 characters.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-field">
                  <label className="form-label">New password</label>
                  <div className="input-wrap" style={{ position: 'relative' }}>
                    <Lock size={14} className="input-icon" />
                    <input
                      type={showPw ? 'text' : 'password'} className="input"
                      placeholder="Min. 8 characters"
                      value={password} onChange={e => setPassword(e.target.value)}
                      required minLength={8} autoFocus
                      style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: '0.2rem', transition: 'color 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--t4)'}
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Confirm password</label>
                  <div className="input-wrap">
                    <Lock size={14} className="input-icon" />
                    <input
                      type={showPw ? 'text' : 'password'} className="input"
                      placeholder="Same password again"
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      required style={{ paddingLeft: '2.25rem' }}
                    />
                  </div>
                  {confirm && password !== confirm && (
                    <p className="form-error">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit" className="btn btn-primary"
                  disabled={loading || password !== confirm || password.length < 8}
                  style={{ width: '100%', height: 40, fontSize: '0.875rem' }}
                >
                  {loading ? 'Updating…' : 'Update password'}
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
