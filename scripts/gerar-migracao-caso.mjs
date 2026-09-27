// Regenerates the scenario migration from content/caso-juridico.json, so the
// case is edited as data and the SQL is never hand-maintained.
import{readFileSync,writeFileSync}from'node:fs';
const caso=JSON.parse(readFileSync('content/caso-juridico.json','utf8'));
const sql=v=>JSON.stringify(v).replace(/'/g,"''");
const txt=v=>String(v).replace(/'/g,"''");
const migracao=readFileSync('supabase/migrations/015_caso_juridico.sql','utf8')
 .replace(/values \([\s\S]*?\n\) on conflict/,`values (\n '${caso.key}','${txt(caso.title)}','${txt(caso.domain)}','${txt(caso.seat_role)}',\n '${txt(caso.mission)}','${txt(caso.world_description)}',\n '${sql(caso.temperature)}'::jsonb,${caso.duration_minutes},\n '${sql(caso.characters)}'::jsonb,\n '${sql(caso.artifacts)}'::jsonb,\n '${sql(caso.knowledge)}'::jsonb,\n '${sql(caso.competencies)}'::jsonb,\n '${sql(caso.news)}'::jsonb,\n ${caso.calls_enabled},${caso.call_minutes_per_call},${caso.call_minutes_per_session},'${caso.call_voice}',\n false,false,'manual'\n) on conflict`);
writeFileSync('supabase/migrations/015_caso_juridico.sql',migracao);
console.log('015_caso_juridico.sql regenerada a partir de content/caso-juridico.json');
