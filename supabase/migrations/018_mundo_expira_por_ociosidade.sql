-- Um mundo que ninguém toca há um dia sai do ar sozinho.
--
-- Com cadastro aberto -- que é o que a turma exige, porque a conta de cada aluno
-- não existe antes da aula -- qualquer pessoa com o link e uma conta entra. O
-- custo disso não é o acesso em si: é um mundo esquecido no ar por semanas,
-- consumindo orçamento de LLM de quem passar por ele.
--
-- Fechar por domínio de e-mail resolveria o acesso e quebraria a operação: dois
-- advogados testam antes da turma, cada uso tem gente de origem diferente, e a
-- lista teria de ser mantida a cada vez. Ociosidade não cobra nada de ninguém e
-- fecha a janela sozinha.
--
-- Não depende de agendador. A expiração é avaliada quando alguém tenta entrar e
-- quando o Studio abre -- ou seja, exatamente no instante em que importa. Se um
-- dia o pg_cron estiver ligado, a função abaixo serve de tarefa sem mudança:
--   select cron.schedule('challenge-expira', '17 * * * *',
--                        $$select public.challenge_expirar_mundos_ociosos()$$);

alter table public.challenge_scenarios
  add column if not exists live_since timestamptz,
  add column if not exists auto_off_at timestamptz,
  -- Em horas, por cenário: o teste de dois advogados numa tarde e uma turma ao
  -- longo de uma semana não querem a mesma janela.
  add column if not exists idle_hours int not null default 24;

-- Quem já está no ar começa a contar de agora, não de um passado que ninguém
-- registrou -- senão a primeira execução tiraria o mundo do ar na hora.
update public.challenge_scenarios set live_since = now()
 where active and not is_template and live_since is null;

/**
 * Tira do ar todo mundo cuja última interação é mais velha que a janela dele.
 *
 * "Interação" é qualquer sinal de que alguém esteve lá: sessão aberta ou
 * sincronizada, turno, telemetria, chamada. Olhar só o updated_at da sessão
 * deixaria de fora quem joga turnos sem que a tela sincronize, e um mundo vivo
 * sairia do ar debaixo de alguém.
 *
 * Um mundo que subiu e nunca recebeu ninguém conta a partir de live_since.
 *
 * security definer porque quem chama é o servidor com a chave de serviço; a
 * função não recebe parâmetro nenhum, então não há o que um chamador torça.
 */
create or replace function public.challenge_expirar_mundos_ociosos()
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  afetados int;
begin
  with ultima as (
    select s.key,
           greatest(
             coalesce(s.live_since, s.updated_at, now()),
             coalesce((select max(greatest(x.started_at, x.updated_at))
                         from public.challenge_sessions x
                        where x.scenario_key = s.key), '-infinity'::timestamptz),
             coalesce((select max(t.created_at)
                         from public.challenge_telemetry t
                         join public.challenge_sessions x on x.id = t.session_id
                        where x.scenario_key = s.key), '-infinity'::timestamptz),
             coalesce((select max(tu.created_at)
                         from public.challenge_turns tu
                         join public.challenge_sessions x on x.id = tu.session_id
                        where x.scenario_key = s.key), '-infinity'::timestamptz),
             coalesce((select max(c.started_at)
                         from public.challenge_calls c
                         join public.challenge_sessions x on x.id = c.session_id
                        where x.scenario_key = s.key), '-infinity'::timestamptz)
           ) as em
      from public.challenge_scenarios s
     where s.active and not s.is_template
  )
  update public.challenge_scenarios s
     set active = false,
         auto_off_at = now()
    from ultima u
   where s.key = u.key
     and u.em < now() - make_interval(hours => greatest(1, s.idle_hours));
  get diagnostics afetados = row_count;
  return afetados;
end
$fn$;

-- Só o servidor com a chave de serviço chama. Nenhum participante precisa
-- desta função, e quem não precisa não recebe.
revoke all on function public.challenge_expirar_mundos_ociosos() from public;
revoke all on function public.challenge_expirar_mundos_ociosos() from anon, authenticated;
