'use client';
import{useEffect,useMemo,useRef,useState}from'react';import type{KeyboardEvent}from'react';import{Compass,Mail,MessageCircle,Sparkles,Files,History,Phone,Users,Reply,Send,Newspaper,Inbox,SendHorizontal,FileText,FlagTriangleRight}from'lucide-react';import{applyDirector,initialWorld,recordTelemetry}from'@/lib/simulation/runtime';import type{WorldState,WorldEvent,EngineLog,TurnDiagnostic,EvidenceSignal,AssistantMessage,UploadedFile,Debrief}from'@/lib/simulation/types';import{clearSession,loadSession,saveSession}from'@/lib/simulation/persistence';import{conversationChats,conversationMembers,participantesDoFio,visibleEvents}from'@/lib/simulation/view';import{FeedScreen}from'./feed-screen';import{AssistantScreen}from'./assistant-screen';import{FilesScreen}from'./files-screen';import type{FileItem}from'./files-screen';import{MentionComposer,mencoesDesconhecidas,mentionedCharacterIds}from'./mention-composer';import{DebriefScreen}from'./debrief-screen';import{CallScreen}from'./call-screen';import{EscolherMundo}from'@/app/ui/escolher-mundo';import{useDialogo}from'@/app/ui/dialogo';import{UsuarioSessao}from'@/app/ui/usuario-sessao';import{BriefingScreen}from'./briefing-screen';import{OrgScreen}from'./org-screen';import{ChamadaEntrando}from'./chamada-entrando';import{destravarSom,tocarAviso,pararToque}from'@/lib/som';import{climaDoMundo}from'@/lib/simulation/clima';import{acervoDoMundo}from'@/lib/simulation/acervo';import type{MundoNoAr}from'@/lib/mundo/tipos';
const navBase=[{id:'briefing',c:'c3',label:'Briefing',Icon:Compass},{id:'mail',c:'c1',label:'E-mail',Icon:Mail},{id:'chat',c:'c2',label:'Conversas',Icon:MessageCircle},{id:'feed',c:'c8',label:'Feed',Icon:Newspaper},{id:'assistant',c:'c3',label:'Assistente',Icon:Sparkles},{id:'files',c:'c4',label:'Arquivos',Icon:Files},{id:'org',c:'c7',label:'Pessoas',Icon:Users},{id:'timeline',c:'c5',label:'O que rolou',Icon:History},{id:'debrief',c:'c1',label:'Encerrar',Icon:FlagTriangleRight}];
// The simulated clock used to move only when the participant acted, so
// anything the Director scheduled a few minutes out -- an artifact being
// delivered, a feed post, a colleague coming back -- sat invisible forever.
// The world now advances on its own: one simulated minute per REAL_SECONDS.
const REAL_SECONDS_PER_SIMULATED_MINUTE=10;
const CALLS_TAB={id:'calls',c:'c6',label:'Calls',Icon:Phone};
export default function Lab(){const[tab,setTab]=useState('briefing');const[mailFolder,setMailFolder]=useState<'inbox'|'sent'>('inbox');const[world,setWorld]=useState<WorldState>(initialWorld);const[text,setText]=useState('');const[subject,setSubject]=useState('');const[busy,setBusy]=useState(false);const[runtimeError,setRuntimeError]=useState('');const[queueNotice,setQueueNotice]=useState<{texto:string;ate:number}|null>(null);const[blocked,setBlocked]=useState<{label:string;code:string}|null>(null);const[seenFiles,setSeenFiles]=useState<Record<string,boolean>>({});const[seenMails,setSeenMails]=useState<Record<string,boolean>>({});const[soNaoLidos,setSoNaoLidos]=useState(false);const[recusadas,setRecusadas]=useState<Record<string,boolean>>({});const vistosRef=useRef(0);const encerrouSozinho=useRef(false);const[answeredCalls,setAnsweredCalls]=useState<Record<string,boolean>>({});const[assistantAnswer,setAssistantAnswer]=useState('');const[engineLogs,setEngineLogs]=useState<EngineLog[]>([]);const[turnDiagnostics,setTurnDiagnostics]=useState<TurnDiagnostic[]>([]);const[evidence,setEvidence]=useState<EvidenceSignal[]>([]);const[assistantMessages,setAssistantMessages]=useState<AssistantMessage[]>([]);const[uploads,setUploads]=useState<UploadedFile[]>([]);const[debrief,setDebrief]=useState<Debrief|null>(null);const[debriefError,setDebriefError]=useState('');const[sessionId,setSessionId]=useState('');const[engine,setEngine]=useState<{provider:string;model:string}|null>(null);const[artifacts,setArtifacts]=useState<any[]>([]);const[competencies,setCompetencies]=useState<any[]>([]);const[news,setNews]=useState<any[]>([]);const[callsEnabled,setCallsEnabled]=useState(false);const[durationMinutes,setDurationMinutes]=useState(0);const[hydrated,setHydrated]=useState(false);const[elapsedMs,setElapsedMs]=useState(0);const[paused,setPaused]=useState(false);const[serverEvidence,setServerEvidence]=useState<number|null>(null);const[tick,setTick]=useState(0);const[selectedCharacter,setSelectedCharacter]=useState('');const[selectedMail,setSelectedMail]=useState('');const tocouMail=useRef(false);const[selectedFile,setSelectedFile]=useState('');const[escolha,setEscolha]=useState<{mundos:MundoNoAr[];faltaMigracao:boolean}|null>(null);const[usuario,setUsuario]=useState<{nome:string;email:string}|null>(null);const{confirmar,elemento:dialogo}=useDialogo();const visible=useMemo(()=>visibleEvents(world),[world]);const nav=useMemo(()=>{const items=[...navBase];if(callsEnabled)items.splice(5,0,CALLS_TAB);return items},[callsEnabled]);const mails=visible.filter(e=>e.channel==='mail');const chats=visible.filter(e=>e.channel==='chat');const liveFeed=visible.filter(e=>e.channel==='feed');const liveFiles=visible.filter(e=>e.channel==='files');const ringing=visible.filter(e=>e.channel==='call'&&!answeredCalls[e.id]&&!recusadas[e.id]);const incoming=ringing.length?{id:ringing[ringing.length-1].id,characterId:ringing[ringing.length-1].characterId||'',body:ringing[ringing.length-1].body}:null;const target=world.characters.find(c=>c.id===selectedCharacter)||world.characters[0];const unreadFiles=liveFiles.filter(e=>!seenFiles[e.id]).length;const recebidos=mails.filter(m=>m.sender!=='Você');
const naoLidos=recebidos.filter(m=>!seenMails[m.id]).length;
const folderMails=(mailFolder==='sent'?mails.filter(m=>m.sender==='Você'):recebidos)
 .filter(m=>mailFolder==='sent'||!soNaoLidos||!seenMails[m.id]);// Sem id de e-mail escrito no código: na primeira visita abre o mais recente da
// caixa, e depois disso a escolha é de quem está lendo -- inclusive escolher
// nenhum, que é o que o botão de novo e-mail faz.
const opened=mails.find(m=>m.id===selectedMail)||(tocouMail.current?undefined:folderMails[0]);const clock=`${String(Math.floor(world.minute/60)%24).padStart(2,'0')}:${String(world.minute%60).padStart(2,'0')}`;const elapsedReal=Math.floor(elapsedMs/60000);const remaining=durationMinutes?Math.max(0,durationMinutes-elapsedReal):0;const expired=durationMinutes>0&&remaining===0&&elapsedReal>0;const totalEvidence=serverEvidence!==null?serverEvidence:evidence.length;// O acervo sai do mundo, não de uma lista fixa: antes os Arquivos mostravam
// quatro documentos do Projeto Atlas em qualquer mundo, e os do caso que estava
// no ar não apareciam.
const acervo:FileItem[]=acervoDoMundo(world);
const fileItems:FileItem[]=[...[...acervo,...liveFiles.map(e=>({id:e.id,name:e.subject||'Documento',at:e.at,sender:e.sender,body:e.body})),...uploads.map(u=>({id:u.id,name:u.name,at:u.at,sender:u.sender,body:u.body,uploaded:true}))].sort((a,b)=>b.at-a.at)];const latestDiagnostic=turnDiagnostics.at(-1);const clima=climaDoMundo(world.temperature);

useEffect(()=>{document.body.classList.add('app-locked');return()=>document.body.classList.remove('app-locked')},[]);
// O relógio do mundo anda de dez em dez segundos, devagar demais para uma
// contagem que precisa descer de segundo em segundo.
useEffect(()=>{if(!queueNotice)return;const id=setInterval(()=>setTick(t=>t+1),1000);return()=>clearInterval(id)},[queueNotice]);
// The clock only runs while the session is active, and the elapsed time is
// accumulated here rather than read from a start timestamp -- otherwise closing
// the tab for a day would come back to a Challenge that had "expired" without
// anyone having played it.
useEffect(()=>{
 // Encerrada é encerrada: o relógio seguia andando depois do debrief, e o
 // "11 min restantes" continuava descendo numa sessão que já acabou.
 if(paused||debrief)return;
 const id=setInterval(()=>{
  setWorld(current=>({...current,minute:current.minute+1}));
  setElapsedMs(current=>current+REAL_SECONDS_PER_SIMULATED_MINUTE*1000);
  setTick(t=>t+1);
 },REAL_SECONDS_PER_SIMULATED_MINUTE*1000);
 return()=>clearInterval(id);
},[paused,debrief]);
useEffect(()=>{(async()=>{
 try{
  const r=await fetch('/api/session',{method:'POST'});
  const data=await r.json();
  // Mais de um mundo no ar e nenhuma sessão em andamento: o servidor não escolhe
  // por quem entra, e a tela passa a ser a da escolha.
  if(data?.usuario)setUsuario(data.usuario);
  if(data?.configured&&Array.isArray(data.escolha)){
   setEscolha({mundos:data.escolha,faltaMigracao:Boolean(data.faltaMigracao)});return}
  if(!data?.configured||!data.session)return;
  setSessionId(data.session.id);
  if(data.engine)setEngine(data.engine);
  if(Array.isArray(data.artifacts))setArtifacts(data.artifacts);
  if(Array.isArray(data.competencies))setCompetencies(data.competencies);
  if(Array.isArray(data.news))setNews(data.news);
  setCallsEnabled(Boolean(data.callsEnabled));
  if(data.durationMinutes)setDurationMinutes(Number(data.durationMinutes)||0);
  if(typeof data.evidenceCount==='number')setServerEvidence(data.evidenceCount);
  // The server is the source of truth once a session exists there, except
  // against a browser that is further along: whichever world recorded more
  // actions is the one with real work in it.
  const local=loadSession();
  // Guardado aqui está de outra sessão: outro mundo, ou uma corrida já
  // encerrada. A regra de "quem está mais adiantado ganha" vale dentro de uma
  // sessão, para não perder trabalho que o servidor ainda não viu; entre
  // sessões diferentes ela serviria o mundo errado contra a sessão certa.
  const deOutraSessao=Boolean(local?.sessionId&&local.sessionId!==data.session.id);
  if(deOutraSessao){
   clearSession();setEvidence([]);setAssistantMessages([]);setUploads([]);setDebrief(null);
   setElapsedMs(0);setPaused(false);setSeenFiles({});setSeenMails({});setAnsweredCalls({});
   setEngineLogs([]);setTurnDiagnostics([]);
   addClientLog('session','ok','Sessão nova: o que este navegador guardava era de outra corrida',{});
  }
  const remote=data.session.world_state;
  if(remote?.scenarioId){
   const localActions=deOutraSessao?0:(local?.world?.telemetry?.length||0);
   const remoteActions=remote.telemetry?.length||0;
   if(localActions>remoteActions)addClientLog('session','warn','Mantendo a sessão local, que está mais adiantada',{localActions,remoteActions});
   else setWorld(remote);
  }
  // O servidor é quem sabe se a sessão terminou. Um debrief guardado no
  // navegador sem par no servidor deixa a tela em "encerrada" numa sessão que
  // está aberta -- e, pior, impede o encerramento por tempo de acontecer,
  // porque ele não dispara quando já existe debrief.
  if(data.session.debrief)setDebrief(data.session.debrief);
  else if(!deOutraSessao)setDebrief(atual=>atual?null:atual);
  addClientLog('session','ok','Sessão sincronizada com o Supabase',{sessionId:data.session.id});
 }catch(error){addClientLog('session','warn','Seguindo apenas com a sessão local',{error:String(error)})}
})()},[]);
useEffect(()=>{const stored=loadSession();if(stored){setWorld(stored.world);setEvidence(stored.evidence);setAssistantMessages(stored.assistant);setUploads(stored.uploads);setDebrief(stored.debrief);setSeenMails(stored.seenMails||{})}setElapsedMs(stored?.elapsedMs||0);setPaused(Boolean(stored?.paused));setHydrated(true)},[]);
// Tempo esgotado encerra a sessão, como a prova que é recolhida na hora.
// Antes a janela terminava e a tela só sugeria encerrar: quem ignorasse seguia
// jogando indefinidamente, e duas pessoas com o mesmo cenário tinham corridas
// de durações diferentes -- o que torna a leitura delas incomparável.
useEffect(()=>{
 if(!hydrated||!expired||debrief||busy||paused||encerrouSozinho.current)return;
 encerrouSozinho.current=true;
 addClientLog('session','info','Tempo esgotado: encerrando a sessão',{durationMinutes});
 generateDebrief(true);
},[hydrated,expired,debrief,busy,paused]);

// Um aviso quando o mundo publica algo que a pessoa ainda não viu. Conta só o
// que vem do mundo: o eco da própria mensagem não é novidade para quem escreveu.
useEffect(()=>{
 const doMundo=visible.filter(e=>e.sender!=='Você').length;
 if(!hydrated){vistosRef.current=doMundo;return}
 if(doMundo>vistosRef.current&&!debrief)tocarAviso();
 vistosRef.current=doMundo;
},[visible,hydrated,debrief]);

useEffect(()=>{if(hydrated)saveSession({sessionId,world,evidence,assistant:assistantMessages,uploads,debrief,elapsedMs,paused,seenMails,savedAt:Date.now()})},[hydrated,sessionId,world,evidence,assistantMessages,uploads,debrief,elapsedMs,paused,seenMails]);
async function restart(){setAnsweredCalls({});
 if(busy)return;
 const ok=await confirmar({titulo:'Recomeçar do zero?',
  texto:'Esta sessão é encerrada e um mundo novo começa no mesmo cenário. O que você fez fica registrado para quem conduz a aula, mas você não volta para cá.',
  rotuloOk:'Recomeçar',perigo:true});
 if(!ok)return;
 setBusy(true);
 // Reset every screen first so the change is visible even if the server is
 // unreachable; then ask the server for a fresh session built from the
 // authored scenario, which is what "do zero" has to mean now.
 clearSession();setElapsedMs(0);setPaused(false);setEvidence([]);setAssistantMessages([]);setUploads([]);
 setDebrief(null);setDebriefError('');setEngineLogs([]);setTurnDiagnostics([]);setRuntimeError('');setSeenFiles({});
 setWorld(initialWorld);
 try{
  const r=await fetch('/api/session/restart',{method:'POST'});
  const data=await r.json();
  if(!r.ok)throw new Error(data.detail||data.error||`HTTP ${r.status}`);
  if(data.configured&&data.session){
   setSessionId(data.session.id);
   if(data.session.world_state?.scenarioId)setWorld(data.session.world_state);
   if(data.engine)setEngine(data.engine);
   if(Array.isArray(data.artifacts))setArtifacts(data.artifacts);
   if(Array.isArray(data.competencies))setCompetencies(data.competencies);
   if(Array.isArray(data.news))setNews(data.news);
   setCallsEnabled(Boolean(data.callsEnabled));
  if(Array.isArray(data.news))setNews(data.news);
  setCallsEnabled(Boolean(data.callsEnabled));
  if(Array.isArray(data.competencies))setCompetencies(data.competencies);
  if(Array.isArray(data.news))setNews(data.news);
  setCallsEnabled(Boolean(data.callsEnabled));
   if(data.durationMinutes)setDurationMinutes(Number(data.durationMinutes)||0);
   if(typeof data.evidenceCount==='number')setServerEvidence(data.evidenceCount);
  if(typeof data.evidenceCount==='number')setServerEvidence(data.evidenceCount);
   addClientLog('session','ok','Sessão reiniciada no servidor',{sessionId:data.session.id});
  }
 }catch(error){
  addClientLog('session','warn','Reinício apenas local; o servidor não respondeu',{error:String(error)});
 }finally{setBusy(false);setTab('mail')}
}
function addClientLog(stage:string,status:EngineLog['status'],message:string,meta?:Record<string,unknown>){setEngineLogs(prev=>[...prev,{id:crypto.randomUUID(),at:Date.now(),stage,status,message,meta}].slice(-150))}
async function act(channel:'mail'|'chat',action:string,characterId?:string,extra?:Record<string,unknown>){
 if(!text.trim()||busy||paused||debrief||expired)return;
 setBusy(true);addClientLog('client','info','Enviando ação ao motor',{channel,action,characterId,text:text.trim().slice(0,180)});
 setRuntimeError('');setQueueNotice(null);setBlocked(null);
 const sentText=text.trim();
 const mailSubject=subject||opened?.subject||'Sem assunto';
 const mentions=mentionedCharacterIds(sentText,world.characters);
 const desconhecidos=mencoesDesconhecidas(sentText,world.characters);
 const telemetry={action,channel,text:sentText,characterId,metadata:{day:world.day,targetCharacterId:characterId,subject:mailSubject,mentionedCharacterIds:mentions,...extra}};
 const next=recordTelemetry(world,telemetry);
 next.events=[...next.events,{id:crypto.randomUUID(),channel,sender:'Você',recipientCharacterId:characterId,mentionedCharacterIds:mentions,subject:channel==='mail'?mailSubject:undefined,body:sentText,urgency:0,visible:true,at:world.minute}];
 setWorld(next);setText('');setSubject('');
 const acao=next.telemetry.at(-1);
 try{
  // The turn may be admitted immediately, or told to wait. Waiting is not an
  // error: the message is already in the world and the person keeps their place
  // in line, so the client simply asks again when it is due.
  for(let attempt=1;attempt<=40;attempt++){
   const r=await fetch('/api/simulation/turn',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({world:next,action:acao,sessionId,engine,artifacts,competencies,news,unknownMentions:desconhecidos})});
   const data=await r.json();
   if(Array.isArray(data.logs))setEngineLogs(prev=>[...prev,...data.logs].slice(-200));
   if(r.status===202&&data.queued){
    const espera=Math.min(60000,Math.max(1500,Number(data.waitMs)||5000));
    setQueueNotice({texto:data.message||'Aguardando capacidade do modelo.',ate:Date.now()+espera});
    addClientLog('queue','info','Turno na fila',{position:data.position,waitMs:data.waitMs,tentativa:attempt});
    await new Promise(resolve=>setTimeout(resolve,espera));
    continue;
   }
   setQueueNotice(null);
   if(data.diagnostic)setTurnDiagnostics(prev=>[...prev,data.diagnostic].slice(-30));
   if(!r.ok){
    if(data.blocked){setBlocked({label:data.label||'Falha no provedor',code:data.code||'desconhecido'});
     addClientLog('client','error','Falha bloqueante reportada como incidente',{code:data.code});return}
    throw new Error(data.detail||data.error||`HTTP ${r.status}`);
   }
   if(data.engine!=='llm')throw new Error('A resposta não veio do motor LLM.');
   if(Array.isArray(data.observer?.signals)){setEvidence(prev=>[...prev,...data.observer.signals]);
    if(data.observer.signals.length)setServerEvidence(current=>(current??0)+data.observer.signals.length)}
   addClientLog('client','ok','Motor respondeu e o Director será aplicado',{eventCount:data.director?.events?.length||0});
   setWorld(s=>{const advanced=applyDirector(s,data.director);syncSession({world:advanced});return advanced});
   return;
  }
  setRuntimeError('A fila não liberou sua vez a tempo. Sua mensagem continua registrada; tente enviar de novo.');
 }catch(error){
  addClientLog('client','error','Falha ao processar ação',{error:String(error)});
  setRuntimeError(error instanceof Error?error.message:'Falha desconhecida no motor LLM.');
 }finally{setBusy(false)}
}
async function ask(question:string){
 if(busy)return;setBusy(true);
 const mine:AssistantMessage={id:crypto.randomUUID(),role:'you',text:question,at:Date.now()};
 const history=[...assistantMessages,mine];
 setAssistantMessages(history);
 setWorld(current=>recordTelemetry(current,{action:'ask_ai_assistant',channel:'assistant',text:question}));
 try{
  const r=await fetch('/api/simulation/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question,engine,
   history:history.slice(-12).map(m=>({role:m.role,text:m.text})),
   context:{seat:world.seat,visibleEvents:visible,facts:world.facts,attachments:uploads.map(u=>({name:u.name,body:u.body.slice(0,4000)}))}})});
  const data=await r.json();
  setAssistantMessages(current=>[...current,{id:crypto.randomUUID(),role:'ara',text:data.answer||'Não consegui responder agora.',at:Date.now()}]);
 }catch(error){
  setAssistantMessages(current=>[...current,{id:crypto.randomUUID(),role:'ara',text:'Não consegui responder agora.',at:Date.now()}]);
  addClientLog('assistant','error','Falha ao consultar a Ara',{error:String(error)});
 }finally{setBusy(false)}
}
// A character saying the document is in Arquivos should not make the person go
// hunt for it: if the message names a file that already exists, link it.
function findAttachment(body:string){
 const text=String(body||'').toLocaleLowerCase();
 return fileItems.find(file=>{
  const name=String(file.name||'').toLocaleLowerCase();
  if(!name)return false;
  if(text.includes(name))return true;
  const head=name.split('—')[0].trim();
  return head.length>6&&text.includes(head);
 });
}
function openFile(id:string){setSelectedFile(id);setSeenFiles(prev=>({...prev,[id]:true}));setTab('files')}
async function generateDebrief(porTempo=false){
 if(busy)return;setBusy(true);setDebriefError('');
 addClientLog('debrief','info','Gerando debrief do participante',{evidence:evidence.length,telemetry:world.telemetry.length});
 try{
  const r=await fetch('/api/simulation/debrief',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({seat:world.seat,evidence,telemetry:world.telemetry,engine,sessionId,compulsorio:porTempo,world:{title:world.title,elapsedMinutes:world.minute-initialWorld.minute}})});
  const data=await r.json();
  if(!r.ok)throw new Error(data.detail||data.error||`HTTP ${r.status}`);
  const finished={...data,generatedAt:Date.now()};setDebrief(finished);syncSession({debrief:finished,status:'completed'});
  addClientLog('debrief','ok','Debrief entregue ao participante',{headline:data.headline});
 }catch(error){
  const message=error instanceof Error?error.message:'Falha desconhecida.';
  setDebriefError(message);addClientLog('debrief','error','Falha ao gerar debrief',{error:message});
 }finally{setBusy(false)}
}
// Called after a turn and after the debrief, never on a clock tick: the world
// advances every ten seconds on its own and that is not worth a write.
async function togglePause(){
 const next=!paused;
 setPaused(next);
 addClientLog('session',next?'info':'ok',next?'Sessão pausada':'Sessão retomada',{elapsedMs});
 syncSession({status:next?'paused':'active'});
}
async function syncSession(patch:{world?:WorldState;debrief?:Debrief|null;status?:string}){
 if(!sessionId)return;
 try{const r=await fetch('/api/session/state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId,...patch})});const d=await r.json();if(!r.ok||d.saved===false)addClientLog('session','warn','O servidor não confirmou o salvamento',{status:r.status,detail:d.detail})}
 catch(error){addClientLog('session','warn','Falha ao salvar a sessão no Supabase',{error:String(error)})}
}
function addUpload(file:UploadedFile){setUploads(current=>[...current,file]);setSelectedFile(file.id);addClientLog('upload','ok','Documento anexado pelo participante',{name:file.name,size:file.size,kind:file.kind});setWorld(current=>recordTelemetry(current,{action:'upload_document',channel:'files',text:file.name,metadata:{size:file.size,kind:file.kind}}))}
function submitOnCtrlEnter(e:KeyboardEvent,submit:()=>void){if(e.key==='Enter'&&e.ctrlKey){e.preventDefault();submit()}}
function renderBody(body:string){const parts=body.split(/(@[^\s,.:;!?]+)/g);return parts.map((part,i)=>{if(!part.startsWith('@'))return <span key={i}>{part}</span>;const name=part.slice(1).toLocaleLowerCase();const person=world.characters.find(c=>c.name.split(' ')[0].toLocaleLowerCase()===name);return person?<button type="button" key={i} className="mention" onClick={()=>{setSelectedCharacter(person.id);setTab('chat')}}>{part}</button>:<span key={i}>{part}</span>})}function person(c:any){return <button key={c.id} className={'chat-person '+(selectedCharacter===c.id?'selected':'')} onClick={()=>{setSelectedCharacter(c.id);setRuntimeError('')}}><span className="person-avatar">{c.name.split(' ').map((x:string)=>x[0]).slice(0,2).join('')}</span><span><b>{c.name}</b><small>{c.role}</small></span></button>}
const members=useMemo(()=>conversationMembers(chats,selectedCharacter),[chats,selectedCharacter]);const noFio=useMemo(()=>participantesDoFio(chats,selectedCharacter),[chats,selectedCharacter]);
if(escolha)return <EscolherMundo mundos={escolha.mundos} faltaMigracao={escolha.faltaMigracao} usuario={usuario}
 descricao="Há mais de um mundo no ar. O código está no projetor, ou escolha na lista."/>;
return <>{dialogo}
 {incoming&&!paused&&!debrief&&<ChamadaEntrando
  quem={world.characters.find(c=>c.id===incoming.characterId)}
  texto={incoming.body}
  onAtender={()=>{setAnsweredCalls(prev=>({...prev,[incoming.id]:true}));setTab('calls');
   setWorld(current=>recordTelemetry(current,{action:'handled_incoming_call',channel:'call',characterId:incoming.characterId,text:incoming.body}))}}
  onRecusar={()=>{pararToque();setRecusadas(prev=>({...prev,[incoming.id]:true}));
   setWorld(current=>recordTelemetry(current,{action:'declined_incoming_call',channel:'call',characterId:incoming.characterId,text:incoming.body}))}}/>}
 {paused&&<div className="paused-veil"><section className="panel paused-card">
 <div className="eyebrow">SESSÃO PAUSADA</div>
 <h2>O mundo está esperando você</h2>
 <p>O relógio parou e este tempo não conta. Tudo que você fez está salvo — pode fechar a aba e voltar depois, daqui ou de outro computador, entrando com a mesma conta.</p>
 <button className="btn primary" onClick={togglePause}>Retomar o Challenge</button>
</section></div>}<header className="top"><div className="brand"><span className="brand-mark">C</span>Challenge</div><div><span className="tag">DIA {world.day} · {clock}</span>{durationMinutes>0&&<span className={"tag "+(expired?"hot":"")}>{paused?"pausado":expired?"tempo encerrado":`${remaining} min restantes`}</span>}<button className="btn pause-btn" onClick={togglePause}>{paused?"Retomar":"Pausar"}</button> <span className="tag hot">{world.seat.role}</span></div></header><div className="grid"><aside className="side"><div className="eyebrow">SEU ESPAÇO</div><nav className="nav">{nav.map(({id,c,label,Icon})=>{const isFiles=id==='files';return <button key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);if(isFiles)setSeenFiles(prev=>({...prev,...Object.fromEntries(liveFiles.map(file=>[file.id,true]))}))}}><Icon className={'nav-icon '+c}/><span>{label}</span>{isFiles&&unreadFiles>0&&<b className="nav-badge">{unreadFiles>9?'9+':unreadFiles}</b>}{id==='calls'&&incoming&&<b className="nav-badge ringing">!</b>}</button>})}</nav>{usuario&&<UsuarioSessao nome={usuario.nome} email={usuario.email}/>}<footer className="creator-footer"><a href="https://paulonascimento.me" target="_blank" rel="noreferrer"><img className="creator-logo-img" src="/logo-pn.svg" alt="Paulo Nascimento"/><span><strong>Desenvolvido por Paulo Nascimento</strong><span>paulonascimento.me ↗</span></span></a></footer></aside><main className="main"><div className="hero"><div><div className="eyebrow">CHALLENGE EM ANDAMENTO</div><div className="h1">{world.title}</div><div className="mission">🎯 <b>Sua missão:</b> {String((world.facts as any)?.mission||"conduza a decisão sobre a entrada do assistente de IA em produção.")}</div>{queueNotice&&<div className="queue-notice"><span className="queue-spinner"/>
 {queueNotice.texto} {(()=>{const faltam=Math.ceil((queueNotice.ate-Date.now())/1000);
  return faltam>0?`Nova tentativa em ${faltam}s.`:'Tentando de novo…'})()}</div>}{blocked&&<div className="runtime-error" style={{marginTop:10}}><b>{blocked.label}.</b> Isso não se resolve esperando — a pessoa responsável pelo Challenge já foi notificada. Seu progresso está salvo.</div>}{expired&&<div className="runtime-error" style={{marginTop:10}}>{debrief
  ?'A janela deste Challenge terminou e sua sessão foi encerrada. Sua leitura está em Encerrar.'
  :'O tempo acabou. Estamos fechando sua sessão e preparando sua leitura.'}</div>}</div><div><div className="eyebrow">CLIMA DO CENÁRIO</div><div className="temp">{clima.grau}°</div><small className="muted">{clima.frase}</small></div></div><div className="screen">{tab==='briefing'&&<BriefingScreen world={world} pronto={Boolean(sessionId)} onComecar={()=>{destravarSom();setTab('mail')}}/>}{tab==='mail'&&<div className="mail-shell"><aside className="mail-folders"><button className="compose big" onClick={()=>{tocouMail.current=true;setSelectedMail('');setText('')}}>+ Novo e-mail</button><button className={mailFolder==='inbox'?'active':''} onClick={()=>{setMailFolder('inbox');setSelectedMail('')}}><Inbox size={18}/>Caixa de entrada <b className={naoLidos?'nao-lidos':''}>{naoLidos||recebidos.length}</b></button><button className={mailFolder==='sent'?'active':''} onClick={()=>{setMailFolder('sent');setSelectedMail('')}}><SendHorizontal size={18}/>Enviados <b>{mails.filter(m=>m.sender==='Você').length}</b></button></aside><section className="panel inbox"><div className="inbox-head"><h3>{mailFolder==='inbox'?'Caixa de entrada':'Enviados'}</h3>
     {mailFolder==='inbox'&&recebidos.length>0&&<button type="button" className={'filtro-nao-lidos'+(soNaoLidos?' ativo':'')}
      onClick={()=>setSoNaoLidos(v=>!v)}>{soNaoLidos?'Mostrando só não lidos':`Só não lidos${naoLidos?` (${naoLidos})`:''}`}</button>}</div>{folderMails.map(m=><button className={'mail-row '+(opened?.id===m.id?'selected ':'')+(mailFolder!=='sent'&&!seenMails[m.id]?'mail-nao-lido':'mail-lido')} key={m.id} onClick={()=>{tocouMail.current=true;setSelectedMail(m.id);setSeenMails(prev=>({...prev,[m.id]:true}));if(m.characterId)setSelectedCharacter(m.characterId);if(m.recipientCharacterId)setSelectedCharacter(m.recipientCharacterId)}}><div className="mail-row-top"><b>{mailFolder!=='sent'&&!seenMails[m.id]&&<span className="unread-dot" aria-label="não lido"/>}{m.sender==='Você'?'Para: '+(world.characters.find(c=>c.id===m.recipientCharacterId)?.name||'destinatário'):m.sender.split(' · ')[0]}</b><small>{Math.floor(m.at/60)}:{String(m.at%60).padStart(2,'0')}</small></div><strong>{m.subject||'(sem assunto)'}</strong><span>{m.body.slice(0,55)}...</span></button>)}</section><section className="panel mail-reader">{opened?<><div className="mail-title"><div><h2>{opened.subject}</h2><div className="muted"><b>{opened.sender}</b>{opened.sender==='Você'?' · para '+(world.characters.find(c=>c.id===opened.recipientCharacterId)?.name||'destinatário'):' · para você'}</div></div><Reply/></div><div className="mail-body"><p>{opened.body}</p></div>{mailFolder==='inbox'&&<div className="reply-box"><div className="to-line"><b>Para</b><span className="recipient">{target?.name}</span></div><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>submitOnCtrlEnter(e,()=>act('mail','reply_email',target?.id,{threadSubject:opened.subject}))} placeholder="Responder…" aria-label={`Responder a ${target?.name}`}/>{runtimeError&&<div className="runtime-error">Motor LLM indisponível: {runtimeError}</div>}<button disabled={busy} onClick={()=>act('mail','reply_email',target?.id,{threadSubject:opened.subject})} className="btn primary"><Send size={16}/>{busy?'Pensando…':'Enviar'}</button></div>}</>:<div className="compose-mail"><h2>Novo e-mail</h2><div className="to-line"><b>Para</b><select value={selectedCharacter} onChange={e=>setSelectedCharacter(e.target.value)}>{world.characters.map(c=><option value={c.id} key={c.id}>{c.name} · {c.role}</option>)}</select></div><input className="input" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Assunto" aria-label="Assunto"/><textarea className="input" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>submitOnCtrlEnter(e,()=>act('mail','send_email',target?.id,{subject}))} placeholder="Escreva sua mensagem…" aria-label="Corpo do e-mail"/>{runtimeError&&<div className="runtime-error">Motor LLM indisponível: {runtimeError}</div>}<div><button disabled={busy} onClick={()=>act('mail','send_email',target?.id,{subject})} className="btn primary"><Send size={16}/>{busy?'Pensando…':'Enviar'}</button></div></div>}</section></div>}{tab==='chat'&&<div className="chat-shell"><aside className="panel chat-list"><h3>Conversas</h3>{world.characters.map(person)}</aside><section className="panel chat chat-main"><div className="conversation-head"><div><div className="eyebrow">CONVERSA</div><h2>{target?.name}</h2><span className="muted">{target?.role}</span><div className="conversation-people">{world.characters.filter(c=>noFio.includes(c.id)).map(c=><button type="button" key={c.id} className={'conversation-person '+(c.id===selectedCharacter?'active':'')} onClick={()=>setSelectedCharacter(c.id)}>{c.name.split(' ')[0]}</button>)}</div></div></div><div className="chat-history">{conversationChats(chats,members).map(m=>{const attachment=m.sender==='Você'?undefined:findAttachment(m.body);return <div className={'bubble '+(m.sender==='Você'?'mine':'')} key={m.id}><b>{m.sender}</b><br/>{renderBody(m.body)}{attachment&&<button type="button" className="attachment" onClick={()=>openFile(attachment.id)}><FileText size={15}/>{attachment.name}</button>}</div>})}</div>{runtimeError&&<div className="runtime-error">Motor LLM indisponível: {runtimeError}</div>}<MentionComposer value={text} onChange={setText} onSubmit={()=>act('chat','send_directed_chat',target?.id)} characters={world.characters} disabled={busy} placeholder={`Mensagem para ${target?.name}… use @ para marcar alguém`} label={`Mensagem para ${target?.name}`}/></section></div>}{tab==='feed'&&<FeedScreen liveFeed={liveFeed} news={news} minute={world.minute} startMinute={world.startMinute??initialWorld.minute} title={world.title}/>}{tab==='assistant'&&<AssistantScreen messages={assistantMessages} busy={busy} onSend={ask} mundo={world.title}/>}{tab==='files'&&<FilesScreen files={fileItems} selectedId={selectedFile} seen={seenFiles} minute={world.minute} onSelect={openFile} onUpload={addUpload}/>}{tab==='calls'&&<CallScreen characters={world.characters} sessionId={sessionId} incoming={incoming} onAnswered={id=>{setAnsweredCalls(prev=>({...prev,[id]:true}));setWorld(current=>recordTelemetry(current,{action:'handled_incoming_call',channel:'call',characterId:incoming?.characterId,text:incoming?.body}))}} onFinished={info=>{addClientLog('call','ok','Chamada encerrada',info);if(info.signals)setServerEvidence(current=>(current??0)+info.signals);setWorld(current=>recordTelemetry(current,{action:'voice_call',channel:'call',characterId:info.characterId,text:`Ligação de ${info.seconds}s`,metadata:{seconds:info.seconds,signals:info.signals}}));}}/>}{tab==='org'&&<OrgScreen characters={world.characters} seatRole={world.seat.role} organizacao={String((world.facts as any)?.organizacao||'')}/>}{tab==='debrief'&&<DebriefScreen debrief={debrief} evidenceCount={totalEvidence} paused={paused} onTogglePause={togglePause} turnCount={world.telemetry.length} busy={busy} error={debriefError} onGenerate={generateDebrief} onRestart={restart}/>}{tab==='timeline'&&<section className="panel"><h2>O que rolou até aqui</h2>{visible.map(e=><div className="item" key={e.id}><b>{e.sender}</b><p className="muted">{e.subject||e.body}</p></div>)}</section>}</div></main></div></>}
