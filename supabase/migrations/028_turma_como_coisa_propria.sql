-- Turma e mundo deixam de ser a mesma coisa.
--
-- Hoje `mundo = turma = atividade`. Daí decorrem duas coisas que apareceram na
-- primeira aula de verdade: qualquer sessão cai na "turma" -- o teste de quem
-- conduz, a corrida de um colega e os 26 alunos indistinguíveis na mesma média
-- -- e a mesma turma não consegue fazer uma segunda atividade, porque trocar de
-- caso significa trocar de mundo, e trocar de mundo perde o grupo.
--
-- O que faltava era só a turma. Um mundo no ar já é, na prática, uma aplicação:
-- um caso, aberto numa data, com o seu código de entrada. Ligar vários mundos à
-- mesma turma dá o semestre inteiro sem inventar uma terceira entidade.
--
-- turma_id é opcional de propósito. Os mundos que já existem não pertencem a
-- turma nenhuma, e inventar uma para eles seria afirmar um agrupamento que
-- ninguém fez.

create table if not exists public.challenge_turmas(
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  instituicao text,
  periodo text,
  arquivada boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.challenge_scenarios
  add column if not exists turma_id uuid references public.challenge_turmas(id) on delete set null;

create index if not exists challenge_scenarios_por_turma
  on public.challenge_scenarios(turma_id);

alter table public.challenge_turmas enable row level security;

drop policy if exists "instrutor lê turmas" on public.challenge_turmas;
create policy "instrutor lê turmas" on public.challenge_turmas
  for select using(public.is_challenge_instructor());
drop policy if exists "instrutor administra turmas" on public.challenge_turmas;
create policy "instrutor administra turmas" on public.challenge_turmas
  for all using(public.is_challenge_instructor()) with check(public.is_challenge_instructor());

grant select, insert, update, delete on public.challenge_turmas to authenticated;
