-- Challenge · foundation schema
--
-- Lives in public on purpose. This project is dedicated to Challenge, and a
-- custom schema would have to be added to the API's exposed schemas by hand
-- before anything worked -- one more manual step to get wrong before a class.

create extension if not exists pgcrypto;

-- Who gets the instructor view. Populated by hand; no self-service.
create table if not exists public.instructors(
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

-- security definer so the policies below can consult the table without
-- recursing through its own RLS.
create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(select 1 from public.instructors i where i.user_id = auth.uid());
$$;

create table if not exists public.sessions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_key text not null default 'atlas',
  status text not null default 'active' check(status in('active','completed','abandoned')),
  world_state jsonb not null default '{}',
  debrief jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists sessions_by_user on public.sessions(user_id, started_at desc);

create table if not exists public.telemetry(
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  action text not null,
  channel text not null,
  character_id text,
  body text,
  metadata jsonb not null default '{}',
  simulated_minute int,
  created_at timestamptz not null default now()
);
create index if not exists telemetry_by_session on public.telemetry(session_id, created_at);

create table if not exists public.evidence(
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  competency text not null,
  behavior text not null,
  evidence text not null,
  strength numeric not null check(strength between 0 and 1),
  confidence numeric not null check(confidence between 0 and 1),
  polarity text not null check(polarity in('positive','neutral','risk')),
  corroboration_required boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists evidence_by_session on public.evidence(session_id);

alter table public.instructors enable row level security;
alter table public.sessions   enable row level security;
alter table public.telemetry  enable row level security;
alter table public.evidence   enable row level security;

-- instructors: no policy at all, so only the service role and the security
-- definer function above can touch it.

drop policy if exists "read own session or any as instructor" on public.sessions;
create policy "read own session or any as instructor" on public.sessions
  for select using(user_id = auth.uid() or public.is_instructor());
drop policy if exists "create own session" on public.sessions;
create policy "create own session" on public.sessions
  for insert with check(user_id = auth.uid());
drop policy if exists "update own session" on public.sessions;
create policy "update own session" on public.sessions
  for update using(user_id = auth.uid()) with check(user_id = auth.uid());

drop policy if exists "read own telemetry or any as instructor" on public.telemetry;
create policy "read own telemetry or any as instructor" on public.telemetry
  for select using(
    public.is_instructor()
    or exists(select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid())
  );
drop policy if exists "append own telemetry" on public.telemetry;
create policy "append own telemetry" on public.telemetry
  for insert with check(
    exists(select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid())
  );

-- Evidence is the assessment record. The participant must not read it raw --
-- they get a generated debrief -- and must not be able to write it. Inserts go
-- through the service role from the Observer; only instructors select.
drop policy if exists "instructor reads evidence" on public.evidence;
create policy "instructor reads evidence" on public.evidence
  for select using(public.is_instructor());

grant usage on schema public to authenticated;
grant select, insert, update on public.sessions  to authenticated;
grant select, insert on public.telemetry to authenticated;
grant select on public.evidence to authenticated;
grant execute on function public.is_instructor() to authenticated;
