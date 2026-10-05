'use client';
import{Flag,Lightbulb,Compass,HelpCircle,Pause,Play}from'lucide-react';
import type{Debrief}from'@/lib/simulation/types';

export function DebriefScreen({debrief,evidenceCount,turnCount,busy,error,onGenerate,onRestart,paused,onTogglePause}:{
 debrief:Debrief|null;evidenceCount:number;turnCount:number;busy:boolean;error:string;onGenerate:()=>void;onRestart:()=>void;
 paused:boolean;onTogglePause:()=>void;
}){
 if(!debrief)return <section className="panel debrief-empty">
  <div className="eyebrow">FECHAMENTO</div>
  <h2>Encerrar o Challenge</h2>
  <p className="muted">O debrief retoma como você conduziu a situação, o que suas decisões mudaram no mundo e o que ficou sem ser examinado. Ele não tem nota, nível nem comparação com outras pessoas.</p>
  <div className="debrief-counters">
   <div className="panel"><div className="eyebrow">AÇÕES</div><div className="metric">{turnCount}</div></div>
   <div className="panel"><div className="eyebrow">EVIDÊNCIA</div><div className="metric">{evidenceCount}</div></div>
  </div>
  {evidenceCount===0&&<p className="muted">Ainda não há evidência registrada. Você pode encerrar assim mesmo, mas o debrief se constrói do que você fez no mundo — conversar, buscar documentos e decidir é o que dá a ele o que dizer.</p>}
  {error&&<div className="runtime-error">{error}</div>}

  <section className="pause-card">
   <div><b>{paused?'Sessão pausada':'Precisa parar agora?'}</b>
    <small>{paused
     ? 'O relógio do mundo está parado e o tempo desta pausa não conta. Retome quando puder.'
     : 'Você pode pausar e voltar depois, de qualquer navegador onde entrar com a mesma conta. Nada se perde.'}</small></div>
   <button className="btn" onClick={onTogglePause}>{paused?<><Play size={16}/>Retomar</>:<><Pause size={16}/>Pausar</>}</button>
  </section>

  <button className="btn primary" disabled={busy} onClick={()=>onGenerate()}>{busy?'Escrevendo seu debrief…':'Encerrar e ver meu debrief'}</button>
  <button className="btn restart" onClick={onRestart}>Recomeçar do zero</button>
 </section>;

 return <section className="debrief">
  <div className="panel debrief-hero">
   <div className="eyebrow">SEU DEBRIEF</div>
   <h1 className="h1">{debrief.headline}</h1>
   {debrief.narrative.split('\n').filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}
  </div>

  {debrief.moves?.length>0&&<section className="panel"><h2><Flag size={19}/> O que suas decisões mudaram</h2>
   {debrief.moves.map((move,i)=><div className="debrief-item" key={i}><b>{move.action}</b><span>{move.effect}</span></div>)}
  </section>}

  {debrief.blind_spots?.length>0&&<section className="panel"><h2><Lightbulb size={19}/> O que passou sem ser examinado</h2>
   {debrief.blind_spots.map((spot,i)=><div className="debrief-item" key={i}><b>{spot.observation}</b><span>{spot.why_it_matters}</span></div>)}
  </section>}

  {debrief.uncovered?.length>0&&<section className="panel"><h2><Compass size={19}/> O que esta sessão não exercitou</h2>
   <p className="muted">Terreno que a sessão não cobriu. Isso diz respeito ao caminho que a história tomou, não a uma falta sua.</p>
   <ul className="debrief-list">{debrief.uncovered.map((item,i)=><li key={i}>{item}</li>)}</ul>
  </section>}

  {debrief.questions_to_sit_with?.length>0&&<section className="panel"><h2><HelpCircle size={19}/> Perguntas para levar daqui</h2>
   <ul className="debrief-list">{debrief.questions_to_sit_with.map((item,i)=><li key={i}>{item}</li>)}</ul>
  </section>}
  <div className="studio-save"><button className="btn" onClick={onRestart}>Recomeçar do zero</button></div>
 </section>;
}
