import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchClients, fetchTasks, fetchInvoices } from '../lib/api';
import { ArrowRight, Plus, CheckSquare, BarChart, Link2 } from 'lucide-react';
import { useIsMobile } from '../lib/useIsMobile';
import './Home.css';

/* ── helpers ── */
const today = new Date().toISOString().split('T')[0];
const isOverdue = (date) => date < today;

const priorityLabel = { high: '🔴 Alta', medium: '🟡 Média', low: '🟢 Baixa' };

export default function Home() {
  const [clients, setClients] = useState([]);
  const [tasks, setTasks]     = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [error, setError]       = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    Promise.all([fetchClients(), fetchTasks(), fetchInvoices()])
      .then(([c, t, i]) => { setClients(c); setTasks(t); setInvoices(i); })
      .catch(e => setError(e.message));
  }, []);

  const active      = clients.filter(c => c.status === 'active');
  const negotiation = clients.filter(c => c.status === 'negotiation');
  const pending     = tasks.filter(t => t.status === 'pending');
  const completed   = tasks.filter(t => t.status === 'completed');

  /* next 4 pending tasks sorted by date */
  const upcoming = [...pending]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  const getClient = (id) => clients.find(c => c.id === id);

  const totalMrr = active.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
  
  const pendingInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
  let totalPending = 0;
  pendingInvoices.forEach(inv => {
    let finalAmount = Number(inv.amount) || 0;
    const client = getClient(inv.clientId);
    if (client && inv.dueDate < today) {
       const daysLate = Math.floor((new Date(today) - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
       if (daysLate > 0) {
          const mult = client.lateFeePercentage || 2;
          const juros = (client.lateFeeInterestPerMonth || 1) / 30; // pro-rata per day
          finalAmount = finalAmount + (finalAmount * (mult / 100)) + (finalAmount * (juros / 100) * daysLate);
       }
    }
    totalPending += finalAmount;
  });

  const formatBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

  /* ── Layout simplificado para mobile ── */
  if (isMobile) {
    return (
      <div className="home home--mobile">
        {error && (
          <div className="db-error">⚠️ Erro ao carregar dados: {error}</div>
        )}

        <header className="hm-greeting">
          <h1>Bom dia 👋</h1>
          <p>Resumo do seu negócio.</p>
        </header>

        <section className="hm-stats">
          <div className="hm-stat">
            <span className="hm-stat-label">Faturamento Total</span>
            <span className="hm-stat-value">{formatBRL(totalMrr)}</span>
          </div>
          <div className="hm-stat">
            <span className="hm-stat-label">Lucro Total</span>
            <span className="hm-stat-value" style={{ color: totalPending > 0 ? 'var(--orange)' : 'inherit' }}>
              {formatBRL(totalPending)}
            </span>
          </div>
          <div className="hm-stat">
            <span className="hm-stat-label">Clientes Ativos</span>
            <span className="hm-stat-value">{active.length}</span>
          </div>
          <div className="hm-stat">
            <span className="hm-stat-label">Tarefas Pendentes</span>
            <span className="hm-stat-value">{pending.length}</span>
          </div>
        </section>

        <section className="home-actions">
          <Link to="/clients" className="action-pill">
            <span className="action-pill-icon"><Plus size={16} /></span>
            Novo Cliente
          </Link>
          <Link to="/tasks" className="action-pill">
            <span className="action-pill-icon"><CheckSquare size={16} /></span>
            Nova Tarefa
          </Link>
          <Link to="/clients" className="action-pill">
            <span className="action-pill-icon"><BarChart size={16} /></span>
            Pipeline
          </Link>
        </section>

        <section className="hm-card">
          <div className="hm-head">
            <h2 className="hm-head-title">📋 Próximas Tarefas</h2>
            <Link to="/tasks" className="hm-head-link">Ver todas <ArrowRight size={14} /></Link>
          </div>
          <div className="hm-list">
            {upcoming.length === 0 ? (
              <p className="tasks-empty">Nenhuma tarefa pendente 🎉</p>
            ) : (
              upcoming.slice(0, 3).map(task => {
                const client = getClient(task.clientId);
                const overdue = isOverdue(task.dueDate);
                return (
                  <div key={task.id} className="hm-task">
                    <span className={`hm-dot ${overdue ? 'hm-dot--red' : 'hm-dot--orange'}`} />
                    <span className="hm-task-title">{task.title}</span>
                    <span className="hm-task-date">{client?.emoji} {task.dueDate}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="hm-card">
          <div className="hm-head">
            <h2 className="hm-head-title">👥 Seus Clientes</h2>
            <Link to="/clients" className="hm-head-link">Ver todos <ArrowRight size={14} /></Link>
          </div>
          <div className="hm-list">
            {clients.length === 0 ? (
              <p className="tasks-empty">Nenhum cliente cadastrado.</p>
            ) : (
              clients.slice(0, 4).map(client => (
                <div key={client.id} className="hm-client">
                  <span className="hm-client-emoji">{client.emoji}</span>
                  <span className="hm-client-name">{client.name}</span>
                  <span className={`badge ${client.status === 'active' ? 'badge-green' : 'badge-orange'}`}>
                    {client.status === 'active' ? 'Ativo' : 'Negoc.'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="home">

      {error && (
        <div className="db-error">⚠️ Erro ao carregar dados: {error}</div>
      )}

      {/* ── HERO SECTION ── */}
      <header className="home-hero">
        <div className="hero-greeting">
          <h1>Bom dia 👋</h1>
          <p>Aqui está o resumo do seu negócio hoje.</p>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-label">Faturamento Total</span>
            <span className="hero-stat-value">{formatBRL(totalMrr)}</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-label">Lucro Total</span>
            <span className="hero-stat-value" style={{ color: totalPending > 0 ? 'var(--orange)' : 'inherit' }}>
              {formatBRL(totalPending)}
            </span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-label">Clientes Ativos</span>
            <span className="hero-stat-value">{active.length}</span>
          </div>
        </div>
      </header>

      {/* ── QUICK ACTIONS ── */}
      <section className="home-actions">
        <Link to="/clients" className="action-pill">
          <span className="action-pill-icon"><Plus size={16} /></span>
          Novo Cliente
        </Link>
        <Link to="/tasks" className="action-pill">
          <span className="action-pill-icon"><CheckSquare size={16} /></span>
          Nova Tarefa
        </Link>
        <Link to="/clients" className="action-pill">
          <span className="action-pill-icon"><BarChart size={16} /></span>
          Pipeline
        </Link>
        <Link to="/clients" className="action-pill">
          <span className="action-pill-icon"><Link2 size={16} /></span>
          Conexões
        </Link>
      </section>

      {/* ── MAIN CONTENT ── */}
      <div className="home-body">
        
        {/* LEFT: Upcoming tasks */}
        <section className="home-section">
          <div className="section-head">
            <h2 className="section-title">📋 Próximas Tarefas</h2>
            <Link to="/tasks" className="section-link">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>

          <div className="task-list">
            {upcoming.length === 0 ? (
              <p className="tasks-empty">Nenhuma tarefa pendente no momento 🎉</p>
            ) : (
              upcoming.map(task => {
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
                      <p className="task-row-desc">{task.description || "Sem descrição"}</p>
                      <div className="task-row-meta">
                        <span className="task-meta-chip">
                          {client?.emoji} {client?.name}
                        </span>
                        <span className={`task-meta-chip ${overdue ? 'chip--red' : ''}`}>
                          {overdue ? '⚠️' : '📅'} {task.dueDate}
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
              })
            )}
          </div>
        </section>

        {/* RIGHT: Radar + Clients */}
        <aside className="home-aside">

          {/* Radar (Mini stats) */}
          <div className="aside-block radar-block">
            <h2 className="section-title" style={{ marginBottom: '16px' }}>Radar</h2>
            <div className="radar-grid">
              <div className="radar-item">
                <span className="radar-val">{pending.length}</span>
                <span className="radar-lbl">Pendentes</span>
              </div>
              <div className="radar-item">
                <span className="radar-val">{completed.length}</span>
                <span className="radar-lbl">Concluídas</span>
              </div>
              <div className="radar-item">
                <span className="radar-val">{negotiation.length}</span>
                <span className="radar-lbl">Propostas</span>
              </div>
            </div>
          </div>

          {/* Client list */}
          <div className="aside-block">
            <div className="section-head">
              <h2 className="section-title">👥 Seus Clientes</h2>
              <Link to="/clients" className="section-link">
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>
            <div className="client-mini-list">
              {clients.length === 0 ? (
                <p className="tasks-empty" style={{ margin: 0 }}>Nenhum cliente cadastrado.</p>
              ) : (
                clients.slice(0, 5).map(client => (
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
                ))
              )}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
