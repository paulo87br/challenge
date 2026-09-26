-- Claiming capacity has to be atomic: two functions running at once must not
-- both decide the bucket has room. The state row is locked for the duration.

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

  -- One live ticket per session. A participant who retries keeps their place
  -- instead of going to the back of the line.
  select * into ticket from public.challenge_queue_tickets
   where session_id is not distinct from p_session and state = 'waiting'
   order by created_at limit 1;
  if not found then
    insert into public.challenge_queue_tickets(session_id, provider, estimated_tokens)
    values (p_session, p_provider, p_tokens) returning * into ticket;
  else
    update public.challenge_queue_tickets set estimated_tokens = p_tokens
     where id = ticket.id returning * into ticket;
  end if;

  perform pg_advisory_xact_lock(hashtext('challenge_rate_' || p_provider));

  select count(*) into ahead from public.challenge_queue_tickets
   where provider = p_provider and state = 'waiting' and created_at < ticket.created_at;
  select count(*) into running from public.challenge_queue_tickets
   where provider = p_provider and state = 'running' and started_at > now_ts - interval '3 minutes';

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
      -- Everyone ahead has to be served first, then this turn's own shortfall.
      greatest(0, ceil(
        (ahead * p_tokens + greatest(0, p_tokens - refill)) * 60000.0 / cfg.tokens_per_minute
      ))::int,
      refill;
    return;
  end if;

  update public.challenge_rate_state
     set tokens_available = refill - p_tokens, refilled_at = now_ts where provider = p_provider;
  update public.challenge_queue_tickets
     set state = 'running', started_at = now_ts where id = ticket.id;
  return query select true, ticket.id, 0, 0, refill - p_tokens;
end $$;

-- The estimate is charged up front; this settles the difference once the real
-- usage is known, so a cheap turn gives its surplus back to the next person.
create or replace function public.challenge_settle_turn(
  p_ticket uuid, p_provider text, p_estimated int, p_actual int
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare cfg record; st record; delta numeric;
begin
  update public.challenge_queue_tickets
     set state = 'done', finished_at = clock_timestamp() where id = p_ticket;
  select * into cfg from public.challenge_rate_limits where provider = p_provider;
  if not found then return; end if;
  delta := p_estimated - p_actual;
  select * into st from public.challenge_rate_state where provider = p_provider for update;
  if not found then return; end if;
  update public.challenge_rate_state
     set tokens_available = greatest(0, least(cfg.tokens_per_minute::numeric, st.tokens_available + delta))
   where provider = p_provider;
end $$;

-- A ticket whose function died mid-flight would hold the line forever.
create or replace function public.challenge_reap_tickets() returns int
language sql
security definer
set search_path = ''
as $$
  with dead as (
    update public.challenge_queue_tickets set state = 'abandoned', finished_at = clock_timestamp()
     where state in ('waiting','running')
       and coalesce(started_at, created_at) < clock_timestamp() - interval '5 minutes'
    returning 1
  ) select count(*)::int from dead;
$$;
