import { supabase } from './supabase';
import { USERS } from '../mockData';

/* ── mappers: DB row (snake_case, flat) ↔ app object (camelCase, nested) ── */

const toClient = (r) => ({
  id: r.id,
  name: r.name,
  emoji: r.emoji,
  status: r.status,
  since: r.since,
  mrr: r.mrr ?? 0,
  setupFee: r.setup_fee ?? 0,
  dueDay: r.due_day ?? 5,
  lateFeePercentage: r.late_fee_percentage ?? 2.0,
  lateFeeInterestPerMonth: r.late_fee_interest_per_month ?? 1.0,
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
  deletedAt: r.deleted_at,
});

const fromClient = (c) => ({
  name:           c.name,
  emoji:          c.emoji,
  status:         c.status,
  since:          c.since,
  mrr:            c.mrr,
  setup_fee:      c.setupFee,
  due_day:        c.dueDay,
  late_fee_percentage: c.lateFeePercentage,
  late_fee_interest_per_month: c.lateFeeInterestPerMonth,
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
  priority:    r.priority,
  status:      r.status,
  deletedAt:   r.deleted_at,
});

const fromTask = (t) => ({
  client_id:   t.clientId,
  title:       t.title,
  description: t.description || null,
  due_date:    t.dueDate || null,
  assignees:   t.assignees,
  priority:    t.priority,
  status:      t.status,
});

/* ── clients ── */

