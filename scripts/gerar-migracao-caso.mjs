// Generates supabase/migrations/015_caso_juridico.sql from content/caso-juridico.json,
// so the case is edited as data and the SQL is never hand-maintained.
//   node scripts/gerar-migracao-caso.mjs
import{readFileSync,writeFileSync}from'node:fs';

const caso=JSON.parse(readFileSync('content/caso-juridico.json','utf8'));
const j=value=>`'${JSON.stringify(value).replace(/'/g,"''")}'::jsonb`;
const t=value=>`'${String(value).replace(/'/g,"''")}'`;
const verificar=(JSON.stringify(caso).match(/VERIFICAR/g)||[]).length;

const sql=`-- "${caso.title}": o caso do recurso com precedentes inexistentes.
--
-- Gerada a partir de content/caso-juridico.json. Não edite este arquivo à mão:
--   node scripts/gerar-migracao-caso.mjs
--
-- Princípios da spec que estão no dado:
--   - nenhum nome real de pessoa, empresa, escritório, tribunal ou processo;
--   - nenhuma citação normativa escrita pelo agente: onde o caso pediria uma, o
--     texto trata do fato e da decisão, não do dispositivo.
-- As regras de "nunca confirmar nem negar que uma norma existe" e "nunca dizer
-- legal ou ilegal" vivem nos prompts, porque dado nenhum impede um modelo de opinar.
--
-- Independente da 014: o cenário entra com as colunas que existem desde a 012, e
-- os campos de template só são tocados se a 014 já tiver rodado. Assim a ordem
-- entre as duas deixa de importar.

insert into public.challenge_scenarios(
 key,title,domain,seat_role,mission,world_description,temperature,duration_minutes,
 characters,artifacts,knowledge,competencies,news,
 calls_enabled,call_minutes_per_call,call_minutes_per_session,call_voice
) values (
 ${t(caso.key)},${t(caso.title)},${t(caso.domain)},${t(caso.seat_role)},
 ${t(caso.mission)},${t(caso.world_description)},
 ${j(caso.temperature)},${caso.duration_minutes},
 ${j(caso.characters)},
 ${j(caso.artifacts)},
 ${j(caso.knowledge)},
 ${j(caso.competencies)},
 ${j(caso.news)},
 ${caso.calls_enabled},${caso.call_minutes_per_call},${caso.call_minutes_per_session},${t(caso.call_voice)}
) on conflict (key) do update set
 title=excluded.title,domain=excluded.domain,seat_role=excluded.seat_role,
 mission=excluded.mission,world_description=excluded.world_description,
 temperature=excluded.temperature,duration_minutes=excluded.duration_minutes,
 characters=excluded.characters,artifacts=excluded.artifacts,knowledge=excluded.knowledge,
 competencies=excluded.competencies,news=excluded.news,
 calls_enabled=excluded.calls_enabled,call_minutes_per_call=excluded.call_minutes_per_call,
 call_minutes_per_session=excluded.call_minutes_per_session,call_voice=excluded.call_voice,
 updated_at=now();

-- Só se a 014 já existir.
--
-- 'active' não entra aqui de propósito. O cenário nasce fora do ar pelo default
-- da coluna, e pôr no ar é decisão do Studio; escrever active=false neste ponto
-- faria a reaplicação da migração -- que é como o texto do caso é atualizado --
-- tirar do ar um mundo em que alguém pode estar.
do $do$
begin
 if exists(
  select 1 from information_schema.columns
   where table_schema='public' and table_name='challenge_scenarios' and column_name='is_template'
 ) then
  update public.challenge_scenarios
     set is_template=false, created_from='manual'
   where key=${t(caso.key)};
 end if;
end
$do$;
`;
writeFileSync('supabase/migrations/015_caso_juridico.sql',sql);
console.log(`015_caso_juridico.sql gerada · ${caso.characters.length} pessoas · ${caso.artifacts.length} artefatos · ${caso.competencies.length} competências · ${verificar} [VERIFICAR — Paulo]`);
