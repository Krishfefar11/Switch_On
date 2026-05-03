import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, Zap, ArrowRight } from 'lucide-react';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
    <div className="auth-shell">
      <div className="card auth-card" style={{ animation: 'slideUp 0.3s ease' }}>
        <div className="auth-logo">
          <div className="auth-logo-icon"><Zap size={18} color="#fff" /></div>
          <div>
            <div className="auth-logo-name">SwitchOn</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--t3)' }}>Feature Flag Console</div>
          </div>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.4rem' }}>Create account</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--t3)', marginBottom: '1.75rem' }}>
          The first registered user becomes admin
        </p>

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-field">
            <label className="form-label">Email address</label>
            <div className="input-wrap">
              <Mail size={15} className="input-icon" />
              <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Password</label>
            <div className="input-wrap">
              <Lock size={15} className="input-icon" />
              <input type="password" className="input" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Creating…' : <><span>Create account</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="hr" />
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--t3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-l)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
