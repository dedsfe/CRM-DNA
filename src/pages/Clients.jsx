import { useState, useEffect } from 'react';
import { USERS } from '../mockData';
import {
  fetchClients, fetchTasks, insertClient, updateClient,
  insertTask, updateTask, deleteTask, notifyAssignees, notifyMentions,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import Modal from '../components/Modal';
import MentionTextarea from '../components/MentionTextarea';
import CommentThread from '../components/CommentThread';
import {
  Plus, Mail, Phone, ExternalLink,
  CheckCircle2, Circle, Trash2, X, Search, Pencil, MessageSquare
} from 'lucide-react';
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
function TaskFields({ form, set, showStage = true }) {
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
        {showStage && (
          <div className="field">
            <label className="field-label">Etapa</label>
            <select className="input" value={form.stage}
              onChange={e => set('stage', e.target.value)}>
              <option value="pre-acquisition">🎯 Pré-Aquisição</option>
              <option value="post-acquisition">🚀 Pós-Aquisição</option>
            </select>
          </div>
        )}
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
function InlineAddTask({ clientId, stage, onAdd, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', dueDate: '', assignees: ['André'], priority: 'medium',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.title.trim() && form.dueDate && form.assignees.length > 0;

  return (
    <div className="inline-form">
      <TaskFields form={form} set={set} showStage={false} />
      <div className="inline-form-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className="btn btn-primary btn-sm" disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            await onAdd({ ...form, clientId, stage, status: 'pending' });
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
          ? <InlineAddTask clientId={clientId} stage={stage} onAdd={onAdd} onCancel={onCancelAdd} />
          : <button className="k-add" onClick={onStartAdd}>
              <Plus size={15} /> Nova tarefa
            </button>
        }
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Clients() {
  const [clients, setClients]   = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [clientModal, setClientModal] = useState(null); // null | {} | {client}
  const [editingTask, setEditingTask] = useState(null);
  const [addingStage, setAddingStage] = useState(null);
  const [commentTarget, setCommentTarget] = useState(null);
  const { user } = useAuth();

  const openTaskComments   = (task)   => setCommentTarget({ type: 'task',   id: task.id,   title: task.title });
  const openClientComments = (client) => setCommentTarget({ type: 'client', id: client.id, title: client.name });

  useEffect(() => {
    Promise.all([fetchClients(), fetchTasks()])
      .then(([c, t]) => { setClients(c); setTasks(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected = clients.find(c => c.id === selectedId) ?? null;

  const clientTasks = tasks.filter(t => t.clientId === selectedId);
  const preTasks    = clientTasks.filter(t => t.stage === 'pre-acquisition');
  const postTasks   = clientTasks.filter(t => t.stage === 'post-acquisition');
  const pendingCount = clientTasks.filter(t => t.status === 'pending').length;

  /* task handlers */
  const toggle = async (id) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const next = { ...t, status: t.status === 'completed' ? 'pending' : 'completed' };
    try { const saved = await updateTask(next); setTasks(p => p.map(x => x.id === id ? saved : x)); }
    catch (e) { setError(e.message); }
  };
  const remove = async (id) => {
    try { await deleteTask(id); setTasks(p => p.filter(t => t.id !== id)); }
    catch (e) { setError(e.message); }
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
          <button className="btn btn-primary btn-sm" onClick={() => setClientModal({})}>
            <Plus size={15} /> Novo Cliente
          </button>
        </div>
      </div>

      {error && <div className="db-error">⚠️ {error}</div>}

      {loading ? (
        <div className="db-loading">Carregando clientes…</div>
      ) : (
      <>
      {/* ── CLIENT CARDS GRID ── */}
      <div className="cp-grid">
        {filtered.map(c => {
          const ct = tasks.filter(t => t.clientId === c.id);
          const pending = ct.filter(t => t.status === 'pending').length;
          const isActive = selectedId === c.id;
          return (
            <button
              key={c.id}
              className={`client-card ${isActive ? 'client-card--active' : ''}`}
              onClick={() => setSelectedId(isActive ? null : c.id)}
            >
              <div className="cc-emoji">{c.emoji}</div>
              <div className="cc-info">
                <span className="cc-name">{c.name}</span>
                <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-orange'}`}>
                  {c.status === 'active' ? 'Ativo' : 'Negociação'}
                </span>
              </div>
              {pending > 0 && (
                <div className="cc-badge">{pending}</div>
              )}
              <span
                className="comment-btn card-comment"
                role="button"
                tabIndex={0}
                title="Comentários"
                onClick={(e) => { e.stopPropagation(); openClientComments(c); }}
              >
                <MessageSquare size={13} />
              </span>
            </button>
          );
        })}
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

          {/* ── TASKS ── */}
          <div className="tasks-area">
            <div className="tasks-area-header">
              <h3 className="tasks-area-title">Tarefas</h3>
            </div>

            <div className="tasks-columns">
              <TaskColumn
                variant="blue" label="🎯 Pré-Aquisição" tasks={preTasks}
                clientId={selected.id} stage="pre-acquisition"
                adding={addingStage === 'pre-acquisition'}
                onStartAdd={() => setAddingStage('pre-acquisition')}
                onCancelAdd={() => setAddingStage(null)}
                onAdd={addTask} onToggle={toggle} onDelete={remove} onEdit={setEditingTask}
                onComment={openTaskComments}
              />
              <TaskColumn
                variant="green" label="🚀 Pós-Aquisição" tasks={postTasks}
                clientId={selected.id} stage="post-acquisition"
                adding={addingStage === 'post-acquisition'}
                onStartAdd={() => setAddingStage('post-acquisition')}
                onCancelAdd={() => setAddingStage(null)}
                onAdd={addTask} onToggle={toggle} onDelete={remove} onEdit={setEditingTask}
                onComment={openTaskComments}
              />
            </div>
          </div>
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
