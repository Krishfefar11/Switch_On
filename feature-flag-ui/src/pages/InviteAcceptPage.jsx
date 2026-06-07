import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { verifyInviteToken, acceptInvite } from '../api/invitationApi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap, Lock, Mail, ArrowRight, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';

const InviteAcceptPage = () => {
  const { token }           = useParams();
  const navigate            = useNavigate();
  const { loginWithToken }  = useAuth();
  const [info,       setInfo]       = useState(null);
  const [status,     setStatus]     = useState('loading'); // loading | valid | invalid
  const [form,       setForm]       = useState({ email: '', password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    verifyInviteToken(token)
      .then(r => {
        setInfo(r.data);
        setForm(f => ({ ...f, email: r.data.email || '' }));
        setStatus('valid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSubmitting(true);
    try {
      const r = await acceptInvite(token, { email: form.email, password: form.password });
      await loginWithToken(r.data.accessToken);
      toast.success('Welcome! You have joined the organization.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background:
        'radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.09) 0%, transparent 60%), var(--bg)',
      padding: '2rem',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ width: '100%', maxWidth: 400, animation: 'slideUp 0.3s var(--ease)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center', marginBottom: '2.25rem' }}>
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

        <div style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-2xl)',
          padding: '1.875rem 1.75rem',
          boxShadow: 'var(--shadow-md)',
        }}>
          {/* Loading */}
          {status === 'loading' && (
            <div className="spinner-wrap" style={{ padding: '3rem' }}>
              <div className="spinner" />
            </div>
          )}

          {/* Invalid */}
          {status === 'invalid' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', margin: '0 auto 1.25rem',
                background: 'var(--red-bg)', border: '1px solid var(--red-bd)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertCircle size={22} color="var(--red)" />
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
                Invitation expired
              </h2>
              <p style={{ fontSize: '0.8375rem', color: 'var(--t3)', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                This link is invalid or has expired. Invitation links are valid for{' '}
                <strong style={{ color: 'var(--t1)' }}>72 hours</strong>.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/login')}>
                Go to sign in
              </button>
            </div>
          )}

          {/* Valid */}
          {status === 'valid' && info && (
            <>
              {/* Header */}
              <div style={{ marginBottom: '1.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 'var(--r-md)',
                    background: 'var(--accent-sub)', border: '1px solid rgba(99,102,241,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <UserPlus size={15} color="var(--accent-l)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--t1)', lineHeight: 1.2 }}>
                      You've been invited
                    </h2>
                    <div style={{ fontSize: '0.75rem', color: 'var(--t3)', marginTop: '0.2rem' }}>
                      Join as{' '}
                      <span className={`role-${info.role}`}>{info.role}</span>
                      {info.organization?.name && (
                        <span style={{ color: 'var(--t4)' }}> · {info.organization.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="form-stack">
                <div className="form-field">
                  <label className="form-label">Email</label>
                  <div className="input-wrap">
                    <Mail size={14} className="input-icon" />
                    <input
                      className="input"
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="your@email.com"
                      style={{ paddingLeft: '2.25rem' }}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Password</label>
                  <div className="input-wrap">
                    <Lock size={14} className="input-icon" />
                    <input
                      className="input"
                      type="password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      autoFocus
                      style={{ paddingLeft: '2.25rem' }}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Confirm password</label>
                  <div className="input-wrap">
                    <Lock size={14} className="input-icon" />
                    <input
                      className="input"
                      type="password"
                      required
                      value={form.confirm}
                      onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                      placeholder="Repeat your password"
                      style={{ paddingLeft: '2.25rem' }}
                    />
                  </div>
                  {form.confirm && form.password !== form.confirm && (
                    <p className="form-error">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || (form.confirm && form.password !== form.confirm)}
                  style={{ width: '100%', height: 40, fontSize: '0.875rem', marginTop: '0.25rem' }}
                >
                  {submitting ? (
                    <><span className="spinner spinner-sm" style={{ borderTopColor: 'rgba(255,255,255,0.7)' }} /> Joining…</>
                  ) : (
                    <>Join Organization <ArrowRight size={14} /></>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteAcceptPage;
