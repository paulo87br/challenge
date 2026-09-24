-- Challenge · foundation schema (lite)
--
-- Covers only what the class MVP needs: who is playing, the world they are
-- playing, what they did and what the Observer saw. Scenarios, seats and
-- competencies stay in code (lib/simulation/runtime.ts) until the Studio can
-- actually author worlds. The full 9-table model is in git history:
--   git show c09e21e:supabase/migrations/001_challenge_core.sql

create extension if not exists pgcrypto;
create schema if not exists challenge;

-- Who gets the instructor view. Populated by hand; no self-service.
create table challenge.instructors(
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

-- security definer so the policies below can consult the table without
-- recursing through its own RLS.
create or replace function challenge.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(select 1 from challenge.instructors i where i.user_id = auth.uid());
$$;

create table challenge.sessions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_key text not null default 'atlas',
  status text not null default 'active' check(status in('active','completed','abandoned')),
  world_state jsonb not null default '{}',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index sessions_by_user on challenge.sessions(user_id, started_at desc);

create table challenge.telemetry(
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references challenge.sessions(id) on delete cascade,
  action text not null,
  channel text not null,
  character_id text,
  body text,
  metadata jsonb not null default '{}',
  simulated_minute int,
  created_at timestamptz not null default now()
);
create index telemetry_by_session on challenge.telemetry(session_id, created_at);

create table challenge.evidence(
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references challenge.sessions(id) on delete cascade,
  telemetry_id uuid references challenge.telemetry(id) on delete set null,
  competency text not null,
  behavior text not null,
  evidence text not null,
  strength numeric not null check(strength between 0 and 1),
  confidence numeric not null check(confidence between 0 and 1),
  polarity text not null check(polarity in('positive','neutral','risk')),
  corroboration_required boolean not null default true,
  created_at timestamptz not null default now()
);
create index evidence_by_session on challenge.evidence(session_id);

alter table challenge.instructors enable row level security;
alter table challenge.sessions enable row level security;
alter table challenge.telemetry enable row level security;
alter table challenge.evidence enable row level security;

-- instructors: no policy at all, so only the service role and the security
-- definer function above can touch it.

create policy "read own session or any as instructor" on challenge.sessions
  for select using(user_id = auth.uid() or challenge.is_instructor());
create policy "create own session" on challenge.sessions
  for insert with check(user_id = auth.uid());
create policy "update own session" on challenge.sessions
  for update using(user_id = auth.uid()) with check(user_id = auth.uid());

create policy "read own telemetry or any as instructor" on challenge.telemetry
  for select using(
    challenge.is_instructor()
    or exists(select 1 from challenge.sessions s where s.id = session_id and s.user_id = auth.uid())
  );
create policy "append own telemetry" on challenge.telemetry
  for insert with check(
    exists(select 1 from challenge.sessions s where s.id = session_id and s.user_id = auth.uid())
  );

-- Evidence is the assessment record: the participant must not be able to read
-- it raw (they get a generated debrief) nor write it. Inserts go through the
-- service role from the Observer; only instructors select.
create policy "instructor reads evidence" on challenge.evidence
  for select using(challenge.is_instructor());

grant usage on schema challenge to authenticated;
grant select, insert, update on challenge.sessions to authenticated;
grant select, insert on challenge.telemetry to authenticated;
grant select on challenge.evidence to authenticated;
