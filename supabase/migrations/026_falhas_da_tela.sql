-- Nenhuma das três falhas que morderam a turma apareceu no Studio.
--
-- O limite de e-mail acontece antes do app. O "Converting circular structure to
-- JSON" acontecia no navegador, e o log do cliente só chega ao servidor
-- pendurado num turno -- um debrief que falha não produz turno, então sumia. E
-- os 254 diagnósticos errados estavam gravados, mas ninguém somava.
--
-- Esta tabela recebe o que falha na tela da pessoa fora de um turno. É pouca
-- linha por natureza: só se escreve quando algo deu errado.
--
-- Não é telemetria. Telemetria conta ação da pessoa e alimenta a avaliação;
-- misturar falha de software ali inflaria o número de ações de quem teve azar.

create table if not exists public.challenge_client_failures(
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.challenge_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  stage text not null,
  message text not null,
  detail jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists challenge_client_failures_recentes
  on public.challenge_client_failures(created_at desc);

alter table public.challenge_client_failures enable row level security;

-- Quem está travado é quem precisa poder contar que travou.
drop policy if exists "participante registra a própria falha" on public.challenge_client_failures;
create policy "participante registra a própria falha" on public.challenge_client_failures
  for insert with check(user_id = auth.uid());

drop policy if exists "instrutor lê as falhas" on public.challenge_client_failures;
create policy "instrutor lê as falhas" on public.challenge_client_failures
  for select using(public.is_challenge_instructor());

grant select, insert on public.challenge_client_failures to authenticated;
