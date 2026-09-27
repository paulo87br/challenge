import{redirect}from'next/navigation';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{defaultScenario,type ScenarioConfig}from'@/lib/simulation/scenario';import{initialWorld}from'@/lib/simulation/runtime';
import{AdminConsole,type Participant,type TurnRow,type Incident}from'./admin-console';import{FAILURE_LABELS}from'@/lib/ai/errors';

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
 const LISTA='key,title,domain,seat_role,is_template,active,created_from,updated_at';
 const{data:comCodigo,error:erroCodigo}=await supabase.from('challenge_scenarios')
  .select(`${LISTA},join_code`).order('created_at',{ascending:false});
 const{data:scenarioRows}=erroCodigo
  ?await supabase.from('challenge_scenarios').select(LISTA).order('created_at',{ascending:false})
  :{data:comCodigo};
 const faltaMigracao=Boolean(erroCodigo);
 const scenario:ScenarioConfig=scenarioRow?{...defaultScenario,...scenarioRow,temperature:scenarioRow.temperature||{}}:defaultScenario;

 const[{data:sessions},{data:evidence},{data:telemetry},{data:turnRows}]=await Promise.all([
  supabase.from('challenge_sessions').select('id,user_id,status,started_at,updated_at,debrief').order('updated_at',{ascending:false}),
  supabase.from('challenge_evidence').select('session_id,polarity'),
  supabase.from('challenge_telemetry').select('session_id'),
  supabase.from('challenge_turns').select('*').order('created_at',{ascending:false}).limit(40)
 ]);
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

 const participants:Participant[]=people.map(person=>{
  const session=(sessions||[]).find(row=>row.user_id===person.id);
  return{userId:person.id,email:person.email||person.id,createdAt:person.created_at,
   lastSignIn:person.last_sign_in_at||null,sessionId:session?.id||null,status:session?.status||null,
   actions:count(telemetry,session?.id||null),evidence:count(evidence,session?.id||null),
   risks:session?(evidence||[]).filter(row=>row.session_id===session.id&&row.polarity==='risk').length:0,
   hasDebrief:Boolean(session?.debrief),startedAt:session?.started_at||null,updatedAt:session?.updated_at||null};
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
 const voiceKeyConfigured=Boolean(process.env.OPENAI_API_KEY?.trim());

 return <AdminConsole scenario={scenario} defaultCast={initialWorld.characters} participants={participants} turns={turns} incidents={incidents} limits={(limitRows||[]) as any} voiceKeyConfigured={voiceKeyConfigured} scenarios={(scenarioRows||[]) as any} faltaMigracao={faltaMigracao}/>;
}
