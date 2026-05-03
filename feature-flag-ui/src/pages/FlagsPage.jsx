import { useEffect, useState } from 'react';
import { getFlags, createFlag, updateFlag, toggleFlag, deleteFlag } from '../api/flagApi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, X, ToggleLeft, RefreshCw } from 'lucide-react';

const ENVS = ['development', 'staging', 'production'];

const Modal = ({ onClose, children }) => (
  <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal">{children}</div>
  </div>
);

const FlagForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { name: '', description: '', environment: 'development', enabled: false, rolloutPercentage: 0 });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?._id;

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await updateFlag(initial._id, { description: form.description, enabled: form.enabled, rolloutPercentage: form.rolloutPercentage, environment: form.environment });
        toast.success('Flag updated');
      } else {
        await createFlag(form);
        toast.success('Flag created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving flag');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="modal-header">
        <div className="modal-title">{isEdit ? 'Edit Flag' : 'New Flag'}</div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="form-stack">
        <div className="form-field">
          <label className="form-label">Name (slug)</label>
          <input className="input" placeholder="e.g. feature-dark-mode" value={form.name}
            onChange={e => set('name', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            disabled={isEdit} required style={{ fontFamily: 'monospace' }} />
        </div>

        <div className="form-field">
          <label className="form-label">Description</label>
          <input className="input" placeholder="What does this flag do?" value={form.description}
            onChange={e => set('description', e.target.value)} />
        </div>

        <div className="form-field">
          <label className="form-label">Environment</label>
          <select className="input" value={form.environment} onChange={e => set('environment', e.target.value)}>
            {ENVS.map(env => <option key={env} value={env}>{env}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Enabled</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--t3)' }}>Flag is {form.enabled ? 'active' : 'inactive'}</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} />
            <span className="toggle-track" />
          </label>
        </div>

        <div className="form-field">
          <label className="form-label">
            Rollout Percentage — <strong style={{ color: 'var(--accent-l)' }}>{form.rolloutPercentage}%</strong>
          </label>
          <input type="range" min="0" max="100" value={form.rolloutPercentage}
            onChange={e => set('rolloutPercentage', Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--t3)' }}>
            <span>0% — no users</span><span>100% — all users</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Saving…' : isEdit ? 'Update Flag' : 'Create Flag'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
};

const FlagsPage = () => {
  const { user } = useAuth();
  const [flags, setFlags]     = useState([]);
  const [env, setEnv]         = useState('development');
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(null); // null | 'create' | flagObj
  const [loading, setLoading] = useState(true);

  const canEdit = ['admin','developer'].includes(user?.role);

  const load = () => {
    setLoading(true);
    getFlags({ environment: env, search, limit: 100 })
      .then(r => setFlags(r.data.flags))
      .catch(() => toast.error('Failed to load flags'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [env, search]);

  const handleToggle = async (f) => {
    try {
      await toggleFlag(f._id);
      load();
      toast.success(`${f.name} ${f.enabled ? 'disabled' : 'enabled'}`);
    } catch { toast.error('Toggle failed'); }
  };

  const handleDelete = async (f) => {
    if (!confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
    try {
      await deleteFlag(f._id);
      load();
      toast.success('Flag deleted');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Modal */}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          <FlagForm
            initial={modal === 'create' ? null : modal}
            onSave={() => { setModal(null); load(); }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Header */}
      <div className="ph">
        <div>
          <h1>Feature Flags</h1>
          <div className="ph-sub">{flags.length} flag{flags.length !== 1 ? 's' : ''} · {env}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal('create')}>
              <Plus size={14} /> New Flag
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="tabs">
          {ENVS.map(e => (
            <button key={e} className={`tab${env === e ? ' active' : ''}`} onClick={() => setEnv(e)}>{e}</button>
          ))}
        </div>
        <div className="input-wrap" style={{ flex: 1, maxWidth: 280 }}>
          <Search size={14} className="input-icon" />
          <input className="input" placeholder="Search flags…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Flags grid */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : flags.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--t3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4 }}>🚩</div>
          <div style={{ fontWeight: 500 }}>No flags found</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {search ? 'Try a different search' : 'Create your first flag to get started'}
          </div>
        </div>
      ) : (
        <div className="flag-grid">
          {flags.map((f, i) => (
            <div key={f._id} className="card flag-card" style={{ animation: `fadeUp 0.3s ease ${i * 0.03}s both` }}>
              {/* Top row */}
              <div className="flag-card-top">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flag-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                  <div className="flag-desc" style={{ marginTop: '0.2rem' }}>{f.description || <span style={{ fontStyle: 'italic' }}>No description</span>}</div>
                </div>
                <label className="toggle" style={{ cursor: canEdit ? 'pointer' : 'not-allowed' }}>
                  <input type="checkbox" readOnly checked={f.enabled} onChange={() => canEdit && handleToggle(f)} />
                  <span className="toggle-track" onClick={() => canEdit && handleToggle(f)} />
                </label>
              </div>

              {/* Meta */}
              <div className="flag-meta">
                <span className={`env-${f.environment}`}>{f.environment}</span>
                {f.enabled
                  ? <span className="badge badge-green">● Enabled</span>
                  : <span className="badge badge-muted">● Disabled</span>}
                <span style={{ fontSize: '0.7rem', color: 'var(--t3)', marginLeft: 'auto' }}>v{f.version}</span>
              </div>

              {/* Rollout */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--t3)', marginBottom: '0.3rem' }}>
                  <span>Rollout</span><span style={{ fontWeight: 600, color: 'var(--t1)' }}>{f.rolloutPercentage}%</span>
                </div>
                <div className="rollout-bar">
                  <div className="rollout-fill" style={{ width: `${f.rolloutPercentage}%` }} />
                </div>
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="flag-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(f)} title="Toggle">
                    <ToggleLeft size={13} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal(f)} title="Edit">
                    <Pencil size={13} />
                  </button>
                  {user?.role === 'admin' && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlagsPage;
