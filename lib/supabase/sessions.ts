import{createSupabaseAdminClient,createSupabaseServerClient}from'./server';
import type{Debrief,EngineLog,EvidenceSignal,TurnDiagnostic,WorldState}from'@/lib/simulation/types';
import{defaultScenario,worldFromScenario,type ScenarioConfig}from'@/lib/simulation/scenario';
import{codigoValido,normalizaCodigo}from'@/lib/mundo/codigo';
import type{MundoNoAr}from'@/lib/mundo/tipos';
import{nomeDoUsuario}from'@/lib/mundo/usuario';

export type SessionRow={id:string;world_state:WorldState|Record<string,never>;debrief:Debrief|null;status:string};
export type Usuario={nome:string;email:string};
export type SessionBundle={session:SessionRow;scenario:ScenarioConfig;evidenceCount:number;usuario?:Usuario};
// Um mundo no ar é um cenário em que alguém pode entrar agora. Com mais de um
// no ar ao mesmo tempo, "qual mundo" deixa de ser dedutível e passa a ser uma
// escolha: por código, por link, ou na lista que o /lab mostra.
export type{MundoNoAr};
export{expirarMundosOciosos};
export type Entrada=SessionBundle|{escolha:MundoNoAr[];faltaMigracao?:boolean;usuario?:Usuario};
export function pedeEscolha(entrada:Entrada|null):entrada is{escolha:MundoNoAr[];faltaMigracao?:boolean}{
 return Boolean(entrada&&'escolha'in entrada);
}

const CAMPOS_MUNDO='key,title,domain,seat_role,mission';

/**
 * Antes da 016 não existe join_code e a consulta com ele erra. Cair para a
 * consulta sem o código mantém o /lab de pé para quem está no meio de uma
 * sessão, e `faltaMigracao` faz o Studio dizer em voz alta o que falta — que é
 * o oposto do que aconteceu três vezes neste projeto, em que a migração não
 * aplicada apareceu como um recurso inerte e nenhum erro em lugar nenhum.
 */
/**
 * Tira do ar o que venceu, antes de dizer o que está no ar.
 *
 * Não há agendador neste projeto, e depender de um seria pior: o momento em que
 * a expiração precisa valer é exatamente este, quando alguém pergunta onde
 * pode entrar. Assim um mundo esquecido nunca chega a ser entrável, mesmo que
 * nada rode entre uma visita e outra.
 *
 * Roda com a chave de serviço porque a função é do servidor -- nenhum
 * participante tem, nem precisa ter, permissão de executá-la. Sem a chave, o
 * app segue funcionando e a janela apenas não fecha sozinha.
 */
async function expirarMundosOciosos(){
 const admin=createSupabaseAdminClient();
 if(!admin)return;
 const{error}=await admin.rpc('challenge_expirar_mundos_ociosos');
 // Antes da 018 a função não existe. Falhar aqui não pode impedir alguém de
 // entrar, mas sumir com o erro foi o que já custou caro neste projeto.
 if(error)console.warn('expirar_mundos_ociosos',error.message);
}

export async function mundosNoAr(supabase:any):Promise<{mundos:MundoNoAr[];faltaMigracao:boolean}>{
 await expirarMundosOciosos();
 const filtro=(q:any)=>q.eq('active',true).eq('is_template',false).order('title');
 const{data,error}=await filtro(supabase.from('challenge_scenarios').select(`${CAMPOS_MUNDO},join_code`));
 if(!error)return{mundos:(data||[]) as MundoNoAr[],faltaMigracao:false};
 const{data:sem,error:erroSem}=await filtro(supabase.from('challenge_scenarios').select(CAMPOS_MUNDO));
 if(erroSem)return{mundos:[],faltaMigracao:true};
 return{mundos:(sem||[]).map((m:any)=>({...m,join_code:null})),faltaMigracao:true};
}

// Returns null whenever Supabase is not configured or nobody is signed in, so
// every caller degrades into the local-only mode the app already supports.
async function loadScenario(supabase:any,scenarioKey?:string):Promise<ScenarioConfig>{
 // A session already under way keeps its own scenario; a new one takes
 // whichever is active. Activating a different world must not rewrite a run
 // somebody is inside.
 if(scenarioKey){
  const{data}=await supabase.from('challenge_scenarios').select('*').eq('key',scenarioKey).maybeSingle();
  if(data)return{...defaultScenario,...data,temperature:data.temperature||{}};
 }
 // Before migration 014 there is no "active" column, and the query errors.
 // Falling through to the single original scenario keeps the world somebody
 // authored instead of quietly reverting them to the compiled default.
 const{data:live,error}=await supabase.from('challenge_scenarios')
  .select('*').eq('active',true).eq('is_template',false).limit(1).maybeSingle();
 if(!error&&live)return{...defaultScenario,...live,temperature:live.temperature||{}};
 const{data:legado}=await supabase.from('challenge_scenarios').select('*').eq('key','atlas').maybeSingle();
 return legado?{...defaultScenario,...legado,temperature:legado.temperature||{}}:defaultScenario;
}

