import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { USERS } from '../mockData';
import {
  fetchClients, fetchTasks, fetchInvoices, fetchMeetings, fetchTransactions, insertClient, updateClient, deleteClient,
  insertTask, updateTask, deleteTask, notifyAssignees, notifyMentions,
  insertInvoice, markInvoicePaid, insertMeeting, updateMeeting, deleteMeeting
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUndo } from '../lib/undo';
import Modal from '../components/Modal';
import MentionTextarea from '../components/MentionTextarea';
import CommentThread from '../components/CommentThread';
import {
  Plus, Mail, Phone, ExternalLink,
  CheckCircle2, Circle, Trash2, X, Search, Pencil, MessageSquare, ChevronDown
} from 'lucide-react';
import { useIsMobile } from '../lib/useIsMobile';
import './Clients.css';

/* ─── helpers ─── */
const today = new Date().toISOString().split('T')[0];
const isOverdue = (d) => d < today;

const priorityConfig = {
  high:   { dot: 'dot--red',    label: '🔴 Alta'  },
  medium: { dot: 'dot--orange', label: '🟡 Média' },
  low:    { dot: 'dot--green',  label: '🟢 Baixa' },
};

const userEmoji = (u) => (u === 'André' ? '🧑' : '👩');
const toggleInArray = (arr, val) =>
  arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

