import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  LayoutDashboard, Flag, Users, ClipboardList,
  LogOut, Zap, Settings, ChevronDown, Check, FolderOpen, Menu, X,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const initials = (email = '') => {
  const parts = email.split('@')[0].split(/[._-]/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : email.slice(0, 2).toUpperCase();
};

/* ── Project Selector ──────────────────────────────────────────── */
const ProjectSelector = ({ onNavigate }) => {
  const { projects, currentProject, switchProject } = useProject();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  if (!projects.length) return null;

  const name = currentProject?.name ?? 'Select project';

  return (
    <div ref={ref} className="project-selector">
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
          padding: '0.4375rem 0.625rem',
          borderRadius: 'var(--r)',
          background: open ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'var(--border-h)' : 'var(--border)'}`,
          color: 'var(--t2)',
          fontSize: '0.775rem', fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background var(--t-base), border-color var(--t-base)',
          letterSpacing: '-0.01em',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', minWidth: 0 }}>
          <FolderOpen size={11} style={{ flexShrink: 0, color: 'var(--t4)' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
        </div>
        <ChevronDown
          size={10}
          style={{
            flexShrink: 0, color: 'var(--t4)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform var(--t-base)',
          }}
        />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: '0.5rem', right: '0.5rem',
          zIndex: 60,
          background: 'var(--bg-3)',
          border: '1px solid var(--border-h)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'scaleIn 0.12s var(--ease)',
          transformOrigin: 'top center',
        }}>
          <div style={{
            padding: '0.4rem 0.75rem 0.25rem',
            fontSize: '0.6rem', fontWeight: 700, color: 'var(--t5)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Projects
          </div>

          {projects.map(p => {
            const pid   = String(p._id ?? p.id);
            const curId = String(currentProject?._id ?? currentProject?.id ?? '');
            const active = pid === curId;
            return (
              <button
                key={pid}
                onClick={() => { switchProject(p); setOpen(false); onNavigate?.(); }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  background: active ? 'var(--accent-sub)' : 'transparent',
                  color: active ? 'var(--accent-l)' : 'var(--t2)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  transition: 'background var(--t-fast), color var(--t-fast)',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--t1)'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}}
              >
                <span style={{
                  width: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {active && <Check size={11} />}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── Nav Item ─────────────────────────────────────────────────── */
const NavItem = ({ to, icon: Icon, label, badge, onClick }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
    onClick={onClick}
  >
    <Icon className="nav-icon" size={15} />
    <span style={{ flex: 1 }}>{label}</span>
    {badge != null && (
      <span style={{
        fontSize: '0.6rem', fontWeight: 700,
        background: 'var(--accent-sub)',
        color: 'var(--accent-l)',
        padding: '0.1rem 0.35rem',
        borderRadius: 'var(--r-full)',
        border: '1px solid rgba(99,102,241,0.2)',
        letterSpacing: '0.01em',
      }}>
        {badge}
      </span>
    )}
  </NavLink>
);

/* ── Sidebar ─────────────────────────────────────────────────── */
const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const close = () => setMobileOpen(false);

  // Close on Escape
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const userInitials = initials(user?.email || '');
  const firstName = user?.email?.split('@')[0] ?? '';

  return (
    <>
      {/* ── Mobile header bar ─────────────────────────────────────── */}
      <header className="mobile-header">
        <button
          className="burger-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={16} />
        </button>

        <div className="mobile-header-logo">
          <div className="mobile-header-logo-icon">
            <Zap size={13} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="mobile-header-name">SwitchOn</span>
        </div>

        {/* User avatar in mobile header */}
        <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.6rem', flexShrink: 0, cursor: 'pointer' }}
          title={user?.email}>
          {userInitials}
        </div>
      </header>

      {/* ── Backdrop ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={close} aria-hidden="true" />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <nav className={`sidebar-nav${mobileOpen ? ' mobile-open' : ''}`} aria-label="Main navigation">

        {/* Logo row */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={13} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-logo-text">SwitchOn</div>
            <div className="sidebar-logo-sub">Feature Flags</div>
          </div>

          {/* Close button — mobile only */}
          <button
            className="sidebar-close-btn"
            onClick={close}
            aria-label="Close navigation"
          >
            <X size={13} />
          </button>
        </div>

        {/* Project selector */}
        <div style={{ paddingTop: '0.5rem' }}>
          <ProjectSelector onNavigate={close} />
        </div>

        {/* Navigation */}
        <div className="sidebar-links">
          <div className="sidebar-section-label">Navigation</div>

          <NavItem to="/dashboard" icon={LayoutDashboard} label="Overview"  onClick={close} />
          <NavItem to="/flags"     icon={Flag}            label="Flags"     onClick={close} />

          {user?.role === 'admin' && (
            <NavItem to="/users" icon={Users} label="Team" onClick={close} />
          )}

          <NavItem to="/audit"    icon={ClipboardList} label="Audit Log" onClick={close} />

          <div className="sidebar-section-label" style={{ marginTop: '0.25rem' }}>Account</div>
          <NavItem to="/settings" icon={Settings} label="Settings" onClick={close} />
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* User card */}
          <div className="user-card">
            <div className="avatar" style={{ width: 26, height: 26, fontSize: '0.58rem', flexShrink: 0 }}>
              {userInitials}
            </div>
            <div className="user-info">
              <div className="user-email" title={user?.email}>{user?.email}</div>
              <div className="user-role-tag">{user?.role}</div>
            </div>
          </div>

          {/* Sign out */}
          <button
            className="nav-link"
            onClick={handleLogout}
            style={{ color: 'var(--t4)', marginTop: '1px' }}
          >
            <LogOut size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
            Sign out
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
