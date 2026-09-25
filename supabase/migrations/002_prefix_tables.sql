-- This Supabase project is shared with the other personal apps: pulso_*,
-- artigos, corpus_*, depoimentos and exclusao_* all live in the same public
-- schema. Table names like "sessions" and "evidence" were a collision waiting
-- to happen. Prefixing keeps Challenge isolated without requiring the schema
-- to be added to the API's exposed schemas by hand.

alter table if exists public.sessions    rename to challenge_sessions;
alter table if exists public.telemetry   rename to challenge_telemetry;
alter table if exists public.evidence    rename to challenge_evidence;
alter table if exists public.instructors rename to challenge_instructors;

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

-- Policies survive a rename but still name the dropped function, so they are
-- rebuilt here.
drop policy if exists "read own session or any as instructor"   on public.challenge_sessions;
drop policy if exists "create own session"                      on public.challenge_sessions;
drop policy if exists "update own session"                      on public.challenge_sessions;
drop policy if exists "read own telemetry or any as instructor" on public.challenge_telemetry;
drop policy if exists "append own telemetry"                    on public.challenge_telemetry;
drop policy if exists "instructor reads evidence"               on public.challenge_evidence;

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

grant select, insert, update on public.challenge_sessions  to authenticated;
grant select, insert on public.challenge_telemetry to authenticated;
grant select on public.challenge_evidence to authenticated;
grant execute on function public.is_challenge_instructor() to authenticated;
