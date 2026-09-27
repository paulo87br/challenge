-- Voice is billed per minute of audio, not per token, so the queue that governs
-- turns does not see it at all. Calls get their own budget, their own record and
-- their own ceiling, or they are spending nobody is watching.

alter table public.challenge_scenarios
  add column if not exists call_minutes_per_call int not null default 5,
  add column if not exists call_minutes_per_session int not null default 15,
  add column if not exists call_voice text not null default 'marin';

create table if not exists public.challenge_calls(
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.challenge_sessions(id) on delete cascade,
  character_id text not null,
  character_name text,
  model text,
  voice text,
  status text not null default 'ringing' check(status in('ringing','active','ended','failed')),
  seconds int not null default 0,
  -- Kept so the call is part of the replay and the Observer has something to
  -- read: the audio itself never touches this server.
  transcript jsonb not null default '[]',
  failure text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists challenge_calls_by_session on public.challenge_calls(session_id, started_at desc);

alter table public.challenge_calls enable row level security;

drop policy if exists "read own calls or any as instructor" on public.challenge_calls;
create policy "read own calls or any as instructor" on public.challenge_calls
  for select using(
    public.is_challenge_instructor()
    or exists(select 1 from public.challenge_sessions s where s.id = session_id and s.user_id = auth.uid())
  );
-- Written only by the service role: a participant must not be able to erase a
-- call they would rather not have on the record, or invent one they did not make.

grant select on public.challenge_calls to authenticated;

-- How much of the budget a session has already spent.
create or replace function public.challenge_call_seconds(p_session uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(seconds), 0)::int from public.challenge_calls
   where session_id = p_session and status in ('active','ended');
$$;

grant execute on function public.challenge_call_seconds(uuid) to authenticated;
