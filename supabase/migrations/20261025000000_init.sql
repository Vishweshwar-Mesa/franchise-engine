-- Franchise Partner Engine: initial schema.
-- There is no login: each browser gets a session id, and every row is scoped to it.
-- All access goes through Next.js API routes with the service role key, so RLS is on with
-- no public policies (the anon key cannot read or write these tables).

create table if not exists public.sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applicants (
  session_id text not null references public.sessions(id) on delete cascade,
  app_id text not null,
  data jsonb not null,
  primary key (session_id, app_id)
);

create table if not exists public.territories (
  session_id text not null references public.sessions(id) on delete cascade,
  territory_id text not null,
  data jsonb not null,
  primary key (session_id, territory_id)
);

create table if not exists public.stores (
  session_id text not null references public.sessions(id) on delete cascade,
  store_id text not null,
  data jsonb not null,
  primary key (session_id, store_id)
);

-- The reason ledger as computed by the engine (a copy for audit; the engine recomputes it).
create table if not exists public.ledger (
  session_id text not null references public.sessions(id) on delete cascade,
  app_id text not null,
  status text not null,
  entry jsonb not null,
  primary key (session_id, app_id)
);

-- Settings, reviewer inputs, contest decisions, waitlist confirmations, onboarding, AI suggestions,
-- validation report: one JSON document per session.
create table if not exists public.workspace_state (
  session_id text primary key references public.sessions(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  reviewer jsonb not null default '{}'::jsonb,
  ai jsonb not null default '{}'::jsonb,
  explanations jsonb not null default '{}'::jsonb,
  contests jsonb not null default '{}'::jsonb,
  waitlist jsonb not null default '{}'::jsonb,
  onboarding jsonb not null default '{}'::jsonb,
  dataset_meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.reviewer_actions (
  session_id text not null references public.sessions(id) on delete cascade,
  at timestamptz not null,
  kind text not null,
  applicant_id text,
  detail text not null,
  primary key (session_id, at, kind)
);

-- AI response cache, keyed by a hash of the model + prompt.
create table if not exists public.ai_cache (
  key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now()
);

-- Group 3: Google Places area snapshot cache (per pin) and a hard daily call counter.
create table if not exists public.area_cache (
  pin text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);
create table if not exists public.places_usage (
  day date primary key,
  calls integer not null default 0
);

alter table public.sessions enable row level security;
alter table public.applicants enable row level security;
alter table public.territories enable row level security;
alter table public.stores enable row level security;
alter table public.ledger enable row level security;
alter table public.workspace_state enable row level security;
alter table public.reviewer_actions enable row level security;
alter table public.ai_cache enable row level security;
alter table public.area_cache enable row level security;
alter table public.places_usage enable row level security;

-- Atomic increment for the Places daily cap. Returns the new count.
create or replace function public.bump_places_usage(p_day date, p_by integer)
returns integer language sql security definer set search_path = public as $$
  insert into public.places_usage(day, calls) values (p_day, p_by)
  on conflict (day) do update set calls = public.places_usage.calls + excluded.calls
  returning calls;
$$;
revoke all on function public.bump_places_usage(date, integer) from public, anon, authenticated;

-- Group 2: uploaded paperwork (private bucket; only the service role writes/reads).
insert into storage.buckets (id, name, public) values ('paperwork', 'paperwork', false)
on conflict (id) do nothing;
