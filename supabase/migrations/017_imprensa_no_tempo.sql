-- A imprensa autorada passa a chegar durante a sessão.
--
-- O campo 'at' de cada notícia existia e não fazia nada: o feed entregava a
-- imprensa inteira no primeiro segundo, e o 'at' só carimbava um horário. Pior,
-- ele era hora do dia -- as três notícias do Atlas estavam em 08:12, 08:40 e
-- 09:05, todas antes das 09:42 em que o relógio do mundo começa, então nem
-- filtrando por horário elas chegariam na hora certa.
--
-- Agora 'at' é minutos depois do início da sessão. O mesmo cenário rodando de
-- manhã ou à noite entrega as notícias nos mesmos pontos da corrida.
--
-- O jurídico é atualizado pela reaplicação da 015, que é como o texto do caso
-- se atualiza. Aqui fica o Atlas, cuja imprensa nasceu na 011 e só existe no
-- banco. A ordem da história vira ordem de chegada, dentro dos 30 minutos dele.

do $do$
declare
  novos constant jsonb := '{"news-concorrente":0,"news-incidente":10,"news-anpd":20}'::jsonb;
begin
  update public.challenge_scenarios
     set news = (
       select coalesce(jsonb_agg(
         case when novos ? (item->>'id')
              then jsonb_set(item, '{at}', novos -> (item->>'id'))
              else item end
         order by ordem), '[]'::jsonb)
       from jsonb_array_elements(news) with ordinality as t(item, ordem)
     ),
     updated_at = now()
   where key = 'atlas'
     and news is not null
     -- Só converte o que ainda está em hora do dia. Rodar a migração duas vezes
     -- não pode reescrever minutos que alguém já ajustou no Studio.
     and exists(
       select 1 from jsonb_array_elements(news) as t(item)
       where (item->>'at')::int > 240
     );
end
$do$;
