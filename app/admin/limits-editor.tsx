'use client';
import{useState}from'react';import{Gauge,Save}from'lucide-react';
import{PROVIDERS,type ProviderId}from'@/lib/ai/providers';

export type RateLimit={provider:string;tokens_per_minute:number;requests_per_minute:number;max_concurrent:number};

export function LimitsEditor({limits,activeProvider}:{limits:RateLimit[];activeProvider:string}){
 const[rows,setRows]=useState(limits);
 const[state,setState]=useState<'idle'|'saving'|'saved'|'error'>('idle');
 const[message,setMessage]=useState('');
 const patch=(index:number,change:Partial<RateLimit>)=>{setRows(rows.map((r,i)=>i===index?{...r,...change}:r));setState('idle')};

 async function save(){
  setState('saving');setMessage('');
  try{
   const r=await fetch('/api/admin/limits',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({limits:rows})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.detail||data.error||`HTTP ${r.status}`);
   setState('saved');
  }catch(error){setState('error');setMessage(error instanceof Error?error.message:'Falha ao salvar.')}
 }

 return <section className="panel">
  <div className="eyebrow">LIMITES</div>
  <h2><Gauge size={19} style={{verticalAlign:'-3px',marginRight:7}}/>Quanto cada provedor aguenta</h2>
  <p className="muted">A fila usa estes números para decidir quem passa e quanto tempo os outros esperam. Se você trocar de plano no provedor, atualize aqui — do contrário a fila segura gente à toa, ou deixa passar e o provedor devolve erro.</p>
  <p className="muted">Concorrência 0 significa sem limite. Medido no Groq: vinte requisições simultâneas passaram, e a única recusa foi por tokens.</p>

  <div className="limits-table">
   <div className="limits-row limits-header"><span>Provedor</span><span>Tokens/min</span><span>Requisições/min</span><span>Simultâneas</span></div>
   {rows.map((row,index)=><div className={'limits-row '+(row.provider===activeProvider?'active':'')} key={row.provider}>
    <span className="limits-name">{PROVIDERS[row.provider as ProviderId]?.label||row.provider}
     {row.provider===activeProvider&&<b className="tag">em uso</b>}</span>
    <input className="input" type="number" min={0} aria-label={`Tokens por minuto do ${row.provider}`}
     value={row.tokens_per_minute} onChange={e=>patch(index,{tokens_per_minute:Number(e.target.value)||0})}/>
    <input className="input" type="number" min={0} aria-label={`Requisições por minuto do ${row.provider}`}
     value={row.requests_per_minute} onChange={e=>patch(index,{requests_per_minute:Number(e.target.value)||0})}/>
    <input className="input" type="number" min={0} aria-label={`Requisições simultâneas do ${row.provider}`}
     value={row.max_concurrent} onChange={e=>patch(index,{max_concurrent:Number(e.target.value)||0})}/>
   </div>)}
  </div>

  <div className="studio-save">
   {state==='error'&&<div className="runtime-error">{message}</div>}
   {state==='saved'&&<span className="tag">Limites salvos.</span>}
   <button className="btn primary" disabled={state==='saving'} onClick={save}><Save size={16}/>{state==='saving'?'Salvando…':'Salvar limites'}</button>
  </div>
 </section>;
}
