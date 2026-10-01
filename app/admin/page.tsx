import{redirect}from'next/navigation';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{defaultScenario,type ScenarioConfig}from'@/lib/simulation/scenario';import{initialWorld}from'@/lib/simulation/runtime';
import{AdminConsole,type Participant,type TurnRow,type Incident}from'./admin-console';import{nomeDoUsuario}from'@/lib/mundo/usuario';import{expirarOciosos}from'@/lib/supabase/sessions';import{FAILURE_LABELS}from'@/lib/ai/errors';import{estadoDaVariavel,estadoDasChaves}from'@/lib/ai/chaves';

export const dynamic='force-dynamic';
export const metadata={title:'Studio · Challenge'};

export default async function Admin({searchParams}:{searchParams?:{cenario?:string}}){
 const supabase=createSupabaseServerClient();
 // Backstop for the middleware: a change to its matcher must not silently
 // open the Studio to participants.
 if(!supabase)redirect('/login');
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login?next=%2Fadmin');
 const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
 if(!isInstructor)redirect('/lab');

 // Com mais de um mundo no ar, "o cenário que o Studio edita" deixou de ser
 // dedutível: ?cenario= diz qual. Sem ele, o primeiro no ar; sem nenhum no ar,
 // o original — nunca os defaults compilados, que apagariam o que foi autorado.
 // Antes da 014 as colunas não existem e a consulta erra, daí o mesmo caminho.
 // O Studio também é um momento em que a expiração precisa já ter valido:
 // abrir a tela e ver no ar um mundo vencido seria mentir para quem conduz.
 await expirarOciosos();
 const pedido=typeof searchParams?.cenario==='string'?searchParams.cenario:'';
 const{data:pedidoRow}=pedido
  ?await supabase.from('challenge_scenarios').select('*').eq('key',pedido).maybeSingle()
  :{data:null};
 const{data:liveRow}=pedidoRow?{data:null}
  :await supabase.from('challenge_scenarios').select('*').eq('active',true).eq('is_template',false).order('title').limit(1).maybeSingle();
 const{data:scenarioRow}=pedidoRow?{data:pedidoRow}:liveRow?{data:liveRow}
  :await supabase.from('challenge_scenarios').select('*').eq('key','atlas').maybeSingle();
 // Antes da 016 não existe join_code. Cair para a consulta sem ele mantém o
 // Studio de pé, e faltaMigracao faz a tela dizer o que falta em vez de deixar
 // a funcionalidade parecendo quebrada sem explicação.
 // A degradação é em degraus, na ordem em que as colunas nasceram: pedir de uma
 // vez tudo o que a 016 e a 018 criaram faria o Studio abrir vazio em qualquer
 // banco que esteja uma migração atrás -- o contrário do que se quer de uma tela
 // cuja função é justamente dizer o que falta.
 const LISTA='key,title,domain,seat_role,is_template,active,created_from,updated_at';
 const tentar=(campos:string)=>supabase.from('challenge_scenarios').select(campos).order('created_at',{ascending:false});
 const completo=await tentar(`${LISTA},join_code,live_since,auto_off_at,idle_hours`);
 const comCodigo=completo.error?await tentar(`${LISTA},join_code`):completo;
 const basico=comCodigo.error?await tentar(LISTA):comCodigo;
 const scenarioRows=basico.data;
 const faltaMigracao=Boolean(comCodigo.error);
 const scenario:ScenarioConfig=scenarioRow?{...defaultScenario,...scenarioRow,temperature:scenarioRow.temperature||{}}:defaultScenario;

 const[{data:sessions},{data:evidence},{data:telemetry},{data:turnRows}]=await Promise.all([
  supabase.from('challenge_sessions').select('id,user_id,scenario_key,status,started_at,updated_at,debrief').order('updated_at',{ascending:false}),
  supabase.from('challenge_evidence').select('session_id,polarity'),
  supabase.from('challenge_telemetry').select('session_id'),
  supabase.from('challenge_turns').select('*').order('created_at',{ascending:false}).limit(40)
 ]);
 // Consumo: tudo, não os 40 turnos que a aba do motor mostra. São poucas linhas
 // por sessão e é a única forma de somar a conta de uma turma inteira.
 const[{data:todosTurnos},{data:todasChamadas}]=await Promise.all([
  supabase.from('challenge_turns').select('session_id,provider,model,input_tokens,output_tokens'),
  supabase.from('challenge_calls').select('session_id,seconds')
 ]);
 const mundoDaSessao=new Map((sessions||[]).map(row=>[row.id,row.scenario_key||'—']));
 const consumo:Record<string,{modelos:Record<string,{model:string;provider:string;turnos:number;entrada:number;saida:number}>;voz:{chamadas:number;segundos:number}}>={};
 const balde=(chave:string)=>consumo[chave]||=({modelos:{},voz:{chamadas:0,segundos:0}});
 for(const t of todosTurnos||[]){
  const mundo=mundoDaSessao.get(t.session_id);if(!mundo)continue;
  const chave=`${t.provider||'—'}|${t.model||'—'}`;
  for(const alvo of [balde(mundo),balde('todos')]){
   const m=alvo.modelos[chave]||=({model:t.model||'',provider:t.provider||'',turnos:0,entrada:0,saida:0});
   m.turnos+=1;m.entrada+=Number(t.input_tokens)||0;m.saida+=Number(t.output_tokens)||0;
  }
 }
 for(const c of todasChamadas||[]){
  const mundo=mundoDaSessao.get(c.session_id);if(!mundo)continue;
  for(const alvo of [balde(mundo),balde('todos')]){alvo.voz.chamadas+=1;alvo.voz.segundos+=Number(c.seconds)||0}
 }

 const{data:limitRows}=await supabase.from('challenge_rate_limits').select('*').order('provider');
 const{data:incidentRows}=await supabase.from('challenge_incidents').select('*').is('resolved_at',null).order('last_seen_at',{ascending:false}).limit(50);
 // Every query above tolerates a missing table: 003 may not be applied yet, and
 // the Studio has to open anyway. An empty .in() is also an error, not a no-op.
 const turnIds=(turnRows||[]).map(turn=>turn.id);
 const{data:logRows}=turnIds.length
  ? await supabase.from('challenge_engine_logs').select('turn_id,stage,status,message,meta').in('turn_id',turnIds).order('id')
  : {data:[] as any[]};

 // "Who entered" means every account, including the ones that signed in and
 // never acted -- that absence is itself information for the instructor.
 const admin=createSupabaseAdminClient();
 const people=admin?(await admin.auth.admin.listUsers({perPage:200})).data?.users||[]:[];
 const emailOf=(id:string)=>people.find(person=>person.id===id)?.email||id;
 const count=(rows:any[]|null,id:string|null)=>id?(rows||[]).filter(row=>row.session_id===id).length:0;

 // Uma linha por pessoa E por mundo. Antes era uma linha por pessoa, com
 // `find` pegando a sessão mais recente de qualquer mundo: quem jogou em dois
 // aparecia uma vez só, sob o mundo errado, e os números de um vazavam para o
 // outro. Quem tem várias sessões no mesmo mundo é somado, com a contagem à
 // vista -- cinco tentativas no mesmo caso é informação, não ruído.
 const tituloDoMundo=(chave:string)=>String((scenarioRows as any[]||[]).find((s:any)=>s?.key===chave)?.title||chave);
 const participants:Participant[]=people.flatMap((person):Participant[]=>{
  const minhas=(sessions||[]).filter(row=>row.user_id===person.id);
  const base={userId:person.id,email:person.email||person.id,createdAt:person.created_at,
   lastSignIn:person.last_sign_in_at||null};
  if(!minhas.length)return[{...base,scenarioKey:null,scenarioTitle:null,sessionId:null,status:null,
   actions:0,evidence:0,risks:0,hasDebrief:false,debriefs:0,startedAt:null,updatedAt:null,sessions:0}];
  const porMundo=new Map<string,any[]>();
  for(const linha of minhas){
   const chave=linha.scenario_key||'—';
   porMundo.set(chave,[...(porMundo.get(chave)||[]),linha]);
  }
  return[...porMundo.entries()].map(([chave,linhas])=>{
   // A lista já vem por updated_at desc, então a primeira é a mais recente.
   const recente=linhas[0];
   const ids=new Set(linhas.map(l=>l.id));
   const daPessoa=(rows:any[]|null)=>(rows||[]).filter(row=>ids.has(row.session_id));
   return{...base,scenarioKey:chave,scenarioTitle:tituloDoMundo(chave),
    sessionId:recente.id,status:recente.status||null,
    actions:daPessoa(telemetry).length,
    evidence:daPessoa(evidence).length,
    risks:daPessoa(evidence).filter(row=>row.polarity==='risk').length,
    // O selo mostra onde a pessoa está agora, que é o da sessão mais recente.
    // Somar "tem debrief em alguma das cinco" fazia quem terminou uma corrida e
    // começou outra aparecer como concluída no meio da segunda.
    hasDebrief:Boolean(recente.debrief),
    debriefs:linhas.filter(l=>Boolean(l.debrief)).length,
    startedAt:linhas[linhas.length-1].started_at||null,updatedAt:recente.updated_at||null,
    sessions:linhas.length};
  });
 }).sort((a,b)=>(b.actions-a.actions)||a.email.localeCompare(b.email));

 const sessionOwner=new Map((sessions||[]).map(row=>[row.id,emailOf(row.user_id)]));
 const turns:TurnRow[]=(turnRows||[]).map(turn=>({
  id:turn.id,requestId:turn.request_id,createdAt:turn.created_at,severity:turn.severity,headline:turn.headline,
  summary:turn.summary,model:turn.model,actionName:turn.action_name,actionChannel:turn.action_channel,
  durationMs:turn.duration_ms,provider:turn.provider,inputTokens:turn.input_tokens,outputTokens:turn.output_tokens,modelCalls:turn.model_calls,
  email:sessionOwner.get(turn.session_id)||'—',
  logs:(logRows||[]).filter(log=>log.turn_id===turn.id).map(log=>({stage:log.stage,status:log.status,message:log.message,meta:log.meta}))
 }));

 const incidents:Incident[]=(incidentRows||[]).map(row=>({
  id:row.id,provider:row.provider,model:row.model,kind:row.kind,code:row.code,message:row.message,
  occurrences:row.occurrences,attempts:row.attempts,firstSeenAt:row.first_seen_at,lastSeenAt:row.last_seen_at,
  label:FAILURE_LABELS[row.code as string]||row.code||'Falha'}));

 // Read on the server: the Studio can say the voice key is missing before the
 // participant finds out by clicking a button that fails.
 // O que o runtime enxerga, não o que o painel da Vercel lista. Uma variável
 // salva em branco aparece no painel igual a uma preenchida, e falha igual a
 // uma que não existe -- por isso "ausente" e "vazia" são estados distintos.
 const chaves=estadoDasChaves();
 const chaveDeVoz=estadoDaVariavel('OPENAI_API_KEY');
 const voiceKeyConfigured=chaveDeVoz.estado==='ok';

 return <AdminConsole scenario={scenario} defaultCast={initialWorld.characters} participants={participants} turns={turns} incidents={incidents} limits={(limitRows||[]) as any} voiceKeyConfigured={voiceKeyConfigured} scenarios={(scenarioRows||[]) as any} faltaMigracao={faltaMigracao}
  usuario={{nome:nomeDoUsuario(user),email:String(user.email||'')}} chaves={chaves} chaveDeVoz={chaveDeVoz} consumo={consumo}/>;
}
