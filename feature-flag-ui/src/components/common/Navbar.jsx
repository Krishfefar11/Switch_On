import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Flag, Users, ClipboardList, LogOut, Zap
} from 'lucide-react';

const initials = (email = '') => email.slice(0, 2).toUpperCase();

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
  >
    <Icon className="nav-icon" size={16} />
    {label}
  </NavLink>
);

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sidebar-nav">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={16} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">SwitchOn</div>
          <div className="sidebar-logo-sub">Feature Flags</div>
        </div>
      </div>

      {/* Links */}
      <div className="sidebar-links">
        <div className="sidebar-section-label">Navigation</div>
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/flags"     icon={Flag}            label="Flags" />
        {user?.role === 'admin' && (
          <NavItem to="/users" icon={Users} label="Users" />
        )}
        <NavItem to="/audit" icon={ClipboardList} label="Audit Logs" />
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-card" style={{ marginBottom: '0.5rem' }}>
          <div className="avatar">{initials(user?.email)}</div>
          <div className="user-info">
            <div className="user-email">{user?.email}</div>
            <div className="user-role-tag">{user?.role}</div>
          </div>
        </div>
        <button className="nav-link btn-ghost" onClick={handleLogout} style={{ width: '100%', color: 'var(--t3)' }}>
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
