'use client';
import{useState}from'react';import Link from 'next/link';
import{SlidersHorizontal,Users,Bug,TriangleAlert,Check}from'lucide-react';
import{ScenarioForm}from'./scenario-form';
import type{ScenarioConfig}from'@/lib/simulation/scenario';import type{Character}from'@/lib/simulation/types';

export type Participant={userId:string;email:string;createdAt:string;lastSignIn:string|null;
 sessionId:string|null;status:string|null;actions:number;evidence:number;risks:number;
 hasDebrief:boolean;startedAt:string|null;updatedAt:string|null};
export type Incident={id:string;provider:string|null;model:string|null;kind:string;code:string|null;message:string|null;occurrences:number;attempts:number;firstSeenAt:string;lastSeenAt:string;label:string};
export type TurnRow={id:string;requestId:string;createdAt:string;severity:string|null;headline:string|null;
 summary:string|null;model:string|null;provider:string|null;inputTokens:number|null;outputTokens:number|null;modelCalls:number|null;
 actionName:string|null;actionChannel:string|null;durationMs:number|null;
 email:string;logs:Array<{stage:string;status:string;message:string;meta:any}>};

const TABS=[{id:'cenario',label:'Cenário',Icon:SlidersHorizontal},{id:'pessoas',label:'Quem entrou',Icon:Users},{id:'motor',label:'Motor',Icon:Bug},{id:'incidentes',label:'Incidentes',Icon:TriangleAlert}];
const when=(value:string|null)=>value?new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';

