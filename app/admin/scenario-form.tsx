'use client';
import{useState}from'react';import{Save}from'lucide-react';
import{TEMPERATURE_FIELDS,type ScenarioConfig}from'@/lib/simulation/scenario';import{EnginePicker}from'./engine-picker';import{PersonaEditor}from'./persona-editor';import{ArtifactEditor}from'./artifact-editor';import{CompetencyEditor}from'./competency-editor';import{NewsEditor}from'./news-editor';import{ScenarioSwitcher,type ScenarioRow}from'./scenario-switcher';import type{ProviderId}from'@/lib/ai/providers';import type{Character}from'@/lib/simulation/types';

export function ScenarioForm({initial,defaultCast,voiceKeyConfigured,scenarios,faltaMigracao}:{initial:ScenarioConfig;defaultCast:Character[];voiceKeyConfigured:boolean;scenarios:ScenarioRow[];faltaMigracao?:boolean}){
 const[form,setForm]=useState<ScenarioConfig>(initial);
 // An empty cast means the scenario still rides on the compiled default; show
 // that cast so editing it is a choice rather than starting from nothing.
 const usingDefaults=!initial.characters?.length;
 const cast=form.characters?.length?form.characters:defaultCast;
 const[state,setState]=useState<'idle'|'saving'|'saved'|'error'>('idle');
 const[secaoAtiva,setSecaoAtiva]=useState('mundo');
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


 const secoes=[
  {id:'mundo',label:'O mundo'},
  {id:'pessoas',label:`Pessoas (${cast.length})`},
  {id:'documentos',label:`Documentos (${(form.artifacts||[]).length})`},
  {id:'avaliacao',label:`Avaliação (${(form.competencies||[]).length})`},
  {id:'imprensa',label:`Imprensa (${(form.news||[]).length})`},
  {id:'motor',label:'Motor e voz'}
 ];

 return <div className="studio">
  {/* Sticky, because the form is long enough that the save button used to be a
      scroll away from whatever you had just changed. */}
  <div className="studio-bar">
   <nav className="studio-sections">{secoes.map(secao=>
    <button key={secao.id} className={secao.id===secaoAtiva?'active':''} onClick={()=>setSecaoAtiva(secao.id)}>{secao.label}</button>)}</nav>
   <div className="studio-bar-save">
    {state==='saved'&&<span className="tag">Salvo</span>}
    {state==='error'&&<span className="tag hot">Falhou</span>}
    <button className="btn primary" disabled={state==='saving'} onClick={save}><Save size={16}/>{state==='saving'?'Salvando…':'Salvar cenário'}</button>
   </div>
  </div>
  {state==='error'&&<div className="runtime-error">{message}</div>}
  {state==='saved'&&<p className="muted">Vale para as próximas sessões; as que já começaram mantêm o mundo em que foram jogadas.</p>}

  {secaoAtiva==='mundo'&&<>
   <ScenarioSwitcher scenarios={scenarios} currentKey={form.key} faltaMigracao={faltaMigracao}/>
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
  </>}

  {secaoAtiva==='pessoas'&&<PersonaEditor characters={cast} usingDefaults={usingDefaults} callsEnabled={Boolean(form.calls_enabled)} onChange={next=>set({characters:next})}/>}
  {secaoAtiva==='documentos'&&<ArtifactEditor artifacts={form.artifacts||[]} characters={cast} onChange={next=>set({artifacts:next})}/>}
  {secaoAtiva==='avaliacao'&&<CompetencyEditor competencies={form.competencies||[]} onChange={next=>set({competencies:next})}/>}
  {secaoAtiva==='imprensa'&&<NewsEditor news={form.news||[]} onChange={next=>set({news:next})}/>}

  {secaoAtiva==='motor'&&<>
   <EnginePicker provider={(form.provider||'openai') as ProviderId} model={form.model||''}
    onChange={next=>set(next as Partial<ScenarioConfig>)}/>

   <section className="panel">
    <div className="eyebrow">CHAMADAS</div>
    <h2>Calls por voz</h2>
    <p className="muted">A voz roda sempre na OpenAI e lê <code>OPENAI_API_KEY</code>, independente de qual provedor dirige os turnos. Você pode manter os turnos no Groq e ainda assim ter chamadas.</p>
    {!voiceKeyConfigured&&<div className="runtime-error">
     <b>OPENAI_API_KEY não está configurada neste ambiente.</b> O botão de ligar vai aparecer para o participante e falhar na primeira tentativa.
    </div>}
    <label className="calls-toggle">
     <input type="checkbox" checked={Boolean(form.calls_enabled)} onChange={e=>set({calls_enabled:e.target.checked})}/>
     <span><b>Permitir que o participante ligue para os personagens</b>
      <small>A voz é cobrada por minuto de áudio, não por token, então a fila que protege os turnos não a governa. Os tetos abaixo são o que impede a conta de crescer sem ninguém olhando.</small>
     </span>
    </label>
    {form.calls_enabled&&<>
     <div className="field-grid">
      <label><span>Minutos por chamada</span><input className="input" type="number" min={1} max={60}
       value={form.call_minutes_per_call??5} onChange={e=>set({call_minutes_per_call:Number(e.target.value)||5})}/></label>
      <label><span>Minutos por sessão</span><input className="input" type="number" min={1} max={240}
       value={form.call_minutes_per_session??15} onChange={e=>set({call_minutes_per_session:Number(e.target.value)||15})}/></label>
      <label><span>Voz padrão</span>
       <select className="input" value={form.call_voice||'marin'} onChange={e=>set({call_voice:e.target.value})}>
        <option value="marin">Marin</option><option value="cedar">Cedar</option>
       </select></label>
     </div>
     <small className="muted">Só personagens com <b>call</b> entre os canais atendem.</small>
    </>}
   </section>
  </>}
 </div>;
}
