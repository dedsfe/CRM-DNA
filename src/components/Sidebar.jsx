import { NavLink } from 'react-router-dom';
import { useNotifications } from '../lib/notifications';
import './Sidebar.css';

const NAV = [
  { to: '/',             label: 'Home',           emoji: '🏠' },
  { to: '/clients',      label: 'Clientes',       emoji: '👥' },
  { to: '/tasks',        label: 'Tarefas',        emoji: '✅' },
  { to: '/inbox',        label: 'Inbox',          emoji: '🔔', badge: true },
];

export default function Sidebar() {
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

      {/* Configurações at bottom */}
      <div style={{ marginTop: 'auto' }}>
        <nav className="sidebar-nav">
          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
          >
            <span className="sidebar-item-emoji">⚙️</span>
            <span className="sidebar-item-label">Configurações</span>
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}
