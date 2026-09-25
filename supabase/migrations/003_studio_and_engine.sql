-- The Studio needs somewhere to keep an authored scenario, and the engine
-- diagnostics move out of the participant's workspace into the instructor
-- console, which means they have to survive the browser that produced them.

create table if not exists public.challenge_scenarios(
  key text primary key,
  title text not null,
  domain text not null,
  seat_role text not null,
  mission text,
  world_description text,
  temperature jsonb not null default '{}',
  duration_minutes int not null default 30,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenge_turns(
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.challenge_sessions(id) on delete cascade,
  request_id text not null,
  duration_ms int,
  severity text,
  headline text,
  summary text,
  model text,
  action_channel text,
  action_name text,
  character_id text,
  created_at timestamptz not null default now()
);
create index if not exists challenge_turns_by_session on public.challenge_turns(session_id, created_at desc);

create table if not exists public.challenge_engine_logs(
  id bigserial primary key,
  turn_id uuid not null references public.challenge_turns(id) on delete cascade,
  at bigint,
  stage text,
  status text,
  message text,
  meta jsonb
);
create index if not exists challenge_engine_logs_by_turn on public.challenge_engine_logs(turn_id, id);

alter table public.challenge_scenarios   enable row level security;
alter table public.challenge_turns       enable row level security;
alter table public.challenge_engine_logs enable row level security;

-- The scenario is the premise of the world; a participant already lives inside
-- it, so reading it reveals nothing. Authoring is instructor ground.
drop policy if exists "anyone signed in reads the scenario" on public.challenge_scenarios;
create policy "anyone signed in reads the scenario" on public.challenge_scenarios
  for select using(auth.uid() is not null);
drop policy if exists "instructor writes the scenario" on public.challenge_scenarios;
create policy "instructor writes the scenario" on public.challenge_scenarios
  for all using(public.is_challenge_instructor()) with check(public.is_challenge_instructor());

-- Engine internals are instructor-only: they expose how the world is driven.
drop policy if exists "instructor reads turns" on public.challenge_turns;
create policy "instructor reads turns" on public.challenge_turns
  for select using(public.is_challenge_instructor());
drop policy if exists "instructor reads engine logs" on public.challenge_engine_logs;
create policy "instructor reads engine logs" on public.challenge_engine_logs
  for select using(public.is_challenge_instructor());

grant select, insert, update, delete on public.challenge_scenarios to authenticated;
grant select on public.challenge_turns to authenticated;
grant select on public.challenge_engine_logs to authenticated;

insert into public.challenge_scenarios(key,title,domain,seat_role,mission,world_description,temperature,duration_minutes)
values('atlas','Projeto Atlas','AI Governance','AI Governance Lead',
 'conduza a decisão sobre a entrada do assistente de IA em produção.',
 'Empresa de médio porte preparando um assistente de IA generativa para produção. Existe pressão executiva, documentação incompleta e sinais de uso de dados reais no piloto.',
 '{"ambiguity":0.7,"timePressure":0.8,"stakeholderConflict":0.6,"informationNoise":0.4,"technicalComplexity":0.7,"incidentSeverity":0.5}'::jsonb,30)
on conflict (key) do nothing;
