import { supabase } from './supabase';
import { USERS } from '../mockData';

/* ── mappers: DB row (snake_case, flat) ↔ app object (camelCase, nested) ── */

const toClient = (r) => ({
  id: r.id,
  name: r.name,
  emoji: r.emoji,
  status: r.status,
  since: r.since,
  contact: {
    email: r.contact_email ?? '',
    phone: r.contact_phone ?? '',
  },
  connections: {
    drive:     r.conn_drive ?? '',
    instagram: r.conn_instagram ?? '',
    tiktok:    r.conn_tiktok ?? '',
    website:   r.conn_website ?? '',
  },
});

const fromClient = (c) => ({
  name:           c.name,
  emoji:          c.emoji,
  status:         c.status,
  since:          c.since,
  contact_email:  c.contact.email || null,
  contact_phone:  c.contact.phone || null,
  conn_drive:     c.connections.drive || null,
  conn_instagram: c.connections.instagram || null,
  conn_tiktok:    c.connections.tiktok || null,
  conn_website:   c.connections.website || null,
});

const toTask = (r) => ({
  id: r.id,
  clientId:    r.client_id,
  title:       r.title,
  description: r.description ?? '',
  dueDate:     r.due_date ?? '',
  assignees:   r.assignees ?? (r.assignee ? [r.assignee] : ['André']),
  stage:       r.stage,
  priority:    r.priority,
  status:      r.status,
});

const fromTask = (t) => ({
  client_id:   t.clientId,
  title:       t.title,
  description: t.description || null,
  due_date:    t.dueDate || null,
  assignees:   t.assignees,
  stage:       t.stage,
  priority:    t.priority,
  status:      t.status,
});

/* ── clients ── */

export async function fetchClients() {
  const { data, error } = await supabase
    .from('clients').select('*').order('created_at');
  if (error) throw error;
  return data.map(toClient);
}

export async function insertClient(client) {
  const { data, error } = await supabase
    .from('clients').insert(fromClient(client)).select().single();
  if (error) throw error;
  return toClient(data);
}

export async function updateClient(client) {
  const { data, error } = await supabase
    .from('clients').update(fromClient(client)).eq('id', client.id).select().single();
  if (error) throw error;
  return toClient(data);
}

/* ── tasks ── */

export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks').select('*').order('created_at');
  if (error) throw error;
  return data.map(toTask);
}

export async function insertTask(task) {
  const { data, error } = await supabase
    .from('tasks').insert(fromTask(task)).select().single();
  if (error) throw error;
  return toTask(data);
}

export async function updateTask(task) {
  const { data, error } = await supabase
    .from('tasks').update(fromTask(task)).eq('id', task.id).select().single();
  if (error) throw error;
  return toTask(data);
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

/* ── notifications ── */

const toNotif = (r) => ({
  id:        r.id,
  recipient: r.recipient,
  actor:     r.actor,
  kind:      r.kind,
  taskId:    r.task_id,
  taskTitle: r.task_title,
  read:      r.read,
  createdAt: r.created_at,
});

export async function fetchNotifications(recipient) {
  const { data, error } = await supabase
    .from('notifications').select('*')
    .eq('recipient', recipient)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toNotif);
}

export async function markNotificationRead(id) {
  const { error } = await supabase
    .from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(recipient) {
  const { error } = await supabase
    .from('notifications').update({ read: true })
    .eq('recipient', recipient).eq('read', false);
  if (error) throw error;
}

/* Cria uma notificação para cada responsável da tarefa que não seja o autor. */
export async function notifyAssignees(task, actor, kind) {
  const recipients = (task.assignees || []).filter(a => a && a !== actor);
  if (recipients.length === 0) return;
  const rows = recipients.map(r => ({
    recipient:  r,
    actor,
    kind,
    task_id:    task.id ?? null,
    task_title: task.title,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
}

/* Notifica quem foi mencionado com @ na descrição (e ainda não é responsável). */
export async function notifyMentions(task, actor) {
  const text = task.description || '';
  const assignees = task.assignees || [];
  const recipients = USERS.filter(u =>
    text.includes('@' + u) && u !== actor && !assignees.includes(u)
  );
  if (recipients.length === 0) return;
  const rows = recipients.map(r => ({
    recipient:  r,
    actor,
    kind:       'mentioned',
    task_id:    task.id ?? null,
    task_title: task.title,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
}

/* ── comments (threads) ── */

const toComment = (r) => ({
  id:         r.id,
  parentType: r.parent_type,
  parentId:   r.parent_id,
  author:     r.author,
  body:       r.body,
  createdAt:  r.created_at,
});

export async function fetchComments(parentType, parentId) {
  const { data, error } = await supabase
    .from('comments').select('*')
    .eq('parent_type', parentType).eq('parent_id', parentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(toComment);
}

export async function insertComment({ parentType, parentId, author, body }) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ parent_type: parentType, parent_id: parentId, author, body })
    .select().single();
  if (error) throw error;
  return toComment(data);
}

/* Notifica usuários mencionados com @ em um comentário. */
export async function notifyCommentMentions(body, actor, parentTitle) {
  const recipients = USERS.filter(u => body.includes('@' + u) && u !== actor);
  if (recipients.length === 0) return;
  const rows = recipients.map(r => ({
    recipient:  r,
    actor,
    kind:       'mentioned',
    task_id:    null,
    task_title: parentTitle,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
}

/* Notifica o outro membro do time quando alguém comenta. */
export async function notifyComment(parentType, parentId, parentTitle, author) {
  const recipients = USERS.filter(u => u !== author);
  if (recipients.length === 0) return;
  const rows = recipients.map(r => ({
    recipient:  r,
    actor:      author,
    kind:       'commented',
    task_id:    parentType === 'task' ? parentId : null,
    task_title: parentTitle,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
}

/* ── mcp_api_keys (Integrações IA) ── */

const toMcpKey = (r) => ({
  id: r.id,
  name: r.name,
  keyValue: r.key_value,
  lastUsedAt: r.last_used_at,
  createdAt: r.created_at,
});

export async function fetchMcpKeys() {
  const { data, error } = await supabase
    .from('mcp_api_keys').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toMcpKey);
}

export async function createMcpKey(name) {
  const keyValue = 'sk_mcp_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const { data, error } = await supabase
    .from('mcp_api_keys').insert({ name, key_value: keyValue }).select().single();
  if (error) throw error;
  return toMcpKey(data);
}

export async function deleteMcpKey(id) {
  const { error } = await supabase.from('mcp_api_keys').delete().eq('id', id);
  if (error) throw error;
}
