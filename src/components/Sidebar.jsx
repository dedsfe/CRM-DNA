import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../lib/notifications';
import './Sidebar.css';

const NAV = [
  { to: '/',             label: 'Home',           emoji: '🏠' },
  { to: '/clients',      label: 'Clientes',       emoji: '👥' },
  { to: '/tasks',        label: 'Tarefas',        emoji: '✅' },
  { to: '/inbox',        label: 'Inbox',          emoji: '🔔', badge: true },
  { to: '/integrations', label: 'Integrações (IA)', emoji: '🤖' },
];

const TEAM = [
  { name: 'André',    initial: 'A', avatar: 'sidebar-avatar--blue' },
  { name: 'Danyelle', initial: 'D', avatar: 'sidebar-avatar--purple' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unread } = useNotifications();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">DNA</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">DNA CRM</span>
          <span className="sidebar-logo-sub">André &amp; Danyelle</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Menu</p>
        {NAV.map(({ to, label, emoji, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
          >
            <span className="sidebar-item-emoji">{emoji}</span>
            <span className="sidebar-item-label">{label}</span>
            {badge && unread > 0 && (
              <span className="sidebar-badge">{unread}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Users */}
      <div className="sidebar-users">
        <p className="sidebar-section-label">Equipe</p>
        {TEAM.map(({ name, initial, avatar }) => (
          <div key={name} className={`sidebar-user ${user === name ? 'sidebar-user--me' : ''}`}>
            <div className={`sidebar-avatar ${avatar}`}>{initial}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{name}</span>
              <span className="sidebar-user-role">{user === name ? 'Você' : 'Admin'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button className="btn btn-secondary sidebar-logout" onClick={logout}>
        <LogOut size={16} />
        Sair
      </button>
    </aside>
  );
}