/* ─── Modal de cliente (criar / editar) ─── */
function ClientModal({ client, onClose, onSave }) {
  const [form, setForm] = useState(client ?? {
    name: '', emoji: '🏢', status: 'active', since: today,
    mrr: 0, setupFee: 0, dueDay: 5, lateFeePercentage: 2, lateFeeInterestPerMonth: 1,
    contact: { email: '', phone: '' },
    connections: { drive: '', instagram: '', tiktok: '', website: '' },
  });
  const [busy, setBusy] = useState(false);
  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setC = (k, v) => setForm(p => ({ ...p, contact: { ...p.contact, [k]: v } }));
  const setL = (k, v) => setForm(p => ({ ...p, connections: { ...p.connections, [k]: v } }));
  const valid = form.name.trim();

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <h3>{client ? '✏️ Editar Cliente' : '👥 Novo Cliente'}</h3>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="modal-body">
        <div className="field-row">
          <div className="field" style={{ maxWidth: 96 }}>
            <label className="field-label">Emoji</label>
            <input className="input" value={form.emoji}
              onChange={e => set('emoji', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Nome *</label>
            <input className="input" placeholder="Ex: Padaria do João"
              value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">Status</label>
            <select className="input" value={form.status}
              onChange={e => set('status', e.target.value)}>
              <option value="active">✅ Ativo</option>
              <option value="negotiation">🤝 Negociação</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Cliente desde</label>
            <input type="date" className="input" value={form.since}
              onChange={e => set('since', e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">MRR (R$)</label>
            <input type="number" className="input" value={form.mrr}
              onChange={e => set('mrr', Number(e.target.value))} />
          </div>
          <div className="field">
            <label className="field-label">Setup Fee (R$)</label>
            <input type="number" className="input" value={form.setupFee}
              onChange={e => set('setupFee', Number(e.target.value))} />
          </div>
          <div className="field" style={{ maxWidth: 100 }}>
            <label className="field-label">Dia Venc.</label>
            <input type="number" min="1" max="31" className="input" value={form.dueDay}
              onChange={e => set('dueDay', Number(e.target.value))} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">E-mail</label>
            <input className="input" placeholder="contato@email.com"
              value={form.contact.email} onChange={e => setC('email', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Telefone</label>
            <input className="input" placeholder="+55 11 99999-0000"
              value={form.contact.phone} onChange={e => setC('phone', e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">📁 Drive</label>
            <input className="input" placeholder="https://drive.google.com/…"
              value={form.connections.drive} onChange={e => setL('drive', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">🌐 Website</label>
            <input className="input" placeholder="https://…"
              value={form.connections.website} onChange={e => setL('website', e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">📸 Instagram</label>
            <input className="input" placeholder="@usuario"
              value={form.connections.instagram} onChange={e => setL('instagram', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">🎵 TikTok</label>
            <input className="input" placeholder="@usuario"
              value={form.connections.tiktok} onChange={e => setL('tiktok', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="modal-foot">
        <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={busy}>Cancelar</button>
        <button className="btn btn-primary btn-sm" disabled={!valid || busy}
          onClick={async () => { setBusy(true); await onSave(form); onClose(); }}>
          {busy ? 'Salvando…' : (client ? 'Salvar' : 'Criar Cliente')}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Campos compartilhados do formulário de tarefa ─── */
function TaskFields({ form, set }) {
  return (
    <>
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
          <select className="input" value={form.priority}
            onChange={e => set('priority', e.target.value)}>
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
function TaskEditModal({ task, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...task });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.title.trim() && form.dueDate && form.assignees.length > 0;

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <h3>✏️ Editar Tarefa</h3>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="modal-body">
        <TaskFields form={form} set={set} />
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
function InlineAddTask({ clientId, onAdd, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', dueDate: '', assignees: ['André'], priority: 'medium',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.title.trim() && form.dueDate && form.assignees.length > 0;

  return (
    <div className="inline-form">
      <TaskFields form={form} set={set} />
      <div className="inline-form-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className="btn btn-primary btn-sm" disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            await onAdd({ ...form, clientId, status: 'pending' });
            onCancel();
          }}>
          {busy ? 'Adicionando…' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}

/* ─── Task Row ─── */
function TaskRow({ task, onToggle, onDelete, onEdit, onComment }) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'completed';
  const { dot } = priorityConfig[task.priority];
  const done = task.status === 'completed';

  return (
    <div className={`task-row ${done ? 'task-row--done' : ''}`} onClick={() => onEdit(task)}>
      <button className="task-toggle"
        onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}>
        {done
          ? <CheckCircle2 size={19} className="chk-green" />
          : <Circle size={19} className="chk-gray" />}
      </button>

      <div className="task-row-body">
        <div className="task-row-top">
          <span className={`task-row-title ${done ? 'strikethrough' : ''}`}>
            {task.title}
          </span>
          <div className="task-row-right">
            <span className={`priority-dot ${dot}`} />
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
          <p className="task-row-desc">{task.description}</p>
        )}

        <div className="task-row-chips">
          {task.assignees.map(a => (
            <span key={a} className={`chip ${a === 'André' ? 'chip--blue' : 'chip--purple'}`}>
              {userEmoji(a)} {a}
            </span>
          ))}
          <span className={`chip ${overdue ? 'chip--red' : 'chip--gray'}`}>
            {overdue ? '⚠️' : '📅'} {task.dueDate}
          </span>
          {done && <span className="chip chip--green">✅ Feito</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Coluna de tarefas do perfil ─── */
function TaskColumn({ variant, label, tasks, clientId, stage,
                      adding, onStartAdd, onCancelAdd, onAdd, onToggle, onDelete, onEdit, onComment }) {
  return (
    <div className="task-col">
      <div className={`task-col-head task-col-head--${variant}`}>
        <span>{label}</span>
        <span className="col-count">{tasks.length}</span>
      </div>
      <div className="task-col-body">
        {tasks.length === 0 && !adding
          ? <p className="tasks-empty">Nenhuma tarefa 🎉</p>
          : tasks.map(t =>
              <TaskRow key={t.id} task={t} onToggle={onToggle} onDelete={onDelete}
                onEdit={onEdit} onComment={onComment} />
            )
        }
        {adding
          ? <InlineAddTask clientId={clientId} onAdd={onAdd} onCancel={onCancelAdd} />
          : (!adding && onStartAdd && <button className="k-add" onClick={onStartAdd}>
              <Plus size={15} /> Nova tarefa
            </button>)
        }
      </div>
    </div>
  );
}

/* ─── Kanban de Clientes ─── */
function ClientCard({ c, tasks, isActive, onClick, draggedClient, setDraggedClient, onComment }) {
  const ct = tasks.filter(t => t.clientId === c.id);
  const pending = ct.filter(t => t.status === 'pending').length;
  const isDragging = draggedClient?.id === c.id;

  return (
    <button
      className={`client-card ${isActive ? 'client-card--active' : ''} ${isDragging ? 'client-card--dragging' : ''}`}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        setDraggedClient(c);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => setDraggedClient(null)}
    >
      <div className="cc-emoji">{c.emoji}</div>
      <div className="cc-info">
        <span className="cc-name">{c.name}</span>
        <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-orange'}`}>
          {c.status === 'active' ? 'Ativo' : 'Negociação'}
        </span>
      </div>
      {pending > 0 && <div className="cc-badge">{pending}</div>}
      <span
        className="comment-btn card-comment"
        role="button"
        tabIndex={0}
        title="Comentários"
        onClick={(e) => { e.stopPropagation(); onComment(c); }}
      >
        <MessageSquare size={13} />
      </span>
    </button>
  );
}

function ClientKanbanColumn({ status, label, emoji, variant, clients, tasks, selectedId, setSelectedId, draggedClient, setDraggedClient, onDropClient, onComment, isMobile }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (draggedClient && draggedClient.status !== status) {
      onDropClient({ ...draggedClient, status });
    }
    setDraggedClient(null);
  };

  let dropClass = '';
  if (isDragOver && draggedClient) {
    dropClass = draggedClient.status === status ? 'client-col-body--drag-invalid' : 'client-col-body--drag-valid';
  }

  return (
    <div className={`client-col ${isMobile && collapsed ? 'client-col--collapsed' : ''}`}>
      <div className={`client-col-head client-col-head--${variant}`}
           onClick={isMobile ? () => setCollapsed(c => !c) : undefined}>
        <div className="client-col-head-left">
          <span className="k-col-emoji">{emoji}</span>
          <h3 className="k-col-title">{label}</h3>
        </div>
        <div className="client-col-head-right">
          <span className="k-count">{clients.length}</span>
          {isMobile && <ChevronDown size={18} className="client-col-chevron" />}
        </div>
      </div>
      {!(isMobile && collapsed) && (
        <div className={`client-col-body ${dropClass}`}
             onDragOver={handleDragOver}
             onDragEnter={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}>
          {clients.length === 0 ? (
             <p className="tasks-empty">Nenhum cliente</p>
          ) : (
            clients.map(c => (
              <ClientCard
                key={c.id}
                c={c}
                tasks={tasks}
                isActive={selectedId === c.id}
                onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                draggedClient={draggedClient}
                setDraggedClient={setDraggedClient}
                onComment={onComment}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function Clients() {
  const [clients, setClients]   = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'finance'
  const [clientModal, setClientModal] = useState(null); // null | {} | {client}
  const [editingTask, setEditingTask] = useState(null);
  const [addingTask, setAddingTask] = useState(false);
  const [commentTarget, setCommentTarget] = useState(null);
  const [draggedClient, setDraggedClient] = useState(null);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { notifyDeleted } = useUndo();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const paramId = searchParams.get('id');
    const paramTab = searchParams.get('tab');
    const quickAction = searchParams.get('quickAction');
    if (paramId) setSelectedId(paramId);
    if (paramTab) setActiveTab(paramTab);
    if (quickAction === 'new-client') {
      setClientModal({});
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('quickAction');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openTaskComments   = (task)   => setCommentTarget({ type: 'task',   id: task.id,   title: task.title });
  const openClientComments = (client) => setCommentTarget({ type: 'client', id: client.id, title: client.name });

  const fetchData = () => {
    Promise.all([fetchClients(), fetchTasks(), fetchInvoices(), fetchMeetings(), fetchTransactions()])
      .then(([c, t, i, m, txs]) => { setClients(c); setTasks(t); setInvoices(i); setMeetings(m); setTransactions(txs); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('itemRestored', fetchData);
    return () => window.removeEventListener('itemRestored', fetchData);
  }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected = clients.find(c => c.id === selectedId) ?? null;

  const clientTasks = tasks.filter(t => t.clientId === selectedId);
  const pendingTasks = clientTasks.filter(t => t.status === 'pending');
  const completedTasks = clientTasks.filter(t => t.status === 'completed');
  const pendingCount = pendingTasks.length;

  /* task handlers */
  const toggle = async (id) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const next = { ...t, status: t.status === 'completed' ? 'pending' : 'completed' };
    try { const saved = await updateTask(next); setTasks(p => p.map(x => x.id === id ? saved : x)); }
    catch (e) { setError(e.message); }
  };
  const remove = async (id) => {
    const t = tasks.find(x => x.id === id);
    try {
      await deleteTask(id);
      setTasks(p => p.filter(x => x.id !== id));
      if (t) notifyDeleted('task', id, t.title);
    } catch (e) { setError(e.message); }
  };
  const addTask = async (task) => {
    try {
      const saved = await insertTask(task);
      setTasks(p => [saved, ...p]);
      await notifyAssignees(saved, user, 'assigned');
      await notifyMentions(saved, user);
    } catch (e) { setError(e.message); }
  };
  const updateTaskFn = async (task) => {
    try {
      const saved = await updateTask(task);
      setTasks(p => p.map(t => t.id === saved.id ? saved : t));
      await notifyAssignees(saved, user, 'updated');
      await notifyMentions(saved, user);
    } catch (e) { setError(e.message); }
  };

  /* client handler */
  const saveClient = async (client) => {
    try {
      if (client.id) {
        const saved = await updateClient(client);
        setClients(p => p.map(c => c.id === saved.id ? saved : c));
      } else {
        const saved = await insertClient(client);
        setClients(p => [...p, saved]);
      }
    } catch (e) { setError(e.message); }
  };

  const removeClient = async (id) => {
    const c = clients.find(x => x.id === id);
    if (!window.confirm('Mover este cliente e suas tarefas para a lixeira?')) return;
    try {
      await deleteClient(id);
      setClients(p => p.filter(x => x.id !== id));
      setSelectedId(null);
      if (c) notifyDeleted('client', id, c.name);
    } catch (e) { setError(e.message); }
  };

  const conns = [
    { key: 'drive',     emoji: '📁', label: 'Drive'     },
    { key: 'instagram', emoji: '📸', label: 'Instagram' },
    { key: 'tiktok',    emoji: '🎵', label: 'TikTok'    },
    { key: 'website',   emoji: '🌐', label: 'Website'   },
  ];

  return (
    <div className="cp">

      {/* ── PAGE HEADER ── */}
      <div className="cp-header">
        <div className="cp-header-left">
          <h1 className="cp-title">👥 Clientes</h1>
          <p className="cp-sub">{clients.length} clientes cadastrados</p>
        </div>
        <div className="cp-header-right">
          <div className="search-wrap">
            <Search size={14} className="search-ico" />
            <input className="search-input" placeholder="Buscar cliente…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setClientModal({})}>
            <Plus size={15} /> Novo Cliente
          </button>
        </div>
      </div>

      {error && <div className="db-error">⚠️ {error}</div>}

      {loading ? (
        <div className="db-loading">Carregando clientes…</div>
      ) : (
      <>
      {/* ── CLIENT KANBAN ── */}
      <div className="client-kanban">
        <ClientKanbanColumn
          status="negotiation" label="Pré-Aquisição" emoji="🎯" variant="blue"
          clients={filtered.filter(c => c.status === 'negotiation')}
          tasks={tasks} selectedId={selectedId} setSelectedId={setSelectedId}
          draggedClient={draggedClient} setDraggedClient={setDraggedClient}
          onDropClient={saveClient} onComment={openClientComments}
          isMobile={isMobile}
        />
        <ClientKanbanColumn
          status="active" label="Pós-Aquisição" emoji="🚀" variant="green"
          clients={filtered.filter(c => c.status === 'active')}
          tasks={tasks} selectedId={selectedId} setSelectedId={setSelectedId}
          draggedClient={draggedClient} setDraggedClient={setDraggedClient}
          onDropClient={saveClient} onComment={openClientComments}
          isMobile={isMobile}
        />
      </div>

      {/* ── EXPANDED PROFILE ── */}
      {selected && (
        <div className="profile-panel">

          {/* Profile Top Bar */}
          <div className="profile-topbar">
            <div className="profile-identity">
              <span className="profile-emoji">{selected.emoji}</span>
              <div>
                <h2 className="profile-name">{selected.name}</h2>
                <p className="profile-since">Cliente desde {selected.since}</p>
              </div>
              <span className={`badge ${selected.status === 'active' ? 'badge-green' : 'badge-orange'}`}>
                {selected.status === 'active' ? '✅ Ativo' : '🤝 Negociação'}
              </span>
            </div>

            {/* Stats inline */}
            <div className="profile-stats">
              <div className="pstat">
                <span className="pstat-n">{clientTasks.length}</span>
                <span className="pstat-l">Tarefas</span>
              </div>
              <div className="pstat">
                <span className="pstat-n">{clientTasks.filter(t=>t.status==='completed').length}</span>
                <span className="pstat-l">Feitas</span>
              </div>
              <div className="pstat">
                <span className="pstat-n" style={pendingCount > 0 ? {color:'var(--orange)'} : {}}>
                  {pendingCount}
                </span>
                <span className="pstat-l">Pendentes</span>
              </div>
            </div>

            <button className="icon-btn" onClick={() => setClientModal({ client: selected })}>
              <Pencil size={15} />
            </button>
            <button className="icon-btn" style={{ color: 'var(--red)' }} title="Excluir Cliente" onClick={() => removeClient(selected.id)}>
              <Trash2 size={15} />
            </button>
            <button className="icon-btn" onClick={() => setSelectedId(null)}>
              <X size={18} />
            </button>
          </div>

          {/* Info Strip — Contact + Connections horizontal */}
          <div className="info-strip">
            {/* Contact */}
            <div className="info-strip-block">
              <p className="strip-label">📞 Contato</p>
              <div className="strip-items">
                <a href={`mailto:${selected.contact.email}`} className="strip-item">
                  <Mail size={14} /> {selected.contact.email || '—'}
                </a>
                <a href={`tel:${selected.contact.phone}`} className="strip-item">
                  <Phone size={14} /> {selected.contact.phone || '—'}
                </a>
              </div>
            </div>

            {/* Divider */}
            <div className="strip-divider" />

            {/* Connections */}
            <div className="info-strip-block info-strip-block--grow">
              <p className="strip-label">🔗 Conexões</p>
              <div className="strip-items">
                {conns.map(({ key, emoji, label }) => {
                  const val = selected.connections[key];
                  return (
                    <a key={key}
                      href={val || '#'}
                      target="_blank" rel="noreferrer"
                      className={`conn-chip ${!val ? 'conn-chip--off' : ''}`}
                      onClick={!val ? e => e.preventDefault() : undefined}
                    >
                      {emoji} {label}
                      {val && <ExternalLink size={11} />}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── TABS ── */}
          <div className="profile-tabs" style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--light-gray)', marginBottom: 24, padding: '0 24px' }}>
            <button className={`ptab ${activeTab === 'tasks' ? 'ptab--active' : ''}`} onClick={() => setActiveTab('tasks')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'tasks' ? '2px solid var(--blue-500)' : '2px solid transparent', padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: activeTab === 'tasks' ? 'var(--blue-500)' : 'var(--mid-gray)' }}>
              Tarefas
            </button>
            <button className={`ptab ${activeTab === 'finance' ? 'ptab--active' : ''}`} onClick={() => setActiveTab('finance')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'finance' ? '2px solid var(--blue-500)' : '2px solid transparent', padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: activeTab === 'finance' ? 'var(--blue-500)' : 'var(--mid-gray)' }}>
              Financeiro
            </button>
            <button className={`ptab ${activeTab === 'meetings' ? 'ptab--active' : ''}`} onClick={() => setActiveTab('meetings')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'meetings' ? '2px solid var(--blue-500)' : '2px solid transparent', padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: activeTab === 'meetings' ? 'var(--blue-500)' : 'var(--mid-gray)' }}>
              Reuniões
            </button>
          </div>

          {activeTab === 'tasks' && (
            <div className="tasks-area">
              <div className="tasks-area-header">
                <h3 className="tasks-area-title">Tarefas</h3>
              </div>

              <div className="tasks-columns">
                <TaskColumn
                  variant="blue" label="⏳ Pendentes" tasks={pendingTasks}
                  clientId={selected.id}
                  adding={addingTask}
                  onStartAdd={() => setAddingTask(true)}
                  onCancelAdd={() => setAddingTask(false)}
                  onAdd={addTask} onToggle={toggle} onDelete={remove} onEdit={setEditingTask}
                  onComment={openTaskComments}
                />
                <TaskColumn
                  variant="green" label="✅ Concluídas" tasks={completedTasks}
                  clientId={selected.id}
                  adding={false}
                  onAdd={addTask} onToggle={toggle} onDelete={remove} onEdit={setEditingTask}
                  onComment={openTaskComments}
                />
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="finance-area" style={{ padding: '0 24px 24px' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <div style={{ flex: 1, background: 'var(--off-white)', padding: 16, borderRadius: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--mid-gray)', fontWeight: 600, textTransform: 'uppercase' }}>MRR</p>
                  <p style={{ fontSize: 24, fontWeight: 800 }}>{(selected.mrr || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div style={{ flex: 1, background: 'var(--off-white)', padding: 16, borderRadius: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--mid-gray)', fontWeight: 600, textTransform: 'uppercase' }}>Dia de Vencimento</p>
                  <p style={{ fontSize: 24, fontWeight: 800 }}>{selected.dueDay}</p>
                </div>
              </div>

              <div className="tasks-area-header">
                <h3 className="tasks-area-title">Faturas</h3>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const desc = window.prompt("Descrição da fatura:");
                  if (!desc) return;
                  const amt = window.prompt("Valor (R$):");
                  if (!amt) return;
                  const dt = window.prompt("Data de Vencimento (YYYY-MM-DD):");
                  if (!dt) return;
                  insertInvoice({ clientId: selected.id, description: desc, amount: parseFloat(amt), dueDate: dt })
                    .then(inv => setInvoices(p => [inv, ...p]))
                    .catch(e => setError(e.message));
                }}>
                  <Plus size={14} /> Nova Fatura
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                {invoices.filter(i => i.clientId === selected.id).length === 0 ? (
                  <p className="tasks-empty" style={{ margin: 0 }}>Nenhuma fatura lançada.</p>
                ) : (
                  invoices.filter(i => i.clientId === selected.id).map(inv => {
                    const isOverdue = inv.status === 'pending' && inv.dueDate < today;
                    let finalAmount = Number(inv.amount) || 0;
                    if (isOverdue) {
                       const daysLate = Math.floor((new Date(today) - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
                       if (daysLate > 0) {
                          const mult = selected.lateFeePercentage || 2;
                          const juros = (selected.lateFeeInterestPerMonth || 1) / 30;
                          finalAmount = finalAmount + (finalAmount * (mult / 100)) + (finalAmount * (juros / 100) * daysLate);
                       }
                    }
                    return (
                      <div key={inv.id} className="task-row">
                        <div className={`task-row-indicator ${isOverdue ? 'task-row-indicator--red' : 'task-row-indicator--orange'}`} />
                        <div className="task-row-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontWeight: 600 }}>{inv.description}</p>
                            <p style={{ fontSize: 13, color: isOverdue ? 'var(--red)' : 'var(--mid-gray)' }}>
                              Vencimento: {new Date(inv.dueDate).toLocaleDateString()}
                              {isOverdue && <span style={{ marginLeft: 8, fontWeight: 600 }}>R$ {finalAmount.toFixed(2)} (com juros)</span>}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontWeight: 800, fontSize: 16, color: isOverdue ? 'var(--red)' : 'var(--black)' }}>
                              {Number(inv.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            {inv.status === 'paid' ? (
                              <span className="badge badge-green">Pago</span>
                            ) : (
                              <button className="btn btn-sm" style={{ background: 'var(--green-text)', color: 'white', border: 'none' }} onClick={() => {
                                if (window.confirm(`Marcar R$ ${finalAmount.toFixed(2)} como pago? Isso irá gerar uma Entrada automática no seu Extrato!`)) {
                                  markInvoicePaid(inv.id, finalAmount).then(updated => {
                                    setInvoices(p => p.map(x => x.id === inv.id ? updated : x));
                                    // Add locally to transactions
                                    const newTx = { id: Date.now().toString(), type: 'income', amount: finalAmount, description: `Pgto Fatura: ${inv.description}`, category: 'Serviço', date: new Date().toISOString(), clientId: selected.id };
                                    setTransactions(prev => [newTx, ...prev]);
                                  }).catch(e => setError(e.message));
                                }
                              }}>
                                Marcar Pago
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* TRANSACTIONS SECTION */}
              <div className="tasks-area-header" style={{ marginTop: 32 }}>
                <h3 className="tasks-area-title">Extrato do Cliente</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                {transactions.filter(t => t.clientId === selected.id).length === 0 ? (
                  <p className="tasks-empty" style={{ margin: 0 }}>Nenhuma transação registrada para este cliente.</p>
                ) : (
                  transactions.filter(t => t.clientId === selected.id).sort((a,b) => new Date(b.date) - new Date(a.date)).map(tx => (
                    <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--white)', border: '1px solid var(--neutral-100)', borderRadius: 8 }}>
                      <div>
                        <p style={{ fontWeight: 600 }}>{tx.description}</p>
                        <p style={{ fontSize: 12, color: 'var(--mid-gray)' }}>{new Date(tx.date).toLocaleDateString()} • {tx.category}</p>
                      </div>
                      <div style={{ fontWeight: 600, color: tx.type === 'income' ? 'var(--green-text)' : 'var(--red)' }}>
                        {tx.type === 'income' ? '+' : '-'} R$ {Number(tx.amount).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'meetings' && (
            <div className="finance-area" style={{ padding: '0 24px 24px' }}>
              <div className="tasks-area-header">
                <h3 className="tasks-area-title">Reuniões</h3>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const title = window.prompt("Título da reunião:");
                  if (!title) return;
                  const dt = window.prompt("Data e Hora (YYYY-MM-DDTHH:MM):");
                  if (!dt) return;
                  const link = window.prompt("Link do Meet (opcional):");
                  insertMeeting({ clientId: selected.id, title, scheduledAt: new Date(dt).toISOString(), meetLink: link || '', notes: '' })
                    .then(mtg => setMeetings(p => [...p, mtg]))
                    .catch(e => setError(e.message));
                }}>
                  <Plus size={14} /> Agendar Reunião
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                {meetings.filter(m => m.clientId === selected.id).length === 0 ? (
                  <p className="tasks-empty" style={{ margin: 0 }}>Nenhuma reunião agendada.</p>
                ) : (
                  meetings.filter(m => m.clientId === selected.id).sort((a,b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)).map(mtg => {
                    const dt = new Date(mtg.scheduledAt);
                    return (
                      <div key={mtg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'white', border: '1px solid var(--light-gray)', borderRadius: 8, opacity: mtg.status === 'completed' ? 0.7 : 1 }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14 }}>{mtg.title}</p>
                          <p style={{ fontSize: 12, color: 'var(--mid-gray)', marginTop: 4 }}>
                            {dt.toLocaleDateString()} às {dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          {mtg.status === 'scheduled' ? (
                            <button className="btn btn-sm" style={{ background: 'var(--green-text)', color: 'white', border: 'none' }} onClick={() => {
                              updateMeeting({ ...mtg, status: 'completed' })
                                .then(updated => setMeetings(p => p.map(x => x.id === mtg.id ? updated : x)))
                                .catch(e => setError(e.message));
                            }}>
                              ✅ Concluir
                            </button>
                          ) : (
                            <span className="badge badge-gray">Concluída</span>
                          )}
                          <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => {
                            if(window.confirm('Excluir?')) {
                              deleteMeeting(mtg.id).then(() => setMeetings(p => p.filter(x => x.id !== mtg.id)));
                            }
                          }}>
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* ── MODAIS ── */}
      {clientModal && (
        <ClientModal
          client={clientModal.client}
          onClose={() => setClientModal(null)}
          onSave={saveClient}
        />
      )}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={updateTaskFn}
          onDelete={remove}
        />
      )}
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
