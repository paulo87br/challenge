-- A turn costs ~6k tokens and the free Groq tier allows 8k per minute, so two
-- people acting in the same minute already exceeds it. Today that returns 502
-- and the participant's turn dies. The queue turns that into waiting.
--
-- It lives in Postgres rather than in memory because serverless functions do
-- not share state: an in-memory bucket would be one bucket per instance, which
-- is no bucket at all.

create table if not exists public.challenge_rate_limits(
  provider text primary key,
  tokens_per_minute int not null,
  requests_per_minute int not null default 1000,
  -- 0 means the provider imposes none. Measured: 20 concurrent requests to
  -- Groq all dispatched; the only refusal was on tokens.
  max_concurrent int not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.challenge_rate_limits(provider,tokens_per_minute,requests_per_minute,max_concurrent) values
 ('groq',8000,1000,0),('openai',200000,500,0),('anthropic',80000,1000,0),('deepseek',1000000,1000,0)
on conflict (provider) do nothing;

-- Token bucket. Capacity equals the per-minute allowance, so idle time buys at
-- most one minute of burst -- which is what the provider actually enforces.
create table if not exists public.challenge_rate_state(
  provider text primary key,
  tokens_available numeric not null default 0,
  refilled_at timestamptz not null default now()
);

create table if not exists public.challenge_queue_tickets(
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.challenge_sessions(id) on delete cascade,
  provider text not null,
  estimated_tokens int not null,
  state text not null default 'waiting' check(state in('waiting','running','done','abandoned')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists challenge_queue_waiting on public.challenge_queue_tickets(provider,state,created_at);
create index if not exists challenge_queue_by_session on public.challenge_queue_tickets(session_id,state);

-- An incident is a failure the engine could not retry its way out of: a bad
-- key, a model that does not exist, an exhausted quota. The instructor has to
-- see these, because no amount of waiting fixes them.
create table if not exists public.challenge_incidents(
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.challenge_sessions(id) on delete set null,
  provider text,
  model text,
  kind text not null check(kind in('blocking','retries_exhausted')),
  code text,
  message text,
  attempts int not null default 1,
  occurrences int not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);
create index if not exists challenge_incidents_open on public.challenge_incidents(resolved_at,last_seen_at desc);

alter table public.challenge_rate_limits    enable row level security;
alter table public.challenge_rate_state     enable row level security;
alter table public.challenge_queue_tickets  enable row level security;
alter table public.challenge_incidents      enable row level security;

drop policy if exists "instructor reads limits" on public.challenge_rate_limits;
create policy "instructor reads limits" on public.challenge_rate_limits
  for select using(public.is_challenge_instructor());
drop policy if exists "instructor manages limits" on public.challenge_rate_limits;
create policy "instructor manages limits" on public.challenge_rate_limits
  for all using(public.is_challenge_instructor()) with check(public.is_challenge_instructor());
drop policy if exists "instructor reads incidents" on public.challenge_incidents;
create policy "instructor reads incidents" on public.challenge_incidents
  for select using(public.is_challenge_instructor());
drop policy if exists "instructor resolves incidents" on public.challenge_incidents;
create policy "instructor resolves incidents" on public.challenge_incidents
  for update using(public.is_challenge_instructor()) with check(public.is_challenge_instructor());
-- Tickets and bucket state are written only by the service role.

grant select, insert, update on public.challenge_rate_limits to authenticated;
grant select, update on public.challenge_incidents to authenticated;