export function AdminConsole({scenario,defaultCast,participants,turns,incidents}:{scenario:ScenarioConfig;defaultCast:Character[];participants:Participant[];turns:TurnRow[];incidents:Incident[]}){
 const[tab,setTab]=useState('cenario');
 const[resolving,setResolving]=useState('');
 async function resolver(id:string){setResolving(id);await fetch('/api/admin/incident',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id})});location.reload()}
 const entered=participants.length;
 const exercised=participants.filter(p=>p.actions>0).length;
 const finished=participants.filter(p=>p.hasDebrief).length;

 return <main className="painel">
  <header className="painel-head">
   <div><div className="eyebrow">CHALLENGE · STUDIO</div><h1 className="h1">{scenario.title}</h1>
   <p className="muted">Você monta o mundo aqui. O motor cuida de fazer a história reagir.</p></div>
   <Link href="/lab" className="btn">Ver como participante</Link>
  </header>

  <div className="console-summary">
   <div className="panel"><div className="eyebrow">ENTRARAM</div><div className="metric">{entered}</div><small className="muted">contas com acesso</small></div>
   <div className="panel"><div className="eyebrow">EXERCITARAM</div><div className="metric">{exercised}</div><small className="muted">agiram no mundo pelo menos uma vez</small></div>
   <div className="panel"><div className="eyebrow">CHEGARAM AO FIM</div><div className="metric">{finished}</div><small className="muted">receberam o debrief</small></div>
  </div>

  <nav className="console-tabs">{TABS.map(({id,label,Icon})=>
   <button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={17}/>{label}{id==='incidentes'&&incidents.length>0&&<b className="tab-badge">{incidents.length}</b>}</button>)}</nav>

  {tab==='cenario'&&<ScenarioForm initial={scenario} defaultCast={defaultCast}/>}

  {tab==='pessoas'&&<section className="panel">
   <h2>Quem entrou, quem exercitou, o que saiu</h2>
   <p className="muted">Uma linha por pessoa. &quot;Resultado&quot; é o que a sessão produziu, não uma nota.</p>
   {participants.length===0&&<p className="muted">Ninguém entrou ainda.</p>}
   {participants.length>0&&<div className="people-table">
    <div className="people-row people-header"><span>Pessoa</span><span>Último acesso</span><span>Ações</span><span>Evidência</span><span>Resultado</span></div>
    {participants.map(person=><div className="people-row" key={person.userId}>
     <span className="people-who"><b>{person.email}</b><small>entrou em {when(person.createdAt)}</small></span>
     <span>{when(person.lastSignIn)}</span>
     <span>{person.actions||'—'}</span>
     <span>{person.evidence?`${person.evidence}${person.risks?` · ${person.risks} de risco`:''}`:'—'}</span>
     <span className="people-result">
      {!person.sessionId&&<span className="muted">não começou</span>}
      {person.sessionId&&!person.hasDebrief&&<span className="diagnostic-pill attention">em andamento</span>}
      {person.hasDebrief&&<span className="diagnostic-pill ok">debrief entregue</span>}
      {person.sessionId&&<Link className="btn" href={`/painel/${person.sessionId}`}>Abrir</Link>}
     </span>
    </div>)}
   </div>}
  </section>}

  {tab==='incidentes'&&<section className="panel">
   <h2>Incidentes</h2>
   <p className="muted">Falhas que não se resolvem esperando: chave errada, modelo inexistente, cota esgotada. Enquanto uma delas estiver aberta, os turnos dos participantes morrem em vez de entrar na fila.</p>
   {incidents.length===0&&<p className="muted">Nenhum incidente registrado. Falhas passageiras — limite de taxa, rede, provedor lento — são tratadas sozinhas e não aparecem aqui.</p>}
   {incidents.map(incident=><div className="incident" key={incident.id}>
    <div className="incident-head">
     <span className="diagnostic-pill error">{incident.label}</span>
     <span className="muted">{incident.provider}/{incident.model} · {incident.occurrences}× · desde {when(incident.firstSeenAt)}</span>
     <button className="btn" disabled={resolving===incident.id} onClick={()=>resolver(incident.id)}><Check size={15}/>{resolving===incident.id?'…':'Resolvido'}</button>
    </div>
    <pre className="incident-message">{incident.message}</pre>
   </div>)}
  </section>}

  {tab==='motor'&&<section className="debug-shell">
   <div className="panel debug-head"><div>
    <div className="eyebrow">ENGINE DIAGNOSTICS</div><h2>Motor</h2>
    <p className="muted">Os {turns.length} turnos mais recentes de todas as sessões: contexto → Director → menções → cascata → artefatos → Observer.</p>
    {turns.length>0&&(()=>{const inTok=turns.reduce((s,t)=>s+(t.inputTokens||0),0),outTok=turns.reduce((s,t)=>s+(t.outputTokens||0),0),calls=turns.reduce((s,t)=>s+(t.modelCalls||0),0);
     return <p className="muted"><b>{inTok.toLocaleString('pt-BR')}</b> tokens de entrada e <b>{outTok.toLocaleString('pt-BR')}</b> de saída em {calls} chamadas ao modelo · média de <b>{Math.round((inTok+outTok)/turns.length).toLocaleString('pt-BR')}</b> tokens por turno.</p>})()}
   </div></div>
   {turns.length===0&&<div className="panel"><p className="muted">Nenhum turno registrado ainda.</p></div>}
   {turns.map(turn=><details className="panel turn-card" key={turn.id}>
    <summary>
     <span className={'diagnostic-pill '+(turn.severity==='ok'?'ok':turn.severity==='error'?'error':'attention')}>{turn.severity||'—'}</span>
     <span className="turn-headline"><b>{turn.headline||'Turno'}</b><small>{turn.email} · {turn.actionChannel}/{turn.actionName} · {when(turn.createdAt)}{turn.durationMs?` · ${(turn.durationMs/1000).toFixed(1)}s`:''}{turn.provider?` · ${turn.provider}/${turn.model}`:''}{turn.inputTokens!==null?` · ${(turn.inputTokens||0)+(turn.outputTokens||0)} tokens em ${turn.modelCalls||0} chamadas`:''}</small></span>
    </summary>
    {turn.summary&&<p className="muted">{turn.summary}</p>}
    <div className="turn-logs">{turn.logs.map((log,i)=><div className={'debug-row debug-'+log.status} key={i}>
     <div className="debug-stage">{log.stage}</div>
     <div className="debug-message"><b>{log.message}</b>{log.meta&&<pre>{JSON.stringify(log.meta,null,2)}</pre>}</div>
    </div>)}</div>
   </details>)}
  </section>}
 </main>;
}