export async function fetchClients() {
  const { data, error } = await supabase
    .from('clients').select('*').is('deleted_at', null).order('created_at');
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

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

/* ── tasks ── */

export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks').select('*').is('deleted_at', null).order('created_at');
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
  const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

/* ── invoices ── */

const toInvoice = (r) => ({
  id: r.id,
  clientId: r.client_id,
  description: r.description,
  amount: r.amount,
  dueDate: r.due_date,
  status: r.status,
  paidAt: r.paid_at,
  createdAt: r.created_at,
});

export async function fetchInvoices(clientId = null) {
  let query = supabase.from('invoices').select('*').order('due_date', { ascending: false });
  if (clientId) query = query.eq('client_id', clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(toInvoice);
}

export async function insertInvoice({ clientId, description, amount, dueDate }) {
  const { data, error } = await supabase
    .from('invoices')
    .insert({ client_id: clientId, description, amount, due_date: dueDate })
    .select().single();
  if (error) throw error;
  return toInvoice(data);
}

export async function markInvoicePaid(id, finalAmount = null) {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', id)
    .select().single();
  if (error) throw error;

  // Auto-generate transaction
  try {
    await insertTransaction({
      type: 'income',
      amount: finalAmount !== null ? finalAmount : data.amount,
      description: `Pgto Fatura: ${data.description}`,
      category: 'Serviço',
      date: new Date().toISOString(),
      clientId: data.client_id,
      invoiceId: data.id
    });
  } catch (err) {
    console.error('Error auto-generating transaction for invoice:', err);
  }

  return toInvoice(data);
}

/* ── meetings ── */

const toMeeting = (r) => ({
  id: r.id,
  clientId: r.client_id,
  title: r.title,
  scheduledAt: r.scheduled_at,
  meetLink: r.meet_link ?? '',
  notes: r.notes ?? '',
  status: r.status,
  createdAt: r.created_at,
});

const fromMeeting = (m) => ({
  client_id: m.clientId,
  title: m.title,
  scheduled_at: m.scheduledAt,
  meet_link: m.meetLink || null,
  notes: m.notes || null,
  status: m.status,
});

export async function fetchMeetings(clientId = null) {
  let query = supabase.from('meetings').select('*').order('scheduled_at', { ascending: true });
  if (clientId) query = query.eq('client_id', clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(toMeeting);
}

export async function insertMeeting(meeting) {
  const { data, error } = await supabase
    .from('meetings').insert(fromMeeting(meeting)).select().single();
  if (error) throw error;
  return toMeeting(data);
}

export async function updateMeeting(meeting) {
  const { data, error } = await supabase
    .from('meetings').update(fromMeeting(meeting)).eq('id', meeting.id).select().single();
  if (error) throw error;
  return toMeeting(data);
}

export async function deleteMeeting(id) {
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) throw error;
}

/* ── issues (bugs/features) ── */

const toIssue = (r) => ({
  id: r.id,
  title: r.title,
  description: r.description ?? '',
  priority: r.priority,
  status: r.status,
  author: r.author,
  createdAt: r.created_at,
});

const fromIssue = (i) => ({
  title: i.title,
  description: i.description || null,
  priority: i.priority,
  status: i.status,
  author: i.author,
});

export async function fetchIssues() {
  const { data, error } = await supabase
    .from('issues').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toIssue);
}

export async function insertIssue(issue) {
  const { data, error } = await supabase
    .from('issues').insert(fromIssue(issue)).select().single();
  if (error) throw error;
  return toIssue(data);
}

export async function updateIssue(issue) {
  const { data, error } = await supabase
    .from('issues').update(fromIssue(issue)).eq('id', issue.id).select().single();
  if (error) throw error;
  return toIssue(data);
}

export async function deleteIssue(id) {
  const { error } = await supabase.from('issues').delete().eq('id', id);
  if (error) throw error;
}

/* ── transactions ── */

const toTransaction = (r) => ({
  id: r.id,
  type: r.type,
  amount: r.amount,
  description: r.description,
  category: r.category,
  date: r.date,
  clientId: r.client_id,
  invoiceId: r.invoice_id,
  createdAt: r.created_at,
});

const fromTransaction = (t) => ({
  type: t.type,
  amount: t.amount,
  description: t.description,
  category: t.category,
  date: t.date,
  client_id: t.clientId || null,
  invoice_id: t.invoiceId || null,
});

export async function fetchTransactions() {
  const { data, error } = await supabase
    .from('transactions').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data.map(toTransaction);
}

export async function insertTransaction(tx) {
  const { data, error } = await supabase
    .from('transactions').insert(fromTransaction(tx)).select().single();
  if (error) throw error;
  return toTransaction(data);
}

export async function updateTransaction(tx) {
  const { data, error } = await supabase
    .from('transactions').update(fromTransaction(tx)).eq('id', tx.id).select().single();
  if (error) throw error;
  return toTransaction(data);
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

/* ── recurring transactions (Fixos/Mensais) ── */

const toRecurring = (r) => ({
  id: r.id,
  type: r.type,
  amount: r.amount,
  description: r.description,
  category: r.category,
  dueDay: r.due_day,
  clientId: r.client_id,
  active: r.active,
  lastProcessedMonth: r.last_processed_month,
  createdAt: r.created_at,
});

const fromRecurring = (t) => ({
  type: t.type,
  amount: t.amount,
  description: t.description,
  category: t.category,
  due_day: t.dueDay,
  client_id: t.clientId || null,
  active: t.active ?? true,
  last_processed_month: t.lastProcessedMonth || null,
});

export async function fetchRecurringTransactions() {
  const { data, error } = await supabase
    .from('recurring_transactions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toRecurring);
}

export async function insertRecurringTransaction(tx) {
  const { data, error } = await supabase
    .from('recurring_transactions').insert(fromRecurring(tx)).select().single();
  if (error) throw error;
  return toRecurring(data);
}

export async function deleteRecurringTransaction(id) {
  const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleRecurringTransaction(id, activeStatus) {
  const { data, error } = await supabase
    .from('recurring_transactions').update({ active: activeStatus }).eq('id', id).select().single();
  if (error) throw error;
  return toRecurring(data);
}

/* Processador Inteligente Mensal */
export async function processMonthlyRecurring() {
  const d = new Date();
  const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  
  const { data: recurrings, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('active', true)
    .or(`last_processed_month.is.null,last_processed_month.neq.${currentMonthStr}`);

  if (error || !recurrings || recurrings.length === 0) return;

  const currentYear = d.getFullYear();
  const currentMonth = d.getMonth();

  for (const rule of recurrings) {
    // Evita criar para o dia 31 num mês que só tem 30 dias (ajusta o dia final do mês)
    const targetDate = new Date(currentYear, currentMonth, rule.due_day);
    if (targetDate.getMonth() !== currentMonth) {
      targetDate.setDate(0); // Último dia do mês
    }
    
    // Insere a transação
    await supabase.from('transactions').insert({
      type: rule.type,
      amount: rule.amount,
      description: rule.description,
      category: rule.category,
      date: targetDate.toISOString(),
      client_id: rule.client_id
    });
    
    // Atualiza a regra para não gerar de novo este mês
    await supabase.from('recurring_transactions')
      .update({ last_processed_month: currentMonthStr })
      .eq('id', rule.id);
  }
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

/* ── TRASH / UNDO ── */
export async function fetchTrash() {
  const [cRes, tRes] = await Promise.all([
    supabase.from('clients').select('*').not('deleted_at', 'is', null),
    supabase.from('tasks').select('*').not('deleted_at', 'is', null)
  ]);
  const clients = (cRes.data || []).map(toClient).map(c => ({ ...c, type: 'client' }));
  const tasks = (tRes.data || []).map(toTask).map(t => ({ ...t, type: 'task' }));
  return [...clients, ...tasks].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
}

export async function restoreItem(type, id) {
  const table = type === 'client' ? 'clients' : 'tasks';
  const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
}

export async function deletePermanently(type, id) {
  const table = type === 'client' ? 'clients' : 'tasks';
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}
