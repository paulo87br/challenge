'use client';
import{useState}from'react';import{useRouter}from'next/navigation';
import{BookmarkPlus,Copy,Play,Trash2}from'lucide-react';

export type ScenarioRow={key:string;title:string;domain:string;seat_role:string;
 is_template:boolean;active:boolean;created_from:string|null;updated_at:string|null};

export function ScenarioSwitcher({scenarios,currentKey}:{scenarios:ScenarioRow[];currentKey:string}){
 const router=useRouter();
 const[busy,setBusy]=useState('');
 const[error,setError]=useState('');
 const mundos=scenarios.filter(s=>!s.is_template);
 const templates=scenarios.filter(s=>s.is_template);

 async function agir(action:string,sourceKey:string,title?:string){
  setBusy(action+sourceKey);setError('');
  try{
   const r=await fetch('/api/admin/scenarios',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action,sourceKey,title})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.detail||data.error||`HTTP ${r.status}`);
   router.refresh();
  }catch(problem){setError(problem instanceof Error?problem.message:'Falha na operação.')}
  finally{setBusy('')}
 }

 function salvarTemplate(){
  const nome=window.prompt('Nome do template:',`${scenarios.find(s=>s.key===currentKey)?.title||'Cenário'} (template)`);
  if(nome)agir('save_template',currentKey,nome);
 }
 function criarDe(key:string,titulo:string){
  const nome=window.prompt('Nome do novo cenário:',titulo.replace(/\s*\(template\)\s*$/,''));
  if(nome)agir('create_from',key,nome);
 }

 return <section className="panel switcher">
  <div className="studio-head">
   <div><div className="eyebrow">CENÁRIOS</div><h2>Qual mundo está no ar</h2>
   <p className="muted">O cenário ativo é o que as pessoas encontram ao entrar. Sessões já em andamento mantêm o mundo em que começaram — ativar outro não reescreve o que alguém está vivendo.</p></div>
   <button className="btn" onClick={salvarTemplate} disabled={Boolean(busy)}><BookmarkPlus size={16}/>Salvar como template</button>
  </div>
  {error&&<div className="runtime-error">{error}</div>}

  <div className="switcher-list">{mundos.map(scenario=><div className={'switcher-row '+(scenario.active?'active':'')} key={scenario.key}>
   <span className="switcher-name"><b>{scenario.title}</b>
    <small>{scenario.domain} · {scenario.seat_role}{scenario.created_from?` · a partir de ${scenario.created_from}`:''}</small></span>
   <span className="switcher-actions">
    {scenario.active
     ?<span className="diagnostic-pill ok">no ar</span>
     :<button className="btn" disabled={Boolean(busy)} onClick={()=>agir('activate',scenario.key)}><Play size={15}/>Ativar</button>}
    <button className="btn persona-icon" aria-label={`Apagar ${scenario.title}`}
     disabled={Boolean(busy)||scenario.active} onClick={()=>{
      if(window.confirm(`Apagar "${scenario.title}"? Isso não pode ser desfeito.`))agir('delete',scenario.key);
     }}><Trash2 size={15}/></button>
   </span>
  </div>)}</div>

  <h3 className="switcher-heading">Templates</h3>
  <p className="muted">Um template é um ponto de partida, não um mundo em que alguém está. Criar a partir dele faz uma cópia independente.</p>
  {templates.length===0&&<p className="muted">Nenhum template ainda. Salve o cenário atual para reaproveitá-lo depois.</p>}
  <div className="switcher-list">{templates.map(template=><div className="switcher-row" key={template.key}>
   <span className="switcher-name"><b>{template.title}</b><small>{template.domain} · {template.seat_role}</small></span>
   <span className="switcher-actions">
    <button className="btn primary" disabled={Boolean(busy)} onClick={()=>criarDe(template.key,template.title)}>
     <Copy size={15}/>Criar cenário a partir daqui</button>
    <button className="btn persona-icon" aria-label={`Apagar ${template.title}`} disabled={Boolean(busy)}
     onClick={()=>{if(window.confirm(`Apagar o template "${template.title}"?`))agir('delete',template.key)}}><Trash2 size={15}/></button>
   </span>
  </div>)}</div>
 </section>;
}
