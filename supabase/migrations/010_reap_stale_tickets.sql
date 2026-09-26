-- 009 created challenge_reap_tickets and nothing ever called it, which made the
-- queue deadlock on the most ordinary event there is: somebody closing the tab
-- while waiting. Their ticket stayed in 'waiting' forever, everyone behind them
-- counted it in "ahead", and no amount of free capacity let anyone through.
-- Reproduced: with a full bucket and 8000 tokens available, a participant
-- needing 6500 was refused because of one abandoned ticket.
--
-- The fix is a heartbeat, not a cron. A live client asks again at most every
-- 60s, so a ticket nobody has asked about in two minutes belongs to a browser
-- that is gone.

alter table public.challenge_queue_tickets
  add column if not exists last_seen_at timestamptz not null default now();

create index if not exists challenge_queue_stale
  on public.challenge_queue_tickets(state, last_seen_at);

create or replace function public.challenge_claim_turn(
  p_session uuid, p_provider text, p_tokens int
) returns table(
  granted boolean, ticket_id uuid, queue_position int, wait_ms int, tokens_available numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg record; st record; ticket record;
  now_ts timestamptz := clock_timestamp();
  refill numeric; ahead int; running int;
begin
  select * into cfg from public.challenge_rate_limits where provider = p_provider;
  -- An unknown provider is not throttled rather than blocked: a missing config
  -- row must never be the reason somebody cannot play.
  if not found then
    return query select true, null::uuid, 0, 0, 0::numeric; return;
  end if;

  perform pg_advisory_xact_lock(hashtext('challenge_rate_' || p_provider));

  -- Inline rather than scheduled: this must run on the path that reads the
  -- queue, or a stale ticket blocks the line until someone notices.
  update public.challenge_queue_tickets
     set state = 'abandoned', finished_at = now_ts
   where provider = p_provider
     and (
       (state = 'waiting' and last_seen_at < now_ts - interval '2 minutes')
       -- A turn takes seconds; three minutes means the function died holding it.
       or (state = 'running' and coalesce(started_at, created_at) < now_ts - interval '3 minutes')
     );

  -- One live ticket per session. A participant who retries keeps their place
  -- instead of going to the back of the line.
  select * into ticket from public.challenge_queue_tickets
   where session_id is not distinct from p_session and state = 'waiting'
   order by created_at limit 1;
  if not found then
    insert into public.challenge_queue_tickets(session_id, provider, estimated_tokens, last_seen_at)
    values (p_session, p_provider, p_tokens, now_ts) returning * into ticket;
  else
    update public.challenge_queue_tickets
       set estimated_tokens = p_tokens, last_seen_at = now_ts
     where id = ticket.id returning * into ticket;
  end if;

  select count(*) into ahead from public.challenge_queue_tickets
   where provider = p_provider and state = 'waiting' and created_at < ticket.created_at;
  select count(*) into running from public.challenge_queue_tickets
   where provider = p_provider and state = 'running';

  select * into st from public.challenge_rate_state where provider = p_provider for update;
  if not found then
    insert into public.challenge_rate_state(provider, tokens_available, refilled_at)
    values (p_provider, cfg.tokens_per_minute, now_ts) returning * into st;
  end if;

  refill := least(cfg.tokens_per_minute::numeric,
            st.tokens_available + extract(epoch from (now_ts - st.refilled_at)) * cfg.tokens_per_minute / 60.0);

  if ahead > 0
     or (cfg.max_concurrent > 0 and running >= cfg.max_concurrent)
     or refill < p_tokens then
    update public.challenge_rate_state
       set tokens_available = refill, refilled_at = now_ts where provider = p_provider;
    return query select false, ticket.id, ahead,
      greatest(0, ceil(
        (ahead * p_tokens + greatest(0, p_tokens - refill)) * 60000.0 / cfg.tokens_per_minute
      ))::int,
      refill;
    return;
  end if;

  update public.challenge_rate_state
     set tokens_available = refill - p_tokens, refilled_at = now_ts where provider = p_provider;
  update public.challenge_queue_tickets
     set state = 'running', started_at = now_ts, last_seen_at = now_ts where id = ticket.id;
  return query select true, ticket.id, 0, 0, refill - p_tokens;
end $$;
