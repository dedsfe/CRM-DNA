import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useNotifications } from '../lib/notifications';
import { useIsMobile } from '../lib/useIsMobile';
import './Sidebar.css';

const NAV = [
  { to: '/',             label: 'Visão Geral',    short: 'Início',   emoji: '🏠' },
  { to: '/clients',      label: 'Clientes',       emoji: '👥' },
  { to: '/tasks',        label: 'Tarefas',        emoji: '✅' },
  { to: '/meetings',     label: 'Reuniões',       emoji: '🗓️' },
  { to: '/finance',      label: 'Financeiro',     short: 'Finanças', emoji: '💸' },
  { to: '/whiteboard',   label: 'Quadro Branco',  short: 'Canvas',   emoji: '🎨' },
];

const UTILITY_NAV = [
  { to: '/settings', label: 'Ajustes', emoji: '⚙️' },
  { to: '/trash',    label: 'Lixeira', emoji: '🗑️' },
];

const MOBILE_PRIMARY_COUNT = 4;

export default function Sidebar() {
  const { unread } = useNotifications();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const primaryNav = isMobile ? NAV.slice(0, MOBILE_PRIMARY_COUNT) : NAV;
  const mobileMoreNav = [...NAV.slice(MOBILE_PRIMARY_COUNT), ...UTILITY_NAV];
  const isMoreActive = mobileMoreNav.some(({ to }) => location.pathname === to);

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
      <nav className="sidebar-nav sidebar-nav--primary">
        <p className="sidebar-section-label">Menu</p>
        {primaryNav.map(({ to, label, short, emoji, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
          >
            <span className="sidebar-item-emoji">{emoji}</span>
            <span className="sidebar-item-label">{isMobile && short ? short : label}</span>
            {badge && unread > 0 && (
              <span className="sidebar-badge">{unread}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Configurações e Lixeira no bottom */}
      <div className="sidebar-bottom-container">
        <nav className="sidebar-nav sidebar-nav--secondary">
          {UTILITY_NAV.map(({ to, label, emoji }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
            >
              <span className="sidebar-item-emoji">{emoji}</span>
              <span className="sidebar-item-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <details
        className="sidebar-mobile-more"
        open={isMobileMoreOpen}
        onToggle={(event) => setIsMobileMoreOpen(event.currentTarget.open)}
      >
        <summary className={`sidebar-item sidebar-mobile-more-trigger ${isMoreActive ? 'sidebar-item--active' : ''}`}>
          <span className="sidebar-item-emoji">•••</span>
          <span className="sidebar-item-label">Mais</span>
        </summary>
        <div className="sidebar-mobile-more-menu">
          {mobileMoreNav.map(({ to, label, short, emoji }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsMobileMoreOpen(false)}
              className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
            >
              <span className="sidebar-item-emoji">{emoji}</span>
              <span className="sidebar-item-label">{short || label}</span>
            </NavLink>
          ))}
        </div>
      </details>
    </aside>
  );
}
