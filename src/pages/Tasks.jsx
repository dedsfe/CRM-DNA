import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { USERS } from '../mockData';
import { fetchClients, fetchTasks, insertTask, updateTask, deleteTask, notifyAssignees, notifyMentions } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUndo } from '../lib/undo';
import Modal from '../components/Modal';
import MentionTextarea from '../components/MentionTextarea';
import CommentThread from '../components/CommentThread';
import { Plus, CheckCircle2, Circle, Trash2, X, AlertTriangle, MessageSquare, ArrowRight } from 'lucide-react';
import './Tasks.css';

/* ─── helpers ─── */
const today = new Date().toISOString().split('T')[0];
const getStartOfWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
};
const getEndOfWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 6);
  return d.toISOString().split('T')[0];
};

const isOverdue = (d) => d < today;

const WIP_LIMIT = 5;

/* Countdown: returns { text, urgency: 'ok'|'soon'|'late' } */
function countdown(dueDateStr) {
  const due = new Date(dueDateStr + 'T23:59:59');
  const now = new Date();
  const diff = due - now;
  if (diff < 0) return { text: 'Atrasada', urgency: 'late' };
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0 && hours <= 23) return { text: hours <= 1 ? 'Menos de 1h' : `${hours}h restantes`, urgency: 'soon' };
  if (days === 1) return { text: '1 dia restante', urgency: 'soon' };
  if (days <= 3)  return { text: `${days} dias`, urgency: 'soon' };
  return { text: `${days} dias`, urgency: 'ok' };
}

const priorityConfig = {
  high:   { dot: 'dot--red',    label: 'Alta',  icon: '🔴' },
  medium: { dot: 'dot--orange', label: 'Média', icon: '🟡' },
  low:    { dot: 'dot--green',  label: 'Baixa', icon: '🟢' },
};

const userEmoji = (u) => (u === 'André' ? '🧑' : '👩');
const toggleInArray = (arr, val) =>
  arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

