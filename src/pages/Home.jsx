import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchClients, fetchTasks } from '../lib/api';
import { ArrowRight, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import './Home.css';

/* ── helpers ── */
const today = new Date().toISOString().split('T')[0];
const isOverdue = (date) => date < today;

const priorityLabel = { high: '🔴 Alta', medium: '🟡 Média', low: '🟢 Baixa' };

export default function Home() {
  const [clients, setClients] = useState([]);
  const [tasks, setTasks]     = useState([]);
  const [error, setError]     = useState(null);

  useEffect(() => {
    Promise.all([fetchClients(), fetchTasks()])
      .then(([c, t]) => { setClients(c); setTasks(t); })
      .catch(e => setError(e.message));
  }, []);

  const active      = clients.filter(c => c.status === 'active');
  const negotiation = clients.filter(c => c.status === 'negotiation');
  const pending     = tasks.filter(t => t.status === 'pending');
  const completed   = tasks.filter(t => t.status === 'completed');

  /* next 3 pending tasks sorted by date */
  const upcoming = [...pending]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  const getClient = (id) => clients.find(c => c.id === id);

  return (
    <div className="home">

      {error && (
        <div className="db-error">⚠️ Erro ao carregar dados: {error}</div>
      )}

      {/* ── TOP BAR ── */}
      <header className="home-topbar">
        <div>
          <p className="home-greeting">Bom dia 👋</p>
          <h1 className="home-title">Dashboard</h1>
        </div>
        <Link to="/clients" className="btn btn-primary">
          + Novo Cliente
        </Link>
      </header>

      {/* ── STAT CARDS ── */}
      <section className="home-stats">
        <div className="stat-card stat-card--blue">
          <div className="stat-card-top">
            <span className="stat-card-emoji">🏢</span>
            <span className="stat-card-label">Clientes Ativos</span>
          </div>
          <p className="stat-card-number">{active.length}</p>
          <p className="stat-card-sub">contratos em andamento</p>
        </div>

        <div className="stat-card stat-card--dark">
          <div className="stat-card-top">
            <span className="stat-card-emoji">🤝</span>
            <span className="stat-card-label">Em Negociação</span>
          </div>
          <p className="stat-card-number">{negotiation.length}</p>
          <p className="stat-card-sub">propostas abertas</p>
        </div>

        <div className="stat-card stat-card--light">
          <div className="stat-card-top">
            <span className="stat-card-emoji">⏳</span>
            <span className="stat-card-label">Tarefas Pendentes</span>
          </div>
          <p className="stat-card-number" style={{ color: '#1d1d1f' }}>{pending.length}</p>
          <p className="stat-card-sub" style={{ color: '#86868b' }}>a serem concluídas</p>
        </div>

        <div className="stat-card stat-card--green">
          <div className="stat-card-top">
            <span className="stat-card-emoji">✅</span>
            <span className="stat-card-label">Concluídas</span>
          </div>
          <p className="stat-card-number">{completed.length}</p>
          <p className="stat-card-sub">tarefas entregues</p>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <div className="home-body">

        {/* LEFT: Upcoming tasks */}
        <section className="home-section home-section--tasks">
          <div className="section-head">
            <h2 className="section-title">📋 Próximas Tarefas</h2>
            <Link to="/tasks" className="section-link">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>

          <div className="task-list">
            {upcoming.map(task => {
              const client = getClient(task.clientId);
              const overdue = isOverdue(task.dueDate);
              return (
                <div key={task.id} className="task-row">
                  <div className={`task-row-indicator ${overdue ? 'task-row-indicator--red' : 'task-row-indicator--orange'}`} />

                  <div className="task-row-body">
                    <div className="task-row-header">
                      <span className="task-row-title">{task.title}</span>
                      <span className="badge badge-gray">{priorityLabel[task.priority]}</span>
                    </div>
                    <p className="task-row-desc">{task.description}</p>
                    <div className="task-row-meta">
                      <span className="task-meta-chip">
                        {client?.emoji} {client?.name}
                      </span>
                      <span className="task-meta-chip">
                        📅 {task.dueDate}
                      </span>
                      {task.assignees.map(a => (
                        <span key={a} className={`task-meta-chip task-meta-chip--assignee ${a === 'André' ? 'chip--blue' : 'chip--purple'}`}>
                          {a === 'André' ? '🧑' : '👩'} {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT: Client list + quick actions */}
        <aside className="home-aside">

          {/* Client list */}
          <div className="aside-block">
            <div className="section-head">
              <h2 className="section-title">👥 Seus Clientes</h2>
              <Link to="/clients" className="section-link">
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>
            <div className="client-mini-list">
              {clients.map(client => (
                <div key={client.id} className="client-mini-row">
                  <span className="client-mini-emoji">{client.emoji}</span>
                  <div className="client-mini-info">
                    <p className="client-mini-name">{client.name}</p>
                    <p className="client-mini-since">desde {client.since}</p>
                  </div>
                  <span className={`badge ${client.status === 'active' ? 'badge-green' : 'badge-orange'}`}>
                    {client.status === 'active' ? 'Ativo' : 'Negoc.'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="aside-block aside-block--actions">
            <h2 className="section-title">⚡ Ações Rápidas</h2>
            <div className="quick-actions">
              <Link to="/clients" className="quick-action-btn">
                <span className="quick-action-icon">➕</span>
                <span>Novo Cliente</span>
              </Link>
              <Link to="/tasks" className="quick-action-btn">
                <span className="quick-action-icon">📝</span>
                <span>Nova Tarefa</span>
              </Link>
              <Link to="/tasks" className="quick-action-btn">
                <span className="quick-action-icon">📊</span>
                <span>Ver Pipeline</span>
              </Link>
              <Link to="/clients" className="quick-action-btn">
                <span className="quick-action-icon">🔗</span>
                <span>Conexões</span>
              </Link>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
