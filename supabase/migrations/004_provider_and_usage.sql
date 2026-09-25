-- The Studio picks which model drives the world, and every turn records what it
-- actually consumed. Without the token counts there is no way to answer "what
-- does one session cost" before a class rather than after the bill.

alter table public.challenge_scenarios add column if not exists provider text not null default 'openai';
alter table public.challenge_scenarios add column if not exists model text;

alter table public.challenge_turns add column if not exists provider text;
alter table public.challenge_turns add column if not exists input_tokens int;
alter table public.challenge_turns add column if not exists output_tokens int;
-- One turn is several model calls: Director, each cascaded character, Observer.
alter table public.challenge_turns add column if not exists model_calls int;

update public.challenge_scenarios set model = coalesce(model, 'gpt-5.6') where key = 'atlas';
