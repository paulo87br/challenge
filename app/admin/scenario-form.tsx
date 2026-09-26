'use client';
import{useState}from'react';import{Save}from'lucide-react';
import{TEMPERATURE_FIELDS,type ScenarioConfig}from'@/lib/simulation/scenario';import{EnginePicker}from'./engine-picker';import{PersonaEditor}from'./persona-editor';import{ArtifactEditor}from'./artifact-editor';import{CompetencyEditor}from'./competency-editor';import{NewsEditor}from'./news-editor';import type{ProviderId}from'@/lib/ai/providers';import type{Character}from'@/lib/simulation/types';

export function ScenarioForm({initial,defaultCast}:{initial:ScenarioConfig;defaultCast:Character[]}){
 const[form,setForm]=useState<ScenarioConfig>(initial);
 // An empty cast means the scenario still rides on the compiled default; show
 // that cast so editing it is a choice rather than starting from nothing.
 const usingDefaults=!initial.characters?.length;
 const cast=form.characters?.length?form.characters:defaultCast;
 const[state,setState]=useState<'idle'|'saving'|'saved'|'error'>('idle');
 const[message,setMessage]=useState('');
 const set=(patch:Partial<ScenarioConfig>)=>{setForm(current=>({...current,...patch}));setState('idle')};
 const heat=Math.round((TEMPERATURE_FIELDS.reduce((sum,f)=>sum+(Number(form.temperature?.[f.key])||0),0)/TEMPERATURE_FIELDS.length)*100);

 async function save(){
  setState('saving');setMessage('');
  try{
   const r=await fetch('/api/admin/scenario',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(form)});
   const data=await r.json();
   if(!r.ok)throw new Error(data.detail||data.error||`HTTP ${r.status}`);
   if(data.partial){setState('error');setMessage(data.detail||'Salvo parcialmente.');return}
   setState('saved');
  }catch(error){setState('error');setMessage(error instanceof Error?error.message:'Falha ao salvar.')}
 }

 return <div className="studio">
  <section className="panel">
   <div className="eyebrow">IDENTIDADE</div>
   <h2>O que é este Challenge</h2>
   <div className="field-grid">
    <label><span>Título</span><input className="input" value={form.title} onChange={e=>set({title:e.target.value})}/></label>
    <label><span>Domínio</span><input className="input" value={form.domain} onChange={e=>set({domain:e.target.value})}/></label>
    <label><span>Assento do participante</span><input className="input" value={form.seat_role} onChange={e=>set({seat_role:e.target.value})}/></label>
    <label><span>Duração prevista (minutos)</span><input className="input" type="number" min={5} max={180} value={form.duration_minutes} onChange={e=>set({duration_minutes:Number(e.target.value)||30})}/></label>
   </div>
   <label className="field"><span>Missão que a pessoa lê</span>
    <input className="input" value={form.mission} onChange={e=>set({mission:e.target.value})}/></label>
   <label className="field"><span>O mundo</span>
    <textarea className="input" style={{height:110}} value={form.world_description} onChange={e=>set({world_description:e.target.value})}/></label>
  </section>

  <section className="panel">
   <div className="studio-head">
    <div><div className="eyebrow">CLIMA</div><h2>Quanto queremos mexer com esse cenário?</h2>
    <p className="muted">Cada vetor muda como o Director escala pressão e conflito. Não é dificuldade: é o tipo de situação.</p></div>
    <div><div className="temp">{heat}°</div><small className="muted">clima médio</small></div>
   </div>
   <div className="sliders">
    {TEMPERATURE_FIELDS.map(field=>{
     const value=Math.round((Number(form.temperature?.[field.key])||0)*100);
     return <label className="slider" key={field.key}>
      <span className="slider-label">{field.icon} {field.label}<b>{value}%</b></span>
      <input type="range" min={0} max={100} value={value} aria-label={field.label}
       onChange={e=>set({temperature:{...form.temperature,[field.key]:Number(e.target.value)/100}})}/>
     </label>;
    })}
   </div>
  </section>

  <EnginePicker provider={(form.provider||'openai') as ProviderId} model={form.model||''}
   onChange={next=>{
    // Groq has no realtime voice and a free tier that a call would exhaust in
    // minutes, so switching to it turns calls off rather than leaving a switch
    // on that points at nothing.
    const patch:Partial<ScenarioConfig>={...next};
    if((next as any).provider==='groq')patch.calls_enabled=false;
    set(patch);
   }}/>

  <section className="panel">
   <div className="eyebrow">CHAMADAS</div>
   <h2>Calls por voz</h2>
   <label className="calls-toggle">
    <input type="checkbox" checked={Boolean(form.calls_enabled)} disabled={form.provider==='groq'}
     onChange={e=>set({calls_enabled:e.target.checked})}/>
    <span><b>Permitir que o participante ligue para os personagens</b>
     <small>A voz é cobrada por minuto de áudio, não por token, então a fila que protege os turnos não a governa. Ligue quando quiser que a conversa por voz faça parte do Challenge — e acompanhe o consumo por fora.</small>
     {form.provider==='groq'&&<small><b>Indisponível no Groq:</b> não há voz em tempo real no catálogo dele, e a camada gratuita não sustentaria o áudio.</small>}
    </span>
   </label>
  </section>

  <PersonaEditor characters={cast} usingDefaults={usingDefaults} onChange={next=>set({characters:next})}/>

  <ArtifactEditor artifacts={form.artifacts||[]} characters={cast} onChange={next=>set({artifacts:next})}/>

  <CompetencyEditor competencies={form.competencies||[]} onChange={next=>set({competencies:next})}/>

  <NewsEditor news={form.news||[]} onChange={next=>set({news:next})}/>

  <div className="studio-save">
   {state==='error'&&<div className="runtime-error">{message}</div>}
   {state==='saved'&&<span className="tag">Cenário salvo. Vale para as próximas sessões; as que já começaram mantêm o mundo em que foram jogadas.</span>}
   <button className="btn primary" disabled={state==='saving'} onClick={save}><Save size={16}/>{state==='saving'?'Salvando…':'Salvar cenário'}</button>
  </div>
 </div>;
}
