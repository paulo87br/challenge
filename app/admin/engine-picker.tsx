'use client';
import{PROVIDERS,defaultModel,type ProviderId}from'@/lib/ai/providers';

export function EnginePicker({provider,model,onChange}:{
 provider:ProviderId;model:string;onChange:(next:{provider:ProviderId;model:string})=>void;
}){
 const config=PROVIDERS[provider]||PROVIDERS.openai;
 return <section className="panel">
  <div className="eyebrow">MOTOR</div>
  <h2>Qual modelo dirige este mundo</h2>
  <p className="muted">Director, personagens, Ara, Observer e debrief usam o mesmo modelo. Cada turno são de duas a cinco chamadas, então a escolha aqui é o que define o custo de uma sessão.</p>
  <div className="provider-row">{(Object.keys(PROVIDERS) as ProviderId[]).map(id=>
   <button key={id} className={'provider-chip '+(id===provider?'active':'')}
    onClick={()=>onChange({provider:id,model:defaultModel(id)})}>{PROVIDERS[id].label}</button>)}</div>
  <p className="muted provider-note">{config.note} Chave lida de <code>{config.keyEnv}</code>.</p>
  <div className="field-grid">
   <label><span>Modelo</span>
    <select className="input" value={model} onChange={e=>onChange({provider,model:e.target.value})}>
     {config.models.map(option=><option key={option.id} value={option.id}>{option.label}{option.note?` — ${option.note}`:''}</option>)}
    </select>
   </label>
  </div>
 </section>;
}
