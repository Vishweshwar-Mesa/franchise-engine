-- Franchise Partner Engine: initial schema (Neon Postgres).
-- No login: each browser gets a session id and every row is scoped to it.
-- Only the Next.js server (DATABASE_URL) talks to the database.

create table if not exists sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists applicants (
  session_id text not null references sessions(id) on delete cascade,
  app_id text not null,
  data jsonb not null,
  primary key (session_id, app_id)
);

create table if not exists territories (
  session_id text not null references sessions(id) on delete cascade,
  territory_id text not null,
  data jsonb not null,
  primary key (session_id, territory_id)
);

create table if not exists stores (
  session_id text not null references sessions(id) on delete cascade,
  store_id text not null,
  data jsonb not null,
  primary key (session_id, store_id)
);

-- The reason ledger as computed by the engine (an audit copy; the engine recomputes it).
create table if not exists ledger (
  session_id text not null references sessions(id) on delete cascade,
  app_id text not null,
  status text not null,
  entry jsonb not null,
  primary key (session_id, app_id)
);

-- Settings, reviewer inputs, contest decisions, waitlist confirmations, onboarding,
-- AI suggestions and the validation report: one JSON document per session.
create table if not exists workspace_state (
  session_id text primary key references sessions(id) on delete cascade,
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

create table if not exists reviewer_actions (
  session_id text not null references sessions(id) on delete cascade,
  at timestamptz not null,
  kind text not null,
  applicant_id text,
  detail text not null,
  primary key (session_id, at, kind)
);

-- Franchisee account records (no login system; the franchisee view is a no-login preview).
create table if not exists franchisee_accounts (
  session_id text not null references sessions(id) on delete cascade,
  app_id text not null,
  email text not null,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (session_id, app_id)
);

-- AI response cache, keyed by a hash of the model + prompt.
create table if not exists ai_cache (
  key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now()
);

-- Group 3: area snapshot cache (key "pin|city") and the hard daily Google call counter.
create table if not exists area_cache (
  key text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

create table if not exists places_usage (
  day date primary key,
  calls integer not null default 0
);
