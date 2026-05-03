import { useEffect, useState } from 'react';
import { getUsers, updateRole, deactivateUser } from '../api/userApi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { UserX } from 'lucide-react';

const initials = (email = '') => email.slice(0, 2).toUpperCase();
const roleClass = r => `role-${r}`;

const UsersPage = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
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
    if (!confirm(`Deactivate ${u.email}?`)) return;
    try {
      await deactivateUser(u._id);
      toast.success('User deactivated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="ph">
        <div>
          <h1>Users</h1>
          <div className="ph-sub">{users.length} member{users.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMe = u._id === me?._id || u._id === me?.id;
                  return (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="avatar avatar-md">{initials(u.email)}</div>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--t1)' }}>{u.email}</div>
                            {isMe && <div style={{ fontSize: '0.7rem', color: 'var(--t3)' }}>You</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {isMe ? (
                          <span className={roleClass(u.role)}>{u.role}</span>
                        ) : (
                          <select
                            className="input"
                            value={u.role}
                            onChange={e => handleRole(u._id, e.target.value)}
                            style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          >
                            <option value="admin">admin</option>
                            <option value="developer">developer</option>
                            <option value="viewer">viewer</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {u.isActive
                          ? <span className="badge badge-green">● Active</span>
                          : <span className="badge badge-muted">● Inactive</span>}
                      </td>
                      <td style={{ color: 'var(--t3)', fontSize: '0.8rem' }}>
                        {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>
                        {!isMe && u.isActive && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(u)}>
                            <UserX size={13} /> Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
