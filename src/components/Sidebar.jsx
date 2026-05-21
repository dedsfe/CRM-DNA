import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ListTodo, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import './Sidebar.css';

const NAV = [
  { to: '/',        icon: LayoutDashboard, label: 'Home',     emoji: '🏠' },
  { to: '/clients', icon: Users,           label: 'Clientes', emoji: '👥' },
  { to: '/tasks',   icon: ListTodo,        label: 'Tarefas',  emoji: '✅' },
];

const TEAM = [
  { name: 'André',    initial: 'A', avatar: 'sidebar-avatar--blue' },
  { name: 'Danyelle', initial: 'D', avatar: 'sidebar-avatar--purple' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">CM</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">Client Manager</span>
          <span className="sidebar-logo-sub">André &amp; Danyelle</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Menu</p>
        {NAV.map(({ to, label, emoji }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
          >
            <span className="sidebar-item-emoji">{emoji}</span>
            <span className="sidebar-item-label">{label}</span>
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
      <button className="sidebar-settings" onClick={logout}>
        <LogOut size={16} />
        Sair
      </button>
    </aside>
  );
}
