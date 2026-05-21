import { supabase } from './supabase';

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
