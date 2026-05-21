-- ══════════════════════════════════════════════════
--  CLIENT MANAGER — Supabase Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════

-- ── clients ──────────────────────────────────────
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  emoji         text not null default '🏢',
  status        text not null default 'active' check (status in ('active','negotiation')),
  since         date not null default current_date,
  contact_email text,
  contact_phone text,
  conn_drive    text,
  conn_instagram text,
  conn_tiktok   text,
  conn_website  text,
  created_at    timestamptz default now()
);

-- ── tasks ─────────────────────────────────────────
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  title       text not null,
  description text,
  due_date    date,
  assignees   text[] not null default array['André']::text[],
  stage       text not null default 'pre-acquisition' check (stage in ('pre-acquisition','post-acquisition')),
  priority    text not null default 'medium' check (priority in ('high','medium','low')),
  status      text not null default 'pending' check (status in ('pending','completed')),
  created_at  timestamptz default now(),
  unique (client_id, title)
);

-- ── notifications (caixa de entrada / @) ──────────
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient   text not null,
  actor       text not null,
  kind        text not null default 'assigned',
  task_id     uuid references tasks(id) on delete set null,
  task_title  text not null,
  read        boolean not null default false,
  created_at  timestamptz default now()
);

-- ── comments (threads em tarefas e clientes) ──────
create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  parent_type text not null check (parent_type in ('task','client')),
  parent_id   uuid not null,
  author      text not null,
  body        text not null,
  created_at  timestamptz default now()
);

-- ── indexes ───────────────────────────────────────
create index if not exists tasks_client_id_idx on tasks (client_id);
create index if not exists notifications_recipient_idx on notifications (recipient);
create index if not exists comments_parent_idx on comments (parent_type, parent_id);

-- ── RLS: disable for now (single-user app) ────────
alter table clients       disable row level security;
alter table tasks         disable row level security;
alter table notifications disable row level security;
alter table comments      disable row level security;

-- ── seed data ─────────────────────────────────────
insert into clients (name, emoji, status, since, contact_email, contact_phone, conn_instagram, conn_website, conn_drive)
values
  ('TechNova Solutions', '🚀', 'active',       '2025-01-10', 'contato@technova.com.br', '+55 11 99999-1111', '@technovasol',   'https://technova.com.br',   'https://drive.google.com'),
  ('Padaria do João',    '🥖', 'negotiation',  '2026-03-22', 'joao@padaria.com',       '+55 11 99999-2222', '@padariadojoao', '',                          ''),
  ('Beleza & Estilo',    '💅', 'active',       '2025-06-05', 'oi@belezaestilo.com',    '+55 21 91111-3333', '@belezaestilo',  'https://belezaestilo.com',  'https://drive.google.com')
on conflict do nothing;

-- seed tasks referencing client IDs
with c as (select id, name from clients)
insert into tasks (client_id, title, description, due_date, assignees, stage, priority, status)
select
  c.id,
  v.title,
  v.description,
  v.due_date::date,
  v.assignees,
  v.stage,
  v.priority,
  v.status
from c
join (values
  ('Padaria do João',      'Enviar Proposta Comercial',  'Preparar e enviar proposta de social media.', '2026-05-25', array['André'],             'pre-acquisition',  'high',   'pending'),
  ('TechNova Solutions',   'Reunião de Onboarding',      'Apresentar equipe e cronograma de entregas.', '2026-05-22', array['André','Danyelle'],  'post-acquisition', 'medium', 'completed'),
  ('TechNova Solutions',   'Aprovar Artes de Maio',      'Revisar artes do feed de maio.',              '2026-05-26', array['Danyelle'],          'post-acquisition', 'high',   'pending'),
  ('Beleza & Estilo',      'Criar Roteiro de Reels',     'Roteiro para 4 reels de junho.',              '2026-05-30', array['André'],             'post-acquisition', 'low',    'pending')
) as v(client_name, title, description, due_date, assignees, stage, priority, status)
  on c.name = v.client_name
on conflict do nothing;

-- ── mcp_api_keys (Integrações IA) ─────────────────
create table if not exists mcp_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_value text not null unique,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

alter table mcp_api_keys disable row level security;
