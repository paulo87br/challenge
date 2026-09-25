-- Characters were compiled into the engine: lib/simulation/runtime.ts held the
-- cast, and app/api/simulation/turn/route.ts named 'rafael', 'julia' and
-- 'Dataset Manifest' in fifteen places. Editing the scenario in the Studio
-- changed the title while the engine still tried to route manifest handoffs to
-- Júlia -- and that regex once overwrote a correct answer about who owned
-- privacy. The cast and the artifacts move into scenario data.

alter table public.challenge_scenarios add column if not exists characters jsonb not null default '[]';
alter table public.challenge_scenarios add column if not exists artifacts jsonb not null default '[]';
alter table public.challenge_scenarios add column if not exists knowledge jsonb not null default '{}';
