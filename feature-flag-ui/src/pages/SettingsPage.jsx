import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { getSdkKeys, createSdkKey, revokeSdkKey, createProject } from '../api/projectApi';
import { listInvitations, createInvitation, revokeInvitation } from '../api/invitationApi';
import toast from 'react-hot-toast';
import {
  Copy, Plus, Trash2, RefreshCw, Link as LinkIcon, X, Check,
  Globe, Shield, ToggleLeft, Settings, Key, Users, Webhook,
  AlertTriangle, Eye, EyeOff,
} from 'lucide-react';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, rotateSecret } from '../api/webhookApi';

/* ── Helpers ─────────────────────────────────────────────── */
const ENV_LABEL_COLORS = {
  production:  { color: 'var(--red-l)',    bg: 'var(--red-bg)',    bd: 'var(--red-bd)'    },
  staging:     { color: 'var(--yellow-l)', bg: 'var(--yellow-bg)', bd: 'var(--yellow-bd)' },
  development: { color: 'var(--blue-l)',   bg: 'var(--blue-bg)',   bd: 'var(--blue-bd)'   },
};

const EnvBadge = ({ env }) => {
  const c = ENV_LABEL_COLORS[env] || ENV_LABEL_COLORS.development;
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, padding: '0.175rem 0.5rem',
      borderRadius: 'var(--r-full)',
      background: c.bg, color: c.color, border: `1px solid ${c.bd}`,
      flexShrink: 0, letterSpacing: '0.02em',
    }}>
      {env}
    </span>
  );
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className="btn btn-ghost btn-sm btn-icon" onClick={copy} title="Copy to clipboard">
      {copied ? <Check size={13} color="var(--green-l)" /> : <Copy size={13} />}
    </button>
  );
};

/* ── Key display with reveal ────────────────────────────── */
const KeyDisplay = ({ keyStr }) => {
  const [revealed, setRevealed] = useState(false);
  const masked = keyStr.slice(0, 8) + '…' + keyStr.slice(-4);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
      <code style={{
        flex: 1, fontSize: '0.72rem',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        letterSpacing: revealed ? '0.02em' : 'normal',
      }}>
        {revealed ? keyStr : masked}
      </code>
      <button
        className="btn btn-ghost btn-sm btn-icon"
        onClick={() => setRevealed(v => !v)}
        title={revealed ? 'Hide key' : 'Reveal key'}
      >
        {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
};

/* ── SDK Keys Panel ─────────────────────────────────────── */
const SdkKeysPanel = ({ project }) => {
  const [keys,     setKeys]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [newEnv,   setNewEnv]   = useState('development');
  const [newLabel, setNewLabel] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    if (!project) return;
    setLoading(true);
    getSdkKeys(project._id || project.id)
      .then(r => setKeys(r.data.keys ?? []))
      .catch(() => toast.error('Failed to load SDK keys'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [project?._id ?? project?.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createSdkKey(project._id || project.id, {
        environment: newEnv,
        label: newLabel || `${newEnv} key`,
      });
      toast.success('SDK key created');
      setShowForm(false);
      setNewLabel('');
      load();
    } catch { toast.error('Failed to create key'); }
    finally { setCreating(false); }
  };

  const handleRevoke = async (keyId) => {
    if (!confirm('Revoke this key? Apps using it will lose access immediately.')) return;
    try {
      await revokeSdkKey(project._id || project.id, keyId);
      toast.success('Key revoked');
      load();
    } catch { toast.error('Failed to revoke'); }
  };

  const activeKeys = keys.filter(k => k.isActive !== false);

  return (
    <div>
      {/* Header */}
      <div className="settings-section-header">
        <div>
          <div className="settings-section-title">SDK Keys</div>
          <div className="settings-section-sub">Authenticate your applications with the SwitchOn API.</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={load} title="Refresh"><RefreshCw size={13} /></button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
            <Plus size={13} /> New Key
          </button>
        </div>
      </div>

      <div style={{ padding: '1rem 1.25rem' }}>
        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: 'var(--r-md)', padding: '1rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
              <div className="form-field" style={{ flex: 1, minWidth: 140 }}>
                <label className="form-label">Environment</label>
                <select className="input" value={newEnv} onChange={e => setNewEnv(e.target.value)}>
                  <option value="development">development</option>
                  <option value="staging">staging</option>
                  <option value="production">production</option>
                </select>
              </div>
              <div className="form-field" style={{ flex: 2, minWidth: 180 }}>
                <label className="form-label">Label <span style={{ fontWeight: 400, color: 'var(--t4)' }}>(optional)</span></label>
                <input className="input" placeholder="e.g. CI pipeline key"
                  value={newLabel} onChange={e => setNewLabel(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
                {creating ? <><span className="spinner spinner-sm" style={{ borderTopColor: 'rgba(255,255,255,0.8)' }} /> Creating…</> : 'Create Key'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={13} /></button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ width: 70, height: 18, borderRadius: 99 }} />
                <div className="skeleton skeleton-text" style={{ flex: 1 }} />
                <div className="skeleton" style={{ width: 60, height: 18, borderRadius: 'var(--r-sm)' }} />
              </div>
            ))}
          </div>
        ) : activeKeys.length === 0 ? (
          <div className="empty" style={{ padding: '2rem' }}>
            <div className="empty-icon"><Key size={18} /></div>
            <div className="empty-title">No SDK keys</div>
            <div className="empty-text">Create a key to authenticate your application with the SwitchOn API.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeKeys.map(k => (
              <div key={k._id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 0.875rem',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                flexWrap: 'wrap',
              }}>
                <EnvBadge env={k.environment} />
                <KeyDisplay keyStr={k.key} />
                {k.label && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--t3)', flexShrink: 0 }}>{k.label}</span>
                )}
                <CopyButton text={k.key} />
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRevoke(k._id)}
                  title="Revoke key"
                >
                  <Trash2 size={12} /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Invitations Panel ──────────────────────────────────── */
