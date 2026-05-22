import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, CheckSquare, Inbox, Video, DollarSign, Settings, Trash2 } from 'lucide-react';
import { useNotifications } from '../lib/notifications';
import './Sidebar.css';

const NAV = [
  { to: '/',             label: 'Visão Geral',    emoji: '🏠' },
  { to: '/clients',      label: 'Clientes',       emoji: '👥' },
  { to: '/tasks',        label: 'Tarefas',        emoji: '✅' },
  { to: '/meetings',     label: 'Reuniões',       emoji: '🗓️' },
  { to: '/finance',      label: 'Financeiro',     emoji: '💸' },
];

export default function Sidebar() {
  const { unread } = useNotifications();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">DNA</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">DNA CRM</span>
          <span className="sidebar-logo-sub">André &amp; Danyelle</span>
        </div>
        <button 
          className="sidebar-toggle-btn" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {isCollapsed ? '❯' : '❮'}
        </button>
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

      {/* Configurações e Lixeira no bottom */}
      <div style={{ marginTop: 'auto', padding: '0 20px', paddingBottom: '20px' }}>
        <nav className="sidebar-bottom-nav" style={{ display: 'flex', gap: '8px', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <NavLink
            to="/settings"
            title="Ajustes"
            className={({ isActive }) => `sidebar-icon-item ${isActive ? 'sidebar-item--active' : ''}`}
          >
            <span className="sidebar-item-emoji">⚙️</span>
          </NavLink>
          <NavLink
            to="/trash"
            title="Lixeira"
            className={({ isActive }) => `sidebar-icon-item ${isActive ? 'sidebar-item--active' : ''}`}
          >
            <span className="sidebar-item-emoji">🗑️</span>
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}