/* ─── Campos compartilhados do formulário de tarefa ─── */
function TaskFields({ form, set, clients }) {
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
        <MentionTextarea
          value={form.description}
          onChange={v => set('description', v)}
          placeholder="Descreva a tarefa… digite @ para marcar alguém"
        />
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
function InlineAddTask({ status, clients, onAdd, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', dueDate: '', assignees: ['André'],
    priority: 'medium', clientId: clients[0]?.id ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.title.trim() && form.dueDate && form.clientId && form.assignees.length > 0;

  return (
    <div className="inline-form">
      <TaskFields form={form} set={set} clients={clients} />
      <div className="inline-form-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className="btn btn-primary btn-sm" disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            await onAdd({ ...form, status });
            onCancel();
          }}>
          {busy ? 'Adicionando…' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}

/* ─── Task Card (full detail) ─── */
function TaskCard({ task, clients, onToggle, onDelete, onEdit, onComment, onAdvance, draggedTask, setDraggedTask }) {
  const client  = clients.find(c => c.id === task.clientId);
  const overdue = isOverdue(task.dueDate) && task.status !== 'completed';
  const done    = task.status === 'completed';
  const p       = priorityConfig[task.priority];
  const isDragging = draggedTask?.id === task.id;
  const cd      = !done ? countdown(task.dueDate) : null;

  const advanceLabel = task.status === 'pending' ? 'Em Andamento' : 'Concluir';

  return (
    <div className={`tcard ${done ? 'tcard--done' : ''} ${overdue ? 'tcard--overdue' : ''} ${isDragging ? 'tcard--dragging' : ''}`}
      draggable
      onDragStart={(e) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => setDraggedTask(null)}
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
            : task.status === 'in_progress'
              ? <Circle size={20} className="chk-orange" />
              : <Circle size={20} className="chk-gray" />}
        </button>

        <span className={`tcard-title ${done ? 'strikethrough' : ''}`}>
          {task.title}
        </span>

        <div className="tcard-actions">
          <span className={`priority-dot ${p.dot}`} title={p.label} />
          {!done && (
            <button
              className="advance-btn"
              title={`Mover para: ${advanceLabel}`}
              onClick={(e) => { e.stopPropagation(); onAdvance(task.id); }}>
              <ArrowRight size={13} />
            </button>
          )}
          <button className="comment-btn" title="Comentários"
            onClick={(e) => { e.stopPropagation(); onComment(task); }}>
            <MessageSquare size={13} />
          </button>
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
          {cd && (
            <span className={`chip chip--countdown chip--countdown-${cd.urgency}`}>
              ⏱ {cd.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Coluna do Kanban ─── */
function KanbanColumn({ variant, emoji, stageLabel, title, tasks, status, clients,
                        adding, onStartAdd, onCancelAdd, onAdd, onToggle, onDelete, onEdit, onComment, onAdvance,
                        draggedTask, setDraggedTask, onDropTask, wipLimit }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isOverWip = wipLimit && tasks.length >= wipLimit;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (draggedTask && draggedTask.status !== status) {
      onDropTask({ ...draggedTask, status });
    }
    setDraggedTask(null);
  };

  let dropClass = '';
  if (isDragOver && draggedTask) {
    dropClass = draggedTask.status === status ? 'k-col-body--drag-invalid' : 'k-col-body--drag-valid';
  }

  return (
    <div className={`k-col ${isOverWip ? 'k-col--wip-exceeded' : ''}`}>
      <div className={`k-col-head k-col-head--${variant}`}>
        <div className="k-col-head-left">
          <span className="k-col-emoji">{emoji}</span>
          <div>
            <p className="k-col-stage">{stageLabel}</p>
            <h3 className="k-col-title">{title}</h3>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOverWip && (
            <span className="k-wip-badge" title={`Limite de ${wipLimit} tarefas atingido`}>
              ⚠️ WIP
            </span>
          )}
          <span className={`k-count ${isOverWip ? 'k-count--wip' : ''}`}>{tasks.length}{wipLimit ? `/${wipLimit}` : ''}</span>
        </div>
      </div>
      <div className={`k-col-body ${dropClass}`}
           onDragOver={handleDragOver}
           onDragEnter={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={handleDrop}>
        {tasks.length === 0 && !adding
          ? <div className="k-empty"><span>🎉</span><p>Tudo limpo!</p></div>
          : tasks.map(t => (
              <TaskCard key={t.id} task={t} clients={clients}
                onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onComment={onComment} onAdvance={onAdvance}
                draggedTask={draggedTask} setDraggedTask={setDraggedTask} />
            ))
        }
        {adding
          ? <InlineAddTask status={status} clients={clients} onAdd={onAdd} onCancel={onCancelAdd} />
          : (!adding && onStartAdd && <button className="k-add" onClick={onStartAdd} disabled={clients.length === 0}>
              <Plus size={15} /> Nova tarefa
            </button>)
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
  const [filterClient, setFilterClient] = useState('All');
  const [filterDate, setFilterDate] = useState('All');
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [addingStage, setAddingStage] = useState(null);
  const [commentTarget, setCommentTarget] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const { user } = useAuth();
  const { notifyDeleted } = useUndo();
  const [searchParams, setSearchParams] = useSearchParams();

  const openComments = (task) =>
    setCommentTarget({ type: 'task', id: task.id, title: task.title });

  useEffect(() => {
    Promise.all([fetchClients(), fetchTasks()])
      .then(([c, t]) => { setClients(c); setTasks(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* Listen for undo restores */
  useEffect(() => {
    const onRestore = () => fetchTasks().then(setTasks);
    window.addEventListener('itemRestored', onRestore);
    return () => window.removeEventListener('itemRestored', onRestore);
  }, []);

  /* Abre a tarefa vinda de um link da caixa de entrada (?task=ID) */
  useEffect(() => {
    const id = searchParams.get('task');
    if (!id || tasks.length === 0) return;
    const t = tasks.find(x => x.id === id);
    if (t) {
      setEditing(t);
      setSearchParams({}, { replace: true });
    }
  }, [tasks, searchParams, setSearchParams]);

  const add = async (task) => {
    try {
      const saved = await insertTask(task);
      setTasks(p => [saved, ...p]);
      await notifyAssignees(saved, user, 'assigned');
      await notifyMentions(saved, user);
    } catch (e) { setError(e.message); }
  };
  const update = async (task) => {
    try {
      const saved = await updateTask(task);
      setTasks(p => p.map(t => t.id === saved.id ? saved : t));
      await notifyAssignees(saved, user, 'updated');
      await notifyMentions(saved, user);
    } catch (e) { setError(e.message); }
  };
  const remove = async (id) => {
    const t = tasks.find(x => x.id === id);
    try {
      await deleteTask(id);
      setTasks(p => p.filter(x => x.id !== id));
      if (t) notifyDeleted('task', id, t.title);
    } catch (e) { setError(e.message); }
  };
  const toggle = async (id) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    // Cycle: pending → in_progress → completed → pending
    const nextStatus = t.status === 'pending' ? 'in_progress'
                     : t.status === 'in_progress' ? 'completed'
                     : 'pending';
    const next = { ...t, status: nextStatus };
    try { const saved = await updateTask(next); setTasks(p => p.map(x => x.id === id ? saved : x)); }
    catch (e) { setError(e.message); }
  };

  /* Quick-advance: pending→in_progress, in_progress→completed */
  const advance = async (id) => {
    const t = tasks.find(x => x.id === id);
    if (!t || t.status === 'completed') return;
    const nextStatus = t.status === 'pending' ? 'in_progress' : 'completed';
    const next = { ...t, status: nextStatus };
    try { const saved = await updateTask(next); setTasks(p => p.map(x => x.id === id ? saved : x)); }
    catch (e) { setError(e.message); }
  };

  /* Filter logic */
  let byFilter = tasks;
  
  if (filterUser !== 'All') {
    byFilter = byFilter.filter(t => t.assignees.includes(filterUser));
  }
  if (filterClient !== 'All') {
    byFilter = byFilter.filter(t => t.clientId === filterClient);
  }
  if (filterDate !== 'All') {
    if (filterDate === 'today') {
      byFilter = byFilter.filter(t => t.dueDate === today);
    } else if (filterDate === 'overdue') {
      byFilter = byFilter.filter(t => isOverdue(t.dueDate) && t.status !== 'completed');
    } else if (filterDate === 'week') {
      const s = getStartOfWeek();
      const e = getEndOfWeek();
      byFilter = byFilter.filter(t => t.dueDate >= s && t.dueDate <= e);
    }
  }

  if (filterStage !== 'All') {
    const requiredStatus = filterStage === 'pre-acquisition' ? 'negotiation' : 'active';
    byFilter = byFilter.filter(t => {
      const c = clients.find(client => client.id === t.clientId);
      return c && c.status === requiredStatus;
    });
  }

  const pendingTasks = byFilter.filter(t => t.status === 'pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const inProgressTasks = byFilter.filter(t => t.status === 'in_progress')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completedTasks = byFilter.filter(t => t.status === 'completed')
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const overdue = [...pendingTasks, ...inProgressTasks].filter(t => isOverdue(t.dueDate));

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
          <span className="summary-n">{pendingTasks.length}</span>
          <span className="summary-l">⏳ A Fazer</span>
        </div>
        <div className="summary-item summary-item--blue">
          <span className="summary-n">{inProgressTasks.length}</span>
          <span className="summary-l">🔥 Em Andamento</span>
        </div>
        <div className="summary-item summary-item--red">
          <span className="summary-n">{overdue.length}</span>
          <span className="summary-l">⚠️ Atrasadas</span>
        </div>
        <div className="summary-item summary-item--green">
          <span className="summary-n">{completedTasks.length}</span>
          <span className="summary-l">✅ Concluídas</span>
        </div>
      </div>

      {/* ── FILTER PILLS ── */}
      <div className="filter-row">
        
        {/* Linha 1: Filtros Principais (Pessoas e Etapas) */}
        <div className="filter-main-row">
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

          <div className="filter-pills">
            {[
              { val: 'All',              label: '📋 Qualquer Fase' },
              { val: 'pre-acquisition',  label: '🎯 Clientes em Negociação' },
              { val: 'post-acquisition', label: '🚀 Clientes Ativos' },
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

        {/* Linha 2: Filtros Secundários (Cliente e Data) */}
        <div className="filter-select-row">
          <select
            className="input filter-select"
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
          >
            <option value="All">🏢 Todos os clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>

          <select
            className="input filter-select filter-select--date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          >
            <option value="All">📅 Todas as datas</option>
            <option value="today">⏱️ Hoje</option>
            <option value="week">📆 Esta semana</option>
            <option value="overdue">⚠️ Atrasadas</option>
          </select>
        </div>
      </div>

      {/* ── KANBAN COLUMNS ── */}
      <div className="kanban kanban--three">
        <KanbanColumn
          variant="blue" emoji="⏳" stageLabel="Tarefas" title="A Fazer"
          status="pending" tasks={pendingTasks} clients={clients}
          adding={addingStage === 'pending'}
          onStartAdd={() => setAddingStage('pending')}
          onCancelAdd={() => setAddingStage(null)}
          onAdd={add} onToggle={toggle} onDelete={remove} onEdit={setEditing}
          onComment={openComments} onAdvance={advance}
          draggedTask={draggedTask} setDraggedTask={setDraggedTask} onDropTask={update}
        />

        <KanbanColumn
          variant="orange" emoji="🔥" stageLabel="Tarefas" title="Em Andamento"
          status="in_progress" tasks={inProgressTasks} clients={clients}
          adding={addingStage === 'in_progress'}
          onStartAdd={() => setAddingStage('in_progress')}
          onCancelAdd={() => setAddingStage(null)}
          onAdd={add} onToggle={toggle} onDelete={remove} onEdit={setEditing}
          onComment={openComments} onAdvance={advance}
          draggedTask={draggedTask} setDraggedTask={setDraggedTask} onDropTask={update}
          wipLimit={WIP_LIMIT}
        />

        <KanbanColumn
          variant="green" emoji="✅" stageLabel="Tarefas" title="Feito"
          status="completed" tasks={completedTasks} clients={clients}
          adding={false}
          onStartAdd={null}
          onCancelAdd={() => setAddingStage(null)}
          onAdd={add} onToggle={toggle} onDelete={remove} onEdit={setEditing}
          onComment={openComments} onAdvance={advance}
          draggedTask={draggedTask} setDraggedTask={setDraggedTask} onDropTask={update}
        />
      </div>
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

      {/* ── THREAD DE COMENTÁRIOS ── */}
      {commentTarget && (
        <CommentThread
          parentType={commentTarget.type}
          parentId={commentTarget.id}
          parentTitle={commentTarget.title}
          onClose={() => setCommentTarget(null)}
        />
      )}
    </div>
  );
}
