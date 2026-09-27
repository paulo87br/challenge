-- Until now there was exactly one scenario, keyed 'atlas', and everything
-- referenced that key directly. Authoring a second world meant editing the
-- first. Scenarios become plural: one is active for new sessions, any can be
-- kept as a template to start the next one from.

alter table public.challenge_scenarios
  add column if not exists is_template boolean not null default false,
  add column if not exists active boolean not null default false,
  add column if not exists created_from text,
  add column if not exists created_at timestamptz not null default now();

update public.challenge_scenarios set active = true where key = 'atlas';

-- Exactly one live scenario at a time. A template is never active: it is a
-- starting point, not a world anybody is inside.
create unique index if not exists challenge_scenario_one_active
  on public.challenge_scenarios((active)) where active and not is_template;

create index if not exists challenge_scenarios_templates
  on public.challenge_scenarios(is_template, created_at desc);

-- Sessions already point at a scenario_key, so a session started under one
-- world keeps it even after the instructor activates another. Editing or
-- switching scenarios must never rewrite somebody's run.
