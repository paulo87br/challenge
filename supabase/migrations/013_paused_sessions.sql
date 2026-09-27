-- Pausing was written against a status the column does not accept: the check
-- constraint only allowed active, completed and abandoned, so every attempt to
-- pause failed silently against the database while the browser showed itself
-- as paused. A participant who paused and came back on another machine would
-- have found the session still running.

alter table public.challenge_sessions drop constraint if exists challenge_sessions_status_check;
alter table public.challenge_sessions drop constraint if exists sessions_status_check;
alter table public.challenge_sessions
  add constraint challenge_sessions_status_check
  check(status in('active','paused','completed','abandoned'));

-- Paused time is not spent time: the instructor panel counts a paused session
-- as in progress, not as abandoned.
create index if not exists challenge_sessions_by_status on public.challenge_sessions(status, updated_at desc);
