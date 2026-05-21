import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { USERS } from '../mockData';
import { fetchClients, fetchTasks, insertTask, updateTask, deleteTask } from '../lib/api';
import { Plus, CheckCircle2, Circle, Trash2, X, AlertTriangle } from 'lucide-react';
import './Tasks.css';

/* ─── helpers ─── */
const today = new Date().toISOString().split('T')[0];
const isOverdue = (d) => d < today;

const priorityConfig = {
  high:   { dot: 'dot--red',    label: 'Alta',  icon: '🔴' },
  medium: { dot: 'dot--orange', label: 'Média', icon: '🟡' },
  low:    { dot: 'dot--green',  label: 'Baixa', icon: '🟢' },
};

const userEmoji = (u) => (u === 'André' ? '🧑' : '👩');
const toggleInArray = (arr, val) =>
  arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

/* ─── Modal shell (rendered at document.body via portal) ─── */
function Modal({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ─── Campos compartilhados do formulário de tarefa ─── */
function TaskFields({ form, set, clients, showStage = true }) {
  return (
    <>
      <div className="field">
        <label className="field-label">Cliente *</label>
        <select className="input" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label">Título *</label>
        <input className="input" placeholder="Ex: Enviar proposta…"
          value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
      </div>

      <div className="field">
        <label className="field-label">Descrição</label>
        <textarea className="input textarea" rows={3}
          placeholder="Descreva a tarefa em detalhes…"
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label">Data de Entrega *</label>
          <input type="date" className="input"
            value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Responsáveis *</label>
          <div className="assignee-pick">
            {USERS.map(u => (
              <button type="button" key={u}
                className={`assignee-opt ${form.assignees.includes(u) ? 'assignee-opt--on' : ''}`}
                onClick={() => set('assignees', toggleInArray(form.assignees, u))}>
                {userEmoji(u)} {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="field-row">
        {showStage && (
          <div className="field">
            <label className="field-label">Etapa</label>
            <select className="input" value={form.stage} onChange={e => set('stage', e.target.value)}>
              <option value="pre-acquisition">🎯 Pré-Aquisição</option>
              <option value="post-acquisition">🚀 Pós-Aquisição</option>
            </select>
          </div>
        )}
        <div className="field">
          <label className="field-label">Prioridade</label>
          <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="high">🔴 Alta</option>
            <option value="medium">🟡 Média</option>
            <option value="low">🟢 Baixa</option>
          </select>
        </div>
      </div>
    </>
  );
}

/* ─── Modal de edição de tarefa ─── */
function TaskEditModal({ task, clients, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...task });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.title.trim() && form.dueDate && form.clientId && form.assignees.length > 0;

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <h3>✏️ Editar Tarefa</h3>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="modal-body">
        <TaskFields form={form} set={set} clients={clients} />
      </div>

      <div className="modal-foot">
        <button className="btn btn-secondary btn-sm" disabled={busy}
          onClick={async () => { setBusy(true); await onDelete(task.id); onClose(); }}>
          <Trash2 size={14} /> Excluir
        </button>
        <button className="btn btn-primary btn-sm" disabled={!valid || busy}
          onClick={async () => { setBusy(true); await onSave(form); onClose(); }}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Formulário inline (criar tarefa dentro da coluna) ─── */
function InlineAddTask({ stage, clients, onAdd, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', dueDate: '', assignees: ['André'],
    stage, priority: 'medium', clientId: clients[0]?.id ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.title.trim() && form.dueDate && form.clientId && form.assignees.length > 0;

  return (
    <div className="inline-form">
      <TaskFields form={form} set={set} clients={clients} showStage={false} />
      <div className="inline-form-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className="btn btn-primary btn-sm" disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            await onAdd({ ...form, status: 'pending' });
            onCancel();
          }}>
          {busy ? 'Adicionando…' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}

/* ─── Task Card (full detail) ─── */
function TaskCard({ task, clients, onToggle, onDelete, onEdit }) {
  const client  = clients.find(c => c.id === task.clientId);
  const overdue = isOverdue(task.dueDate) && task.status !== 'completed';
  const done    = task.status === 'completed';
  const p       = priorityConfig[task.priority];

  return (
    <div className={`tcard ${done ? 'tcard--done' : ''} ${overdue ? 'tcard--overdue' : ''}`}
      onClick={() => onEdit(task)}>
      {overdue && (
        <div className="tcard-overdue-bar">
          <AlertTriangle size={12} /> Atrasada
        </div>
      )}

      <div className="tcard-top">
        <button className="task-toggle"
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}>
          {done
            ? <CheckCircle2 size={20} className="chk-green" />
            : <Circle size={20} className="chk-gray" />}
        </button>

        <span className={`tcard-title ${done ? 'strikethrough' : ''}`}>
          {task.title}
        </span>

        <div className="tcard-actions">
          <span className={`priority-dot ${p.dot}`} title={p.label} />
          <button className="delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="tcard-desc">{task.description}</p>
      )}

      <div className="tcard-footer">
        <span className="tcard-client">
          {client?.emoji} {client?.name}
        </span>

        <div className="tcard-chips">
          {task.assignees.map(a => (
            <span key={a} className={`chip ${a === 'André' ? 'chip--blue' : 'chip--purple'}`}>
              {userEmoji(a)} {a}
            </span>
          ))}
          <span className={`chip ${overdue ? 'chip--red' : 'chip--gray'}`}>
            📅 {task.dueDate}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Coluna do Kanban ─── */
function KanbanColumn({ variant, emoji, stageLabel, title, tasks, stage, clients,
                        adding, onStartAdd, onCancelAdd, onAdd, onToggle, onDelete, onEdit }) {
  return (
    <div className="k-col">
      <div className={`k-col-head k-col-head--${variant}`}>
        <div className="k-col-head-left">
          <span className="k-col-emoji">{emoji}</span>
          <div>
            <p className="k-col-stage">{stageLabel}</p>
            <h3 className="k-col-title">{title}</h3>
          </div>
        </div>
        <span className="k-count">{tasks.length}</span>
      </div>
      <div className="k-col-body">
        {tasks.length === 0 && !adding
          ? <div className="k-empty"><span>🎉</span><p>Tudo limpo!</p></div>
          : tasks.map(t => (
              <TaskCard key={t.id} task={t} clients={clients}
                onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
            ))
        }
        {adding
          ? <InlineAddTask stage={stage} clients={clients} onAdd={onAdd} onCancel={onCancelAdd} />
          : <button className="k-add" onClick={onStartAdd} disabled={clients.length === 0}>
              <Plus size={15} /> Nova tarefa
            </button>
        }
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Tasks() {
  const [clients, setClients]   = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filterUser, setFilter] = useState('All');
  const [filterStage, setStage] = useState('All');
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [addingStage, setAddingStage] = useState(null);

  useEffect(() => {
    Promise.all([fetchClients(), fetchTasks()])
      .then(([c, t]) => { setClients(c); setTasks(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const add = async (task) => {
    try { const saved = await insertTask(task); setTasks(p => [saved, ...p]); }
    catch (e) { setError(e.message); }
  };
  const update = async (task) => {
    try { const saved = await updateTask(task); setTasks(p => p.map(t => t.id === saved.id ? saved : t)); }
    catch (e) { setError(e.message); }
  };
  const remove = async (id) => {
    try { await deleteTask(id); setTasks(p => p.filter(t => t.id !== id)); }
    catch (e) { setError(e.message); }
  };
  const toggle = async (id) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const next = { ...t, status: t.status === 'completed' ? 'pending' : 'completed' };
    try { const saved = await updateTask(next); setTasks(p => p.map(x => x.id === id ? saved : x)); }
    catch (e) { setError(e.message); }
  };

  /* Filtered task set */
  const byUser = filterUser === 'All' ? tasks : tasks.filter(t => t.assignees.includes(filterUser));
  const pending   = byUser.filter(t => t.status === 'pending');
  const completed = byUser.filter(t => t.status === 'completed');
  const overdue   = pending.filter(t => isOverdue(t.dueDate));

  const showPre  = filterStage === 'All' || filterStage === 'pre-acquisition';
  const showPost = filterStage === 'All' || filterStage === 'post-acquisition';

  const preTasks  = pending.filter(t => t.stage === 'pre-acquisition')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const postTasks = pending.filter(t => t.stage === 'post-acquisition')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="tp">

      {/* ── HEADER ── */}
      <div className="tp-header">
        <div>
          <h1 className="tp-title">✅ Tarefas</h1>
          <p className="tp-sub">Visão global de todas as entregas</p>
        </div>
      </div>

      {error && <div className="db-error">⚠️ {error}</div>}

      {loading ? (
        <div className="db-loading">Carregando tarefas…</div>
      ) : (
      <>
      {/* ── SUMMARY BAR ── */}
      <div className="summary-bar">
        <div className="summary-item summary-item--orange">
          <span className="summary-n">{pending.length}</span>
          <span className="summary-l">⏳ Pendentes</span>
        </div>
        <div className="summary-item summary-item--red">
          <span className="summary-n">{overdue.length}</span>
          <span className="summary-l">⚠️ Atrasadas</span>
        </div>
        <div className="summary-item summary-item--green">
          <span className="summary-n">{completed.length}</span>
          <span className="summary-l">✅ Concluídas</span>
        </div>
        <div className="summary-item summary-item--gray">
          <span className="summary-n">{tasks.length}</span>
          <span className="summary-l">📋 Total</span>
        </div>
      </div>

      {/* ── FILTER PILLS ── */}
      <div className="filter-row">
        <div className="filter-pills">
          {['All', ...USERS].map(u => (
            <button
              key={u}
              className={`filter-pill ${filterUser === u ? 'filter-pill--active' : ''}`}
              onClick={() => setFilter(u)}
            >
              {u === 'All' ? '👥 Todos' : u === 'André' ? '🧑 André' : '👩 Danyelle'}
            </button>
          ))}
        </div>

        <div className="filter-pills" style={{ marginLeft: 'auto' }}>
          {[
            { val: 'All',              label: '📋 Todas Etapas' },
            { val: 'pre-acquisition',  label: '🎯 Pré-Aquisição' },
            { val: 'post-acquisition', label: '🚀 Pós-Aquisição' },
          ].map(({ val, label }) => (
            <button
              key={val}
              className={`filter-pill ${filterStage === val ? 'filter-pill--active' : ''}`}
              onClick={() => setStage(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KANBAN COLUMNS ── */}
      <div className={`kanban ${filterStage !== 'All' ? 'kanban--single' : ''}`}>

        {showPre && (
          <KanbanColumn
            variant="blue" emoji="🎯" stageLabel="Etapa 1" title="Pré-Aquisição"
            stage="pre-acquisition" tasks={preTasks} clients={clients}
            adding={addingStage === 'pre-acquisition'}
            onStartAdd={() => setAddingStage('pre-acquisition')}
            onCancelAdd={() => setAddingStage(null)}
            onAdd={add} onToggle={toggle} onDelete={remove} onEdit={setEditing}
          />
        )}

        {showPost && (
          <KanbanColumn
            variant="green" emoji="🚀" stageLabel="Etapa 2" title="Pós-Aquisição"
            stage="post-acquisition" tasks={postTasks} clients={clients}
            adding={addingStage === 'post-acquisition'}
            onStartAdd={() => setAddingStage('post-acquisition')}
            onCancelAdd={() => setAddingStage(null)}
            onAdd={add} onToggle={toggle} onDelete={remove} onEdit={setEditing}
          />
        )}

      </div>

      {/* ── COMPLETED (collapsible) ── */}
      {completed.length > 0 && (
        <div className="done-section">
          <button className="done-toggle" onClick={() => setShowDone(d => !d)}>
            <CheckCircle2 size={16} className="chk-green" />
            {completed.length} tarefa{completed.length > 1 ? 's' : ''} concluída{completed.length > 1 ? 's' : ''}
            <span className="done-toggle-arrow">{showDone ? '▲' : '▼'}</span>
          </button>

          {showDone && (
            <div className="done-list">
              {completed.map(t => (
                <TaskCard key={t.id} task={t} clients={clients}
                  onToggle={toggle} onDelete={remove} onEdit={setEditing} />
              ))}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* ── MODAL DE EDIÇÃO ── */}
      {editing && (
        <TaskEditModal
          task={editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onSave={update}
          onDelete={remove}
        />
      )}
    </div>
  );
}
