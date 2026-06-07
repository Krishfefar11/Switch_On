import { useEffect, useState } from 'react';
import { getUsers, updateRole, deactivateUser } from '../api/userApi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { UserX, Users, RefreshCw, Shield } from 'lucide-react';

const initials = (email = '') => {
  const parts = email.split('@')[0].split(/[._-]/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : email.slice(0, 2).toUpperCase();
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

/* ── Avatar colors per initials ─────────────────────────── */
const AVATAR_COLORS = [
  { bg: 'rgba(99,102,241,0.2)',  color: 'var(--accent-l)' },
  { bg: 'rgba(59,130,246,0.2)',  color: 'var(--blue-l)'   },
  { bg: 'rgba(34,197,94,0.2)',   color: 'var(--green-l)'  },
  { bg: 'rgba(245,158,11,0.2)',  color: 'var(--yellow-l)' },
  { bg: 'rgba(239,68,68,0.2)',   color: 'var(--red-l)'    },
  { bg: 'rgba(249,115,22,0.2)',  color: '#fdba74'         },
];

const avatarColor = (email = '') => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/* ── Skeleton row ────────────────────────────────────────── */
const SkeletonRow = () => (
  <tr>
    <td style={{ padding: '0.875rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div className="skeleton skeleton-text" style={{ width: 140 }} />
          <div className="skeleton skeleton-text" style={{ width: 70, height: 10 }} />
        </div>
      </div>
    </td>
    <td><div className="skeleton" style={{ width: 70, height: 20, borderRadius: 99 }} /></td>
    <td><div className="skeleton" style={{ width: 60, height: 20, borderRadius: 99 }} /></td>
    <td><div className="skeleton skeleton-text" style={{ width: 80 }} /></td>
    <td></td>
  </tr>
);

/* ══════════════════════════════════════════════════════════════
   USERS PAGE
══════════════════════════════════════════════════════════════ */
const UsersPage = () => {
  const { user: me } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getUsers({})
      .then(r => setUsers(r.data.users))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRole = async (id, role) => {
    try {
      await updateRole(id, role);
      toast.success('Role updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeactivate = async (u) => {
    if (!confirm(`Deactivate ${u.email}? They will lose access immediately.`)) return;
    try {
      await deactivateUser(u._id);
      toast.success(`${u.email} deactivated`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const activeCount = users.filter(u => u.isActive !== false).length;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="ph">
        <div>
          <h1>
            <Users size={17} style={{ color: 'var(--accent-l)', opacity: 0.85 }} />
            Team
          </h1>
          <div className="ph-sub">
            {loading ? 'Loading…' : (
              <>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{users.length}</span> member{users.length !== 1 ? 's' : ''}
                {activeCount < users.length && (
                  <>
                    <span style={{ color: 'var(--border-h)' }}>·</span>
                    <span style={{ color: 'var(--red-l)', fontVariantNumeric: 'tabular-nums' }}>{users.length - activeCount} inactive</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-secondary btn-sm btn-icon" onClick={load} title="Refresh"><RefreshCw size={13} /></button>
        </div>
      </div>

      <div className="card card-static" style={{ overflow: 'hidden' }}>
        {/* Info bar */}
        <div style={{
          padding: '0.625rem 1rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(99,102,241,0.04)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.75rem', color: 'var(--t3)',
        }}>
          <Shield size={12} style={{ flexShrink: 0, color: 'var(--accent-l)', opacity: 0.8 }} />
          Role changes take effect immediately. Admins have full access; Developers can manage flags; Viewers have read-only access.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty" style={{ padding: '3rem' }}>
                      <div className="empty-icon"><Users size={20} /></div>
                      <div className="empty-title">No team members</div>
                      <div className="empty-text">Invite teammates from Settings → Invitations.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isMe = u._id === me?._id || u._id === me?.id;
                  const av   = avatarColor(u.email);
                  const init = initials(u.email);
                  const active = u.isActive !== false;

                  return (
                    <tr key={u._id} style={{ opacity: active ? 1 : 0.55 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 'var(--r-md)',
                            background: av.bg, color: av.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: 700,
                            flexShrink: 0, letterSpacing: '0.02em',
                          }}>
                            {init}
                          </div>
                          <div>
                            <div style={{
                              fontSize: '0.8375rem', fontWeight: 600, color: 'var(--t1)',
                              letterSpacing: '-0.01em',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240,
                            }}>
                              {u.email}
                            </div>
                            {isMe && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--accent-l)', fontWeight: 600, marginTop: '0.1rem' }}>
                                You
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        {isMe ? (
                          <span className={`role-${u.role}`}>{u.role}</span>
                        ) : (
                          <select
                            className="input"
                            value={u.role}
                            onChange={e => handleRole(u._id, e.target.value)}
                            style={{ width: 'auto', minWidth: 120, padding: '0.3125rem 2rem 0.3125rem 0.6rem', fontSize: '0.775rem' }}
                          >
                            <option value="admin">Admin</option>
                            <option value="developer">Developer</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        )}
                      </td>

                      <td>
                        {active
                          ? <span className="badge badge-green">Active</span>
                          : <span className="badge badge-muted">Inactive</span>
                        }
                      </td>

                      <td style={{ fontSize: '0.775rem', color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtDate(u.createdAt)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {!isMe && active && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeactivate(u)}
                          >
                            <UserX size={12} /> Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
