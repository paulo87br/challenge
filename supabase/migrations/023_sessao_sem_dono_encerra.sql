-- Uma sessão que ninguém toca há um dia também para de estar em andamento.
--
-- A 018 tira o mundo do ar por ociosidade, mas a sessão dentro dele continuava
-- 'active' para sempre: o encerramento por tempo esgotado só acontece no
-- navegador, então quem fecha a aba deixa a sessão aberta e nada no servidor a
-- fecha. Na tela do instrutor isso vira uma turma inteira "em andamento" meses
-- depois -- um número que não quer dizer nada.
--
-- 'abandoned', não 'completed': ninguém gerou debrief, e dizer "encerrada"
-- afirmaria que existe leitura onde não existe. Abandonada é o que de fato
-- aconteceu -- a pessoa saiu e não voltou.
--
-- A janela é a do cenário (idle_hours, da 018): o mesmo dia que tira o mundo do
-- ar fecha as sessões dele. Sem agendador, pelo mesmo motivo da 018 -- roda
-- quando alguém pergunta o que está no ar e quando o instrutor abre a lista,
-- que é quando a resposta importa.

create or replace function public.challenge_encerrar_sessoes_ociosas()
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  afetados int;
begin
  with ultima as (
    select s.id,
           greatest(
             coalesce(s.updated_at, s.started_at, now()),
             coalesce(s.started_at, '-infinity'::timestamptz),
             coalesce((select max(t.created_at) from public.challenge_telemetry t
                        where t.session_id = s.id), '-infinity'::timestamptz),
             coalesce((select max(tu.created_at) from public.challenge_turns tu
                        where tu.session_id = s.id), '-infinity'::timestamptz),
             coalesce((select max(c.started_at) from public.challenge_calls c
                        where c.session_id = s.id), '-infinity'::timestamptz)
           ) as em,
           coalesce(e.idle_hours, 24) as janela
      from public.challenge_sessions s
      left join public.challenge_scenarios e on e.key = s.scenario_key
     where s.status in ('active','paused')
  )
  update public.challenge_sessions s
     set status = 'abandoned',
         completed_at = now()
    from ultima u
   where s.id = u.id
     and u.em < now() - make_interval(hours => greatest(1, u.janela));
  get diagnostics afetados = row_count;
  return afetados;
end
$fn$;

revoke all on function public.challenge_encerrar_sessoes_ociosas() from public;
revoke all on function public.challenge_encerrar_sessoes_ociosas() from anon, authenticated;