const InvitationsPanel = () => {
  const { user } = useAuth();
  const [invites,    setInvites]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ email: '', role: 'developer' });
  const [lastInvite, setLastInvite] = useState(null);

  const load = () => {
    setLoading(true);
    listInvitations()
      .then(r => setInvites(r.data.invitations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await createInvitation(form);
      setLastInvite(r.data.invitation);
      toast.success('Invitation link created');
      setShowForm(false);
      setForm({ email: '', role: 'developer' });
      load();
    } catch { toast.error('Failed to create invitation'); }
    finally { setCreating(false); }
  };

  const handleRevoke = async (id) => {
    try {
      await revokeInvitation(id);
      toast.success('Invitation revoked');
      load();
    } catch { toast.error('Failed to revoke'); }
  };

  if (user?.role !== 'admin') {
    return (
      <div>
        <div className="settings-section-header">
          <div>
            <div className="settings-section-title">Team Invitations</div>
            <div className="settings-section-sub">Invite teammates to your organization.</div>
          </div>
        </div>
        <div className="empty" style={{ padding: '2rem' }}>
          <div className="empty-icon"><Shield size={18} /></div>
          <div className="empty-title">Admin access required</div>
          <div className="empty-text">Only administrators can manage team invitations.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="settings-section-header">
        <div>
          <div className="settings-section-title">Team Invitations</div>
          <div className="settings-section-sub">Invite teammates via a one-time link — no email setup required.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
          <Plus size={13} /> Invite Teammate
        </button>
      </div>

      <div style={{ padding: '1rem 1.25rem' }}>
        {/* Last created invite URL */}
        {lastInvite && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap',
            padding: '0.875rem 1rem', marginBottom: '1.25rem',
            background: 'var(--green-bg)', border: '1px solid var(--green-bd)',
            borderRadius: 'var(--r-md)',
          }}>
            <LinkIcon size={14} color="var(--green-l)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--green-l)', marginBottom: '0.375rem' }}>
                Invitation link created — share this with your teammate
              </div>
              <code style={{ fontSize: '0.72rem', wordBreak: 'break-all', color: 'var(--t2)' }}>
                {lastInvite.inviteUrl}
              </code>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
              <CopyButton text={lastInvite.inviteUrl} />
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setLastInvite(null)}><X size={12} /></button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: 'var(--r-md)', padding: '1rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
              <div className="form-field" style={{ flex: 2, minWidth: 180 }}>
                <label className="form-label">Email <span style={{ fontWeight: 400, color: 'var(--t4)' }}>(optional hint)</span></label>
                <input className="input" type="email" placeholder="teammate@company.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-field" style={{ flex: 1, minWidth: 130 }}>
                <label className="form-label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
                {creating ? <><span className="spinner spinner-sm" style={{ borderTopColor: 'rgba(255,255,255,0.8)' }} /> Generating…</> : 'Generate Link'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={13} /></button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="spinner-wrap" style={{ padding: '2rem' }}><div className="spinner" /></div>
        ) : invites.length === 0 ? (
          <div className="empty" style={{ padding: '2rem' }}>
            <div className="empty-icon"><Users size={18} /></div>
            <div className="empty-title">No pending invitations</div>
            <div className="empty-text">Create an invitation link to add teammates to your organization.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email / Role</th>
                  <th>Invited by</th>
                  <th>Expires</th>
                  <th>Link</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invites.map(inv => (
                  <tr key={inv._id}>
                    <td>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                        {inv.email || <em style={{ color: 'var(--t3)', fontWeight: 400 }}>open invite</em>}
                      </div>
                      <span className={`role-${inv.role}`}>{inv.role}</span>
                    </td>
                    <td style={{ fontSize: '0.775rem', color: 'var(--t3)' }}>{inv.invitedBy?.email}</td>
                    <td style={{ fontSize: '0.775rem', color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(inv.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <code style={{ fontSize: '0.68rem', color: 'var(--t3)' }}>
                          …/invite/{inv.token.slice(0, 8)}…
                        </code>
                        <CopyButton text={`${window.location.origin}/invite/${inv.token}`} />
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleRevoke(inv._id)}>
                        <Trash2 size={12} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Webhooks Panel ─────────────────────────────────────── */
const FLAG_EVENTS = ['FLAG_CREATED', 'FLAG_UPDATED', 'FLAG_DELETED', 'FLAG_TOGGLED'];

const WebhooksPanel = ({ project }) => {
  const [hooks,     setHooks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [newSecret, setNewSecret] = useState(null);
  const [form,      setForm]      = useState({ url: '', label: '', events: [...FLAG_EVENTS] });

  const pId = project?._id ?? project?.id;

  const load = () => {
    if (!pId) return;
    setLoading(true);
    getWebhooks(pId)
      .then(r => setHooks(r.data.webhooks ?? []))
      .catch(() => toast.error('Failed to load webhooks'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [pId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.url) { toast.error('URL is required'); return; }
    setCreating(true);
    try {
      const r = await createWebhook({ projectId: pId, ...form });
      setNewSecret({ secret: r.data.webhook?.secret, id: r.data.webhook?._id });
      toast.success('Webhook created — save your signing secret!');
      setShowForm(false);
      setForm({ url: '', label: '', events: [...FLAG_EVENTS] });
      load();
    } catch { toast.error('Failed to create webhook'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this webhook?')) return;
    try { await deleteWebhook(id); toast.success('Webhook deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const handleToggleActive = async (hook) => {
    try {
      await updateWebhook(hook._id, { isActive: !hook.isActive });
      toast.success(hook.isActive ? 'Webhook disabled' : 'Webhook enabled');
      load();
    } catch { toast.error('Update failed'); }
  };

  const handleRotate = async (id) => {
    if (!confirm('Rotate signing secret? Current secret will stop working immediately.')) return;
    try {
      const r = await rotateSecret(id);
      setNewSecret({ secret: r.data.secret, id });
      toast.success('Secret rotated');
    } catch { toast.error('Rotate failed'); }
  };

  const toggleEvent = (evt) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(evt) ? f.events.filter(e => e !== evt) : [...f.events, evt],
    }));
  };

  return (
    <div>
      <div className="settings-section-header">
        <div>
          <div className="settings-section-title">Webhooks</div>
          <div className="settings-section-sub">Receive HTTP POST requests when flag events occur. Payloads are signed with HMAC-SHA256.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
          <Plus size={13} /> Add Webhook
        </button>
      </div>

      <div style={{ padding: '1rem 1.25rem' }}>
        {/* New secret banner */}
        {newSecret?.secret && (
          <div className="warn-box" style={{ marginBottom: '1.25rem', borderRadius: 'var(--r-md)' }}>
            <Shield size={14} color="var(--red-l)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.375rem' }}>
                Save this signing secret — it will not be shown again
              </div>
              <code style={{ fontSize: '0.72rem', wordBreak: 'break-all', color: 'var(--t2)', fontFamily: "'JetBrains Mono', monospace" }}>
                {newSecret.secret}
              </code>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
              <CopyButton text={newSecret.secret} />
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setNewSecret(null)}><X size={12} /></button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: 'var(--r-md)', padding: '1rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
              <div className="form-field" style={{ flex: 3, minWidth: 220 }}>
                <label className="form-label">Endpoint URL *</label>
                <input className="input" type="url" required
                  placeholder="https://your-app.com/webhooks/switchon"
                  value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              <div className="form-field" style={{ flex: 2, minWidth: 150 }}>
                <label className="form-label">Label <span style={{ fontWeight: 400, color: 'var(--t4)' }}>(optional)</span></label>
                <input className="input" placeholder="e.g. Production alerts"
                  value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: '0.875rem' }}>
              <label className="form-label" style={{ marginBottom: '0.375rem', display: 'block' }}>Events to send</label>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {FLAG_EVENTS.map(evt => (
                  <button key={evt} type="button"
                    className={`btn btn-sm ${form.events.includes(evt) ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => toggleEvent(evt)}
                    style={{ fontSize: '0.68rem', fontFamily: "'JetBrains Mono', monospace" }}>
                    {evt}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
                {creating ? <><span className="spinner spinner-sm" style={{ borderTopColor: 'rgba(255,255,255,0.8)' }} /> Creating…</> : 'Create Webhook'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={13} /></button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="spinner-wrap" style={{ padding: '2rem' }}><div className="spinner" /></div>
        ) : hooks.length === 0 ? (
          <div className="empty" style={{ padding: '2rem' }}>
            <div className="empty-icon"><Globe size={18} /></div>
            <div className="empty-title">No webhooks configured</div>
            <div className="empty-text">Add a webhook endpoint to receive notifications when flag events occur.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {hooks.map(h => (
              <div key={h._id} style={{
                padding: '0.875rem 1rem',
                borderRadius: 'var(--r-md)',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid var(--border)',
                opacity: h.isActive ? 1 : 0.55,
                transition: 'opacity var(--t-base), border-color var(--t-base)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 'var(--r)',
                    background: h.isActive ? 'var(--green-bg)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${h.isActive ? 'var(--green-bd)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <Globe size={13} color={h.isActive ? 'var(--green-l)' : 'var(--t4)'} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                      <code style={{ fontSize: '0.775rem', color: 'var(--t1)', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.url}
                      </code>
                      {h.label && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--t3)', flexShrink: 0 }}>{h.label}</span>
                      )}
                      {!h.isActive && (
                        <span className="badge badge-muted" style={{ fontSize: '0.6rem' }}>disabled</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                      {(h.events ?? []).map(e => (
                        <span key={e} style={{
                          fontSize: '0.6rem',
                          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          background: 'var(--accent-sub)', color: 'var(--accent-l)',
                          padding: '0.1rem 0.35rem', borderRadius: 'var(--r-xs)',
                          border: '1px solid rgba(99,102,241,0.15)',
                        }}>{e}</span>
                      ))}
                    </div>
                    {h.lastCalledAt && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--t4)' }}>
                        Last delivery:{' '}
                        {new Date(h.lastCalledAt).toLocaleString()} · HTTP {h.lastStatus ?? '—'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => handleToggleActive(h)}
                      title={h.isActive ? 'Disable webhook' : 'Enable webhook'}>
                      <ToggleLeft size={13} color={h.isActive ? 'var(--green-l)' : 'var(--t4)'} />
                    </button>
                    <button className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => handleRotate(h._id)} title="Rotate signing secret">
                      <Shield size={12} />
                    </button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(h._id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Tab config ─────────────────────────────────────────── */
const TABS = [
  { id: 'sdk-keys',    icon: Key,     label: 'SDK Keys',    sub: 'API authentication' },
  { id: 'invitations', icon: Users,   label: 'Invitations', sub: 'Team access'        },
  { id: 'webhooks',    icon: Globe,   label: 'Webhooks',    sub: 'Event delivery'     },
];

/* ── No project selected ────────────────────────────────── */
const NoProject = ({ message }) => (
  <div className="empty" style={{ padding: '2.5rem' }}>
    <div className="empty-icon"><Settings size={20} /></div>
    <div className="empty-title">No project selected</div>
    <div className="empty-text">{message}</div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   SETTINGS PAGE
══════════════════════════════════════════════════════════════ */
const SettingsPage = () => {
  const { projects, currentProject } = useProject();
  const [tab, setTab] = useState('sdk-keys');

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="ph">
        <div>
          <h1>
            <Settings size={17} style={{ color: 'var(--accent-l)', opacity: 0.85 }} />
            Settings
          </h1>
          <div className="ph-sub">
            {currentProject ? currentProject.name : 'No project selected'}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tabs-line" style={{ marginBottom: '1.5rem' }}>
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`tab-line${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={13} style={{ opacity: tab === id ? 1 : 0.6 }} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="settings-section">
        {tab === 'sdk-keys' && (
          currentProject
            ? <SdkKeysPanel project={currentProject} />
            : <NoProject message="Select a project from the sidebar to manage its SDK keys." />
        )}
        {tab === 'invitations' && <InvitationsPanel />}
        {tab === 'webhooks' && (
          currentProject
            ? <WebhooksPanel project={currentProject} />
            : <NoProject message="Select a project from the sidebar to manage its webhooks." />
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
