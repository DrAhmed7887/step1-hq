create table if not exists public.sync_snapshots (
  sync_hash text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