export async function ensureSession():Promise<Entrada|null>{
 const supabase=createSupabaseServerClient();
 if(!supabase)return null;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 // Concluída também é retomada, e de propósito. Antes só active e paused
 // voltavam: quem encerrava e recarregava ganhava um mundo novo em silêncio,
 // como se a prova entregue reaparecesse em branco sobre a mesa. Agora a
 // sessão encerrada volta com o debrief dela, e começar outra é um ato
 // explícito -- o botão Recomeçar.
 const{data:existing}=await supabase.from('challenge_sessions')
  .select('id,world_state,debrief,status,scenario_key').eq('user_id',user.id)
  .in('status',['active','paused','completed'])
  .order('started_at',{ascending:false}).limit(1).maybeSingle();
 const scenario=await loadScenario(supabase,existing?.scenario_key);
 if(existing){
  // A session created before the Studio could author anything carries an empty
  // world. Filling it in is what makes the scenario reach someone who signed in
  // early; an empty world means no turn was ever synced, so nothing is lost.
  const world=(existing.world_state as any)?.scenarioId?existing.world_state:worldFromScenario(scenario);
  if(!(existing.world_state as any)?.scenarioId)
   await supabase.from('challenge_sessions').update({world_state:world}).eq('id',existing.id);
  // Counted with the service role on purpose: the policies give the participant
  // no read on evidence, which is what keeps them from grading themselves. They
  // are still owed the number, or the closing screen tells them they have none.
  return{...await comEvidencia(supabase,{...existing,world_state:world},scenario),
   usuario:{nome:nomeDoUsuario(user),email:String(user.email||'')}};
 }
 // Sem sessão em andamento, qual mundo começar deixou de ter resposta única.
 // Com um só no ar, entrar direto é o que sempre aconteceu e continua: não há
 // escolha a fazer. Com vários, escolher é da pessoa — silenciosamente pegar o
 // primeiro colocaria alguém no mundo errado sem ela perceber, que é justamente
 // o problema que o código de acesso existe para resolver.
 const{mundos,faltaMigracao}=await mundosNoAr(supabase);
 const usuario={nome:nomeDoUsuario(user),email:String(user.email||'')};
 if(mundos.length!==1)return{escolha:mundos,faltaMigracao,usuario};
 return{...await criarSessao(supabase,user.id,await loadScenario(supabase,mundos[0].key)),usuario};
}

async function criarSessao(supabase:any,userId:string,scenario:ScenarioConfig):Promise<SessionBundle>{
 // A new world is built from the authored scenario. Sessions already running
 // keep the world they were played in: editing the Studio must not rewrite
 // somebody else's history mid-run.
 const{data:created,error}=await supabase.from('challenge_sessions')
  .insert({user_id:userId,scenario_key:scenario.key,world_state:worldFromScenario(scenario)})
  .select('id,world_state,debrief,status').single();
 if(error)throw new Error(error.message);
 return{session:created as SessionRow,scenario,evidenceCount:0};
}

/**
 * Entrar por código, que é o caminho do projetor e do link. O código identifica
 * o mundo, não a sessão: duas turmas no mesmo cenário compartilham o código e
 * cada pessoa continua tendo a sua sessão.
 */
export async function entrarNoMundo(codigoCru:string,abandonarAtual=false):Promise<
 SessionBundle|{erro:'codigo_invalido'|'codigo_nao_encontrado'}|{conflito:{atual:MundoNoAr;novo:MundoNoAr}}|null>{
 const supabase=createSupabaseServerClient();
 if(!supabase)return null;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 const codigo=normalizaCodigo(codigoCru);
 if(!codigoValido(codigo))return{erro:'codigo_invalido'};

 const{mundos}=await mundosNoAr(supabase);
 const destino=mundos.find(m=>m.join_code===codigo);
 if(!destino)return{erro:'codigo_nao_encontrado'};

 const{data:emAndamento}=await supabase.from('challenge_sessions')
  .select('id,world_state,debrief,status,scenario_key').eq('user_id',user.id)
  .in('status',['active','paused','completed'])
  .order('started_at',{ascending:false}).limit(1).maybeSingle();

 if(emAndamento){
  // Mesmo mundo: o código é só o caminho de volta, nada a decidir.
  if(emAndamento.scenario_key===destino.key){
   const scenario=await loadScenario(supabase,destino.key);
   return {...(await comEvidencia(supabase,emAndamento,scenario))};
  }
  // Outro mundo: trocar descarta uma corrida em andamento, e isso não se faz
  // por dedução. Quem decide é a pessoa, na tela, sabendo o que perde.
  if(!abandonarAtual){
   const atual=mundos.find(m=>m.key===emAndamento.scenario_key)
    ||{key:emAndamento.scenario_key,title:(emAndamento.world_state as any)?.title||emAndamento.scenario_key,
       domain:'',seat_role:'',mission:'',join_code:null};
   return{conflito:{atual,novo:destino}};
  }
  // Guardada, não apagada: uma corrida abandonada ainda é algo que o instrutor
  // pode querer olhar, e a evidência presa a ela não é da pessoa para apagar.
  await supabase.from('challenge_sessions')
   .update({status:'abandoned',completed_at:new Date().toISOString()})
   .eq('user_id',user.id).in('status',['active','paused']);
 }
 return criarSessao(supabase,user.id,await loadScenario(supabase,destino.key));
}

