-- This Supabase project is shared with the other personal apps: pulso_*,
-- artigos, corpus_*, depoimentos and exclusao_* all live in the same public
-- schema. Table names like "sessions" and "evidence" were a collision waiting
-- to happen. Prefixing keeps Challenge isolated without requiring the schema
-- to be added to the API's exposed schemas by hand.
--
-- Order matters: the policies depend on the guard function, so they have to go
-- before it does. Dropping the function first fails with 2BP01.

-- 1. rename the tables; their policies follow them, still naming the old function
alter table if exists public.sessions    rename to challenge_sessions;
alter table if exists public.telemetry   rename to challenge_telemetry;
alter table if exists public.evidence    rename to challenge_evidence;
alter table if exists public.instructors rename to challenge_instructors;

-- 1b. renaming a table leaves its indexes under the old names, which would
-- leave this project one migration away from the fresh one
alter index if exists public.sessions_pkey        rename to challenge_sessions_pkey;
alter index if exists public.sessions_by_user     rename to challenge_sessions_by_user;
alter index if exists public.telemetry_pkey       rename to challenge_telemetry_pkey;
alter index if exists public.telemetry_by_session rename to challenge_telemetry_by_session;
alter index if exists public.evidence_pkey        rename to challenge_evidence_pkey;
alter index if exists public.evidence_by_session  rename to challenge_evidence_by_session;
alter index if exists public.instructors_pkey     rename to challenge_instructors_pkey;

-- 2. drop the policies while the function they depend on still exists
drop policy if exists "read own session or any as instructor"   on public.challenge_sessions;
drop policy if exists "create own session"                      on public.challenge_sessions;
drop policy if exists "update own session"                      on public.challenge_sessions;
drop policy if exists "read own telemetry or any as instructor" on public.challenge_telemetry;
drop policy if exists "append own telemetry"                    on public.challenge_telemetry;
drop policy if exists "instructor reads evidence"               on public.challenge_evidence;

-- 3. now nothing depends on it
drop function if exists public.is_instructor();

create or replace function public.is_challenge_instructor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(select 1 from public.challenge_instructors i where i.user_id = auth.uid());
$$;

-- 4. rebuild the policies against the new function
create policy "read own session or any as instructor" on public.challenge_sessions
  for select using(user_id = auth.uid() or public.is_challenge_instructor());
create policy "create own session" on public.challenge_sessions
  for insert with check(user_id = auth.uid());
create policy "update own session" on public.challenge_sessions
  for update using(user_id = auth.uid()) with check(user_id = auth.uid());

create policy "read own telemetry or any as instructor" on public.challenge_telemetry
  for select using(
    public.is_challenge_instructor()
    or exists(select 1 from public.challenge_sessions s where s.id = session_id and s.user_id = auth.uid())
  );
create policy "append own telemetry" on public.challenge_telemetry
  for insert with check(
    exists(select 1 from public.challenge_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

create policy "instructor reads evidence" on public.challenge_evidence
  for select using(public.is_challenge_instructor());

-- 5. RLS survives the rename, but assert it rather than assume it
alter table public.challenge_instructors enable row level security;
alter table public.challenge_sessions    enable row level security;
alter table public.challenge_telemetry   enable row level security;
alter table public.challenge_evidence    enable row level security;

grant select, insert, update on public.challenge_sessions  to authenticated;
grant select, insert on public.challenge_telemetry to authenticated;
grant select on public.challenge_evidence to authenticated;
grant execute on function public.is_challenge_instructor() to authenticated;
