'use client';
import{useEffect,useRef,useState}from'react';import{Phone,PhoneOff,Mic}from'lucide-react';
import type{Character}from'@/lib/simulation/types';

type Line={role:'participant'|'character';text:string;at:number};
type Status='idle'|'connecting'|'live'|'ending';

const mmss=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.max(0,s)%60).padStart(2,'0')}`;

export function CallScreen({characters,sessionId,onFinished}:{
 characters:Character[];sessionId:string;onFinished:(info:{characterId:string;seconds:number;signals:number})=>void;
}){
 const[status,setStatus]=useState<Status>('idle');
 const[active,setActive]=useState<Character|null>(null);
 const[lines,setLines]=useState<Line[]>([]);
 const[error,setError]=useState('');
 const[blocked,setBlocked]=useState('');
 const[left,setLeft]=useState(0);
 const[budget,setBudget]=useState<{used:number;total:number}|null>(null);
 const pc=useRef<RTCPeerConnection|null>(null);
 const audio=useRef<HTMLAudioElement|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const callId=useRef<string|null>(null);
 const startedAt=useRef(0);
 const linesRef=useRef<Line[]>([]);
 const ending=useRef(false);

 const callable=characters.filter(person=>!Array.isArray(person.channels)||person.channels.includes('call'));

 useEffect(()=>()=>{teardown()},[]);
 useEffect(()=>{
  if(status!=='live')return;
  const id=setInterval(()=>{
   const elapsed=Math.floor((Date.now()-startedAt.current)/1000);
   const remaining=left-0;
   // The ceiling is enforced here as well as on the server, because the server
   // cannot hang up a call it never carries audio for.
   if(elapsed>=remaining){hangUp('tempo esgotado')}
  },1000);
  return()=>clearInterval(id);
 },[status,left]);

 const[tick,setTick]=useState(0);
 useEffect(()=>{if(status!=='live')return;const id=setInterval(()=>setTick(t=>t+1),1000);return()=>clearInterval(id)},[status]);
 const elapsed=status==='live'?Math.floor((Date.now()-startedAt.current)/1000):0;

 function teardown(){
  try{pc.current?.getSenders().forEach(sender=>sender.track?.stop())}catch{}
  try{pc.current?.close()}catch{}
  try{stream.current?.getTracks().forEach(track=>track.stop())}catch{}
  pc.current=null;stream.current=null;
 }

 function addLine(line:Line){
  linesRef.current=[...linesRef.current,line].slice(-200);
  setLines(linesRef.current);
 }

 async function dial(person:Character){
  if(status!=='idle')return;
  setError('');setBlocked('');setLines([]);linesRef.current=[];ending.current=false;
  setActive(person);setStatus('connecting');
  try{
   const r=await fetch('/api/call/token',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({sessionId,characterId:person.id})});
   const data=await r.json();
   if(!r.ok){
    if(data.blocked)setBlocked(data.label||'Falha no provedor de voz');
    setError(data.detail||data.error||`HTTP ${r.status}`);setStatus('idle');setActive(null);return;
   }
   callId.current=data.callId;
   setLeft(Number(data.remainingSeconds)||0);
   setBudget({used:Number(data.usedSeconds)||0,total:Number(data.sessionBudgetSeconds)||0});

   const connection=new RTCPeerConnection();
   pc.current=connection;
   connection.ontrack=event=>{if(audio.current)audio.current.srcObject=event.streams[0]};
   connection.onconnectionstatechange=()=>{
    if(['failed','disconnected','closed'].includes(connection.connectionState)&&!ending.current)hangUp('a conexão caiu');
   };

   const mic=await navigator.mediaDevices.getUserMedia({audio:true});
   stream.current=mic;
   mic.getTracks().forEach(track=>connection.addTrack(track,mic));

   const channel=connection.createDataChannel('oai-events');
   channel.onmessage=event=>{
    let message:any; try{message=JSON.parse(event.data)}catch{return}
    // Verified event names: the participant's words arrive transcribed, the
    // character's arrive as the transcript of what it said.
    if(message.type==='conversation.item.input_audio_transcription.completed'&&message.transcript)
     addLine({role:'participant',text:String(message.transcript).trim(),at:Date.now()});
    if(message.type==='response.output_audio_transcript.done'&&message.transcript)
     addLine({role:'character',text:String(message.transcript).trim(),at:Date.now()});
    if(message.type==='error')setError(String(message.error?.message||'erro na chamada'));
   };

   const offer=await connection.createOffer();
   await connection.setLocalDescription(offer);
   const answer=await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(data.model)}`,{
    method:'POST',body:offer.sdp,
    headers:{Authorization:`Bearer ${data.secret}`,'Content-Type':'application/sdp'}});
   if(!answer.ok)throw new Error(`webrtc_${answer.status}:${(await answer.text()).slice(0,200)}`);
   await connection.setRemoteDescription({type:'answer',sdp:await answer.text()});

   startedAt.current=Date.now();
   setStatus('live');
  }catch(problem){
   setError(problem instanceof Error?problem.message:'Não foi possível completar a chamada.');
   teardown();setStatus('idle');setActive(null);
  }
 }

 async function hangUp(reason?:string){
  if(ending.current)return;
  ending.current=true;
  const seconds=startedAt.current?Math.floor((Date.now()-startedAt.current)/1000):0;
  setStatus('ending');teardown();
  try{
   const r=await fetch('/api/call/end',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({callId:callId.current,sessionId,seconds,transcript:linesRef.current,failure:reason==='a conexão caiu'?reason:null})});
   const data=await r.json();
   onFinished({characterId:active?.id||'',seconds,signals:Number(data.signals)||0});
  }catch{onFinished({characterId:active?.id||'',seconds,signals:0})}
  if(reason&&reason!=='encerrada')setError(`Chamada encerrada: ${reason}.`);
  setStatus('idle');setActive(null);startedAt.current=0;
 }

 if(status==='idle')return <section className="panel">
  <div className="eyebrow">CHAMADAS</div>
  <h2>Ligar para alguém</h2>
  <p className="muted">Uma ligação é uma conversa de verdade: a pessoa atende, interrompe, hesita. Ela só sabe o que sabe — e o que você contar durante a ligação.</p>
  {budget&&<p className="muted">Você já usou {mmss(budget.used)} dos {mmss(budget.total)} de chamada desta sessão.</p>}
  {blocked&&<div className="runtime-error"><b>As chamadas estão indisponíveis: {blocked.toLowerCase()}.</b> Isso não se resolve tentando de novo — quem cuida do Challenge já foi avisado. O resto do seu trabalho segue normal.</div>}
  {error&&!blocked&&<div className="runtime-error">{error}</div>}
  {callable.length===0&&<p className="muted">Ninguém neste mundo atende ligações.</p>}
  {callable.map(person=><div className="person-line" key={person.id}>
   <div className="person-avatar">{person.name.split(' ').map(part=>part[0]).slice(0,2).join('')}</div>
   <div><b>{person.name}</b><small>{person.role}</small></div>
   <button className="btn primary" disabled={Boolean(blocked)} onClick={()=>dial(person)}><Phone size={16}/>{blocked?'Indisponível':'Ligar'}</button>
  </div>)}
  <audio ref={audio} autoPlay hidden/>
 </section>;

 return <section className="panel call-live">
  <div className="call-head">
   <span className="person-avatar call-avatar">{active?.name.split(' ').map(part=>part[0]).slice(0,2).join('')}</span>
   <div><b>{active?.name}</b><small>{active?.role}</small></div>
   <span className={'call-timer '+(left-elapsed<=30?'warn':'')}>
    {status==='connecting'?'chamando…':`${mmss(elapsed)} · restam ${mmss(Math.max(0,left-elapsed))}`}
   </span>
   <button className="btn call-hangup" onClick={()=>hangUp('encerrada')} disabled={status==='ending'}>
    <PhoneOff size={16}/>{status==='ending'?'Encerrando…':'Desligar'}
   </button>
  </div>
  {status==='connecting'&&<p className="muted"><Mic size={14} style={{verticalAlign:'-2px'}}/> Permita o microfone quando o navegador pedir.</p>}
  {error&&<div className="runtime-error">{error}</div>}
  <div className="call-transcript">
   {lines.length===0&&status==='live'&&<p className="muted">Pode falar. O que for dito aparece aqui.</p>}
   {lines.map((line,index)=><div className={'bubble '+(line.role==='participant'?'mine':'')} key={index}>
    <b>{line.role==='participant'?'Você':active?.name}</b><br/>{line.text}
   </div>)}
  </div>
  <audio ref={audio} autoPlay hidden/>
 </section>;
}