// Restarting has to reach the database. Resetting only the browser left the
// old session as the server's truth, so the next page load brought the
// abandoned world straight back.
// Counted with the service role on purpose: the policies give the participant
// no read on evidence, which is what keeps them from grading themselves. They
// are still owed the number, or the closing screen tells them they have none.
async function comEvidencia(_supabase:any,session:any,scenario:ScenarioConfig):Promise<SessionBundle>{
 const admin=createSupabaseAdminClient();
 const{count}=admin
  ?await admin.from('challenge_evidence').select('id',{count:'exact',head:true}).eq('session_id',session.id)
  :{count:0};
 return{session:session as SessionRow,scenario,evidenceCount:count||0};
}

export async function restartSession():Promise<SessionBundle|null>{
 const supabase=createSupabaseServerClient();
 if(!supabase)return null;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 // Recomeçar é recomeçar o mesmo desafio, não pular de mundo. Com vários no ar,
 // pegar "o ativo" daria a quem clica em recomeçar um mundo diferente do que
 // estava jogando, sem pedir nada.
 const{data:atual}=await supabase.from('challenge_sessions')
  .select('scenario_key').eq('user_id',user.id).in('status',['active','paused','completed'])
  .order('started_at',{ascending:false}).limit(1).maybeSingle();
 // Kept, not deleted: an abandoned run is still something the instructor may
 // want to look at, and the evidence attached to it is not the person's to erase.
 await supabase.from('challenge_sessions')
  .update({status:'abandoned',completed_at:new Date().toISOString()})
  .eq('user_id',user.id).in('status',['active','paused','completed']);
 const scenario=await loadScenario(supabase,atual?.scenario_key);
 return criarSessao(supabase,user.id,scenario);
}

export async function saveSessionState(sessionId:string,patch:{world?:WorldState;debrief?:Debrief|null;status?:string}){
 const supabase=createSupabaseServerClient();
 if(!supabase)return false;
 const update:Record<string,unknown>={updated_at:new Date().toISOString()};
 if(patch.world)update.world_state=patch.world;
 if(patch.debrief!==undefined)update.debrief=patch.debrief;
 if(patch.status){update.status=patch.status;if(patch.status==='completed')update.completed_at=new Date().toISOString();if(patch.status==='active')update.completed_at=null}
 const{error}=await supabase.from('challenge_sessions').update(update).eq('id',sessionId);
 if(error)throw new Error(error.message);
 return true;
}

// Evidence is written with the service role on purpose: the policies give the
// participant no insert on it, so the assessment record cannot be forged from
// the browser even by someone who reads the bundle.
export async function recordTurnRows(sessionId:string,action:any,signals:EvidenceSignal[],simulatedMinute?:number,
 turn?:{requestId:string;durationMs:number;model:string;provider:string;usage:{inputTokens:number;outputTokens:number;calls:number};diagnostic:TurnDiagnostic;logs:EngineLog[]}){
 const admin=createSupabaseAdminClient();
 if(!admin||!sessionId)return 'unavailable' as const;
 const telemetry=admin.from('challenge_telemetry').insert({
  session_id:sessionId,action:String(action?.action||'unknown'),channel:String(action?.channel||'unknown'),
  character_id:action?.characterId??null,body:action?.text??null,metadata:action?.metadata??{},simulated_minute:simulatedMinute??null});
 const evidence=signals.length?admin.from('challenge_evidence').insert(signals.map(signal=>({
  session_id:sessionId,competency:signal.competency,behavior:signal.behavior,evidence:signal.evidence,
  strength:Number(signal.strength)||0,confidence:Number(signal.confidence)||0,polarity:signal.polarity,
  corroboration_required:Boolean(signal.corroboration_required)}))):Promise.resolve({error:null});
 const[t,e]=await Promise.all([telemetry,evidence]);
 if((t as any).error||(e as any).error)return 'failed' as const;

 // Engine diagnostics used to live only in the participant's browser, which is
 // the one place the instructor cannot look.
 if(turn){
  const{data:turnRow}=await admin.from('challenge_turns').insert({
   session_id:sessionId,request_id:turn.requestId,duration_ms:turn.durationMs,model:turn.model,provider:turn.provider,
   input_tokens:turn.usage?.inputTokens??null,output_tokens:turn.usage?.outputTokens??null,model_calls:turn.usage?.calls??null,
   severity:turn.diagnostic?.severity??null,headline:turn.diagnostic?.headline??null,summary:turn.diagnostic?.summary??null,
   action_channel:action?.channel??null,action_name:action?.action??null,character_id:action?.characterId??null
  }).select('id').single();
  if(turnRow?.id&&turn.logs?.length)await admin.from('challenge_engine_logs').insert(
   turn.logs.map(entry=>({turn_id:turnRow.id,at:entry.at,stage:entry.stage,status:entry.status,message:entry.message,meta:entry.meta??null})));
 }
 return 'saved' as const;
}
