-- Cole no SQL Editor do Supabase para ver quais migrações estão realmente
-- aplicadas. Só lê; não altera nada.
--
-- Este projeto não tem tabela de controle de migração: a verificação é pela
-- presença das colunas e tabelas que cada arquivo cria. Três vezes nesta
-- construção uma migração foi dada como aplicada sem estar, e o sintoma foi
-- sempre o mesmo -- uma funcionalidade inerte, sem erro visível.

with checagens(migracao, o_que_cria, presente) as (values
 ('001/002 fundação',        'challenge_sessions',      to_regclass('public.challenge_sessions')      is not null),
 ('003 studio e motor',      'challenge_scenarios',     to_regclass('public.challenge_scenarios')     is not null),
 ('004 provedor e consumo',  'scenarios.provider',      exists(select 1 from information_schema.columns where table_name='challenge_scenarios' and column_name='provider')),
 ('005 personas',            'scenarios.characters',    exists(select 1 from information_schema.columns where table_name='challenge_scenarios' and column_name='characters')),
 ('007 competências',        'scenarios.competencies',  exists(select 1 from information_schema.columns where table_name='challenge_scenarios' and column_name='competencies')),
 ('008 fila e incidentes',   'challenge_queue_tickets', to_regclass('public.challenge_queue_tickets') is not null),
 ('009 funções da fila',     'challenge_claim_turn()',  exists(select 1 from pg_proc where proname='challenge_claim_turn')),
 ('010 ceifa de bilhetes',   'tickets.last_seen_at',    exists(select 1 from information_schema.columns where table_name='challenge_queue_tickets' and column_name='last_seen_at')),
 ('011 imprensa e calls',    'scenarios.news',          exists(select 1 from information_schema.columns where table_name='challenge_scenarios' and column_name='news')),
 ('012 chamadas',            'challenge_calls',         to_regclass('public.challenge_calls')         is not null),
 ('013 sessão pausada',      'status aceita paused',    exists(select 1 from pg_constraint where conname='challenge_sessions_status_check' and pg_get_constraintdef(oid) like '%paused%')),
 ('014 templates',           'scenarios.is_template',   exists(select 1 from information_schema.columns where table_name='challenge_scenarios' and column_name='is_template')),
 ('015 caso jurídico',       'cenário juridico',        exists(select 1 from public.challenge_scenarios where key='juridico')),
 ('016 muitos mundos no ar', 'scenarios.join_code',     exists(select 1 from information_schema.columns where table_name='challenge_scenarios' and column_name='join_code')),
 -- A 017 muda dado, não schema: o sinal é a imprensa ter deixado de ser
 -- hora do dia. Nenhuma notícia em minuto alto significa que já converteu.
 ('017 imprensa no tempo',   'news.at em minutos',      not exists(
   select 1 from public.challenge_scenarios s, jsonb_array_elements(coalesce(s.news,'[]'::jsonb)) n
    where (n->>'at')::int > 240)),
 ('018 mundo expira',       'expirar_mundos_ociosos()', exists(select 1 from pg_proc where proname='challenge_expirar_mundos_ociosos')),
 ('019 eventos do cenário',  'scenarios.events',        exists(select 1 from information_schema.columns where table_name='challenge_scenarios' and column_name='events')),
 -- A 020 é dado: o sinal é o caso ter eventos para disparar sozinho.
 ('020 eventos do caso',     'juridico com eventos',    coalesce((select jsonb_array_length(events) from public.challenge_scenarios where key='juridico'),0) > 0),
 ('021 cenário sobrevive',   'updated_by on delete',    exists(select 1 from pg_constraint where conname='challenge_scenarios_updated_by_fkey' and confdeltype='n')),
 ('022 organização do mundo', 'scenarios.organization',  exists(select 1 from information_schema.columns where table_name='challenge_scenarios' and column_name='organization')),
 ('023 sessão sem dono',     'encerrar_sessoes_ociosas()', exists(select 1 from pg_proc where proname='challenge_encerrar_sessoes_ociosas'))
)
select
 case when presente then 'ok      ' else 'FALTA   ' end || migracao as situacao,
 o_que_cria
from checagens
order by migracao;
