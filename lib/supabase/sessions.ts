import{createSupabaseAdminClient,createSupabaseServerClient}from'./server';
import{deduplicar,calibrar,somenteDaRegua}from'@/lib/simulation/sinais';
import type{Competency,Debrief,EngineLog,EvidenceSignal,TurnDiagnostic,WorldState}from'@/lib/simulation/types';
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
export{expirarOciosos};
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
async function expirarOciosos(){
 const admin=createSupabaseAdminClient();
 if(!admin)return;
 // Duas varreduras, porque são duas coisas: o mundo sai do ar e a sessão que
 // ficou dentro dele para de contar como alguém sentado à mesa.
 for(const fn of['challenge_expirar_mundos_ociosos','challenge_encerrar_sessoes_ociosas']){
  const{error}=await admin.rpc(fn);
  // Antes da migração a função não existe. Falhar aqui não pode impedir alguém
  // de entrar, mas sumir com o erro foi o que já custou caro neste projeto.
  if(error)console.warn(fn,error.message);
 }
}

export async function mundosNoAr(supabase:any):Promise<{mundos:MundoNoAr[];faltaMigracao:boolean}>{
 await expirarOciosos();
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

/**
 * Ler uma sessão sem transformar erro em ausência.
 *
 * Pedir elapsed_ms num banco que ainda não tem a 025 faz o select falhar; como
 * o erro era ignorado, "não consegui ler" virava "não existe" e cada entrada
 * pelo código criava outra sessão por cima da anterior. Degradar em degraus,
 * na ordem em que as colunas nasceram, é o que o Studio já fazia -- aqui faltava.
 */
const CAMPOS_SESSAO='id,world_state,debrief,status,scenario_key';
async function lerSessoes(supabase:any,userId:string,scenarioKey?:string){
 const monta=(campos:string)=>{
  const q=supabase.from('challenge_sessions').select(campos).eq('user_id',userId)
   .in('status',['active','paused','completed']).order('started_at',{ascending:false});
  return scenarioKey?q.eq('scenario_key',scenarioKey):q;
 };
 const completo=await monta(`${CAMPOS_SESSAO},elapsed_ms`);
 if(!completo.error)return{linhas:(completo.data||[])as any[],erro:null};
 const basico=await monta(CAMPOS_SESSAO);
 // Um erro aqui não é "sem sessão": quem chama precisa saber a diferença, ou
 // cria uma corrida nova em cima de uma que existe.
 return{linhas:(basico.data||[])as any[],erro:basico.error?String(basico.error.message):null};
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
 const{linhas:minhas,erro:erroDeLeitura}=await lerSessoes(supabase,user.id);
 if(erroDeLeitura)throw new Error(erroDeLeitura);
 const porMundo=new Map<string,any>();
 for(const linha of minhas)if(!porMundo.has(linha.scenario_key))porMundo.set(linha.scenario_key,linha);
 // Com corrida viva em mais de um mundo, abrir /lab sem código não tem resposta
 // única: pegar a mais recente colocaria a pessoa no mundo errado sem ela
 // perceber. A tela de escolha já existe e é onde essa decisão pertence.
 const existing=porMundo.size===1?[...porMundo.values()][0]:null;
 if(porMundo.size>1){
  const{mundos,faltaMigracao}=await mundosNoAr(supabase);
  const meus=[...porMundo.keys()];
  const ordenados=[...mundos].sort((a,b)=>Number(meus.includes(b.key))-Number(meus.includes(a.key)));
  return{escolha:ordenados,faltaMigracao,usuario:{nome:nomeDoUsuario(user),email:String(user.email||'')}};
 }
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
export async function entrarNoMundo(codigoCru:string):Promise<
 SessionBundle|{erro:'codigo_invalido'|'codigo_nao_encontrado'}|null>{
 const supabase=createSupabaseServerClient();
 if(!supabase)return null;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 const codigo=normalizaCodigo(codigoCru);
 if(!codigoValido(codigo))return{erro:'codigo_invalido'};

 const{mundos}=await mundosNoAr(supabase);
 const destino=mundos.find(m=>m.join_code===codigo);
 if(!destino)return{erro:'codigo_nao_encontrado'};

 // Uma corrida viva por mundo. Antes havia uma só por pessoa, e entrar noutro
 // mundo obrigava a descartar a atual: quem conduz não conseguia testar um
 // cenário novo sem perder a corrida em que estava, e um participante que
 // errasse de código perdia a dele. O código identifica o mundo; a sessão
 // daquele mundo é retomada se existir e criada se não.
 const{linhas,erro}=await lerSessoes(supabase,user.id,destino.key);
 // Falhar ao ler não pode virar uma corrida nova por cima da que existe.
 if(erro)throw new Error(erro);
 const daquele=linhas[0];
 if(daquele)return{...(await comEvidencia(supabase,daquele,await loadScenario(supabase,destino.key)))};
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
 // Só o mundo em que a pessoa está. Abandonar todas derrubava também a corrida
 // dela em outro mundo, que recomeçar aqui não tem por que tocar.
 const consulta=supabase.from('challenge_sessions')
  .update({status:'abandoned',completed_at:new Date().toISOString()})
  .eq('user_id',user.id).in('status',['active','paused','completed']);
 await(atual?.scenario_key?consulta.eq('scenario_key',atual.scenario_key):consulta);
 const scenario=await loadScenario(supabase,atual?.scenario_key);
 return criarSessao(supabase,user.id,scenario);
}

export async function saveSessionState(sessionId:string,patch:{world?:WorldState;debrief?:Debrief|null;status?:string;elapsedMs?:number}){
 const supabase=createSupabaseServerClient();
 if(!supabase)return false;
 const update:Record<string,unknown>={updated_at:new Date().toISOString()};
 if(patch.world)update.world_state=patch.world;
 if(patch.debrief!==undefined)update.debrief=patch.debrief;
 // O tempo decorrido passa a ser fato da sessão: com uma corrida por mundo,
 // alternar entre mundos limpa o estado local, e sem isto voltar daria o
 // relógio zerado a quem já gastou os quarenta minutos.
 if(typeof patch.elapsedMs==='number'&&Number.isFinite(patch.elapsedMs))
  update.elapsed_ms=Math.max(0,Math.round(patch.elapsedMs));
 if(patch.status){update.status=patch.status;if(patch.status==='completed')update.completed_at=new Date().toISOString();if(patch.status==='active')update.completed_at=null}
 const{error}=await supabase.from('challenge_sessions').update(update).eq('id',sessionId);
 if(error&&'elapsed_ms'in update&&/elapsed_ms/.test(error.message)){
  const{elapsed_ms,...semRelogio}=update;
  const retry=await supabase.from('challenge_sessions').update(semRelogio).eq('id',sessionId);
  if(retry.error)throw new Error(retry.error.message);
  return true;
 }
 if(error)throw new Error(error.message);
 return true;
}

/**
 * A sessão ainda aceita turno?
 *
 * A tranca do encerramento estava só no navegador: a rota de turno recebia o
 * mundo e a ação e executava, sem olhar o estado. Encerrado tem de ser
 * encerrado no lugar onde o fato mora.
 */
export async function sessaoAceitaTurno(sessionId:string):Promise<{ok:true}|{ok:false;motivo:string}>{
 const supabase=createSupabaseServerClient();
 if(!supabase)return{ok:true};
 const{data,error}=await supabase.from('challenge_sessions')
  .select('status,debrief').eq('id',sessionId).maybeSingle();
 // Sessão que não se consegue ler não é sessão encerrada: na dúvida, deixar
 // jogar é melhor que travar alguém no meio da aula por um erro de leitura.
 if(error||!data)return{ok:true};
 if(data.debrief)return{ok:false,motivo:'Esta sessão já foi encerrada e tem uma leitura entregue.'};
 if(data.status==='completed')return{ok:false,motivo:'Esta sessão já foi encerrada.'};
 if(data.status==='abandoned')return{ok:false,motivo:'Esta sessão foi encerrada por quem conduz o Challenge.'};
 return{ok:true};
}

// Evidence is written with the service role on purpose: the policies give the
// participant no insert on it, so the assessment record cannot be forged from
// the browser even by someone who reads the bundle.
/**
 * O que a sessão já registrou, para não registrar de novo.
 *
 * Uma pessoa que repete a mesma conduta ao longo da sessão gerava um sinal novo
 * a cada vez. Com 4,4 sinais por ação, o número media digitação.
 */
async function sinaisJaRegistrados(admin:any,sessionId:string):Promise<EvidenceSignal[]>{
 const{data}=await admin.from('challenge_evidence')
  .select('competency,behavior,evidence,strength,confidence,polarity,corroboration_required')
  .eq('session_id',sessionId).order('created_at').limit(400);
 return (data||[]) as EvidenceSignal[];
}

export async function recordTurnRows(sessionId:string,action:any,signals:EvidenceSignal[],simulatedMinute?:number,
 turn?:{requestId:string;durationMs:number;model:string;provider:string;usage:{inputTokens:number;outputTokens:number;calls:number};diagnostic:TurnDiagnostic;logs:EngineLog[]},
 framework?:Competency[]){
 const admin=createSupabaseAdminClient();
 if(!admin||!sessionId)return 'unavailable' as const;

 // O caminho da evidência entre o Observer e a linha gravada: fora da régua
 // não entra, repetição não vira sinal novo, e cada sinal carrega quanto se
 // apoia no que a pessoa escreveu neste turno -- que é a única comparação
 // confiável, porque aqui a ação é a do próprio turno.
 const daRegua=somenteDaRegua(signals as any[],framework||[]);
 const semRepetidos=deduplicar(daRegua.sinais,await sinaisJaRegistrados(admin,sessionId));
 const comLastro=calibrar(semRepetidos.sinais,String(action?.text||''));
 const aGravar=comLastro.sinais;
 const telemetry=admin.from('challenge_telemetry').insert({
  session_id:sessionId,action:String(action?.action||'unknown'),channel:String(action?.channel||'unknown'),
  character_id:action?.characterId??null,body:action?.text??null,metadata:action?.metadata??{},simulated_minute:simulatedMinute??null});
 const linha=(signal:any)=>({
  session_id:sessionId,competency:signal.competency,behavior:signal.behavior,evidence:signal.evidence,
  strength:Number(signal.strength)||0,confidence:Number(signal.confidence)||0,polarity:signal.polarity,
  corroboration_required:Boolean(signal.corroboration_required)});
 const comColunasNovas=(signal:any)=>({...linha(signal),support:signal.lastro||'nao_medido',repeated:signal.repetido||1});
 const gravar=async()=>{
  if(!aGravar.length)return{error:null};
  const r=await admin.from('challenge_evidence').insert(aGravar.map(comColunasNovas));
  // Antes da 027 as colunas não existem. Gravar sem elas é melhor que perder a
  // evidência do turno inteiro.
  if(r.error&&/support|repeated/.test(String(r.error.message)))
   return admin.from('challenge_evidence').insert(aGravar.map(linha));
  return r;
 };
 const[t,e]=await Promise.all([telemetry,gravar()]);
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
