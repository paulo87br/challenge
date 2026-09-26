'use client';
import{useState}from'react';import{ChevronDown,FilePlus2,Trash2}from'lucide-react';
import type{Character}from'@/lib/simulation/types';
import type{ScenarioArtifact}from'@/lib/simulation/scenario-world';

const toList=(value:string)=>value.split(/[\n,]/).map(part=>part.trim()).filter(Boolean);

export function ArtifactEditor({artifacts,characters,onChange}:{
 artifacts:ScenarioArtifact[];characters:Character[];onChange:(next:ScenarioArtifact[])=>void;
}){
 const[openIndex,setOpenIndex]=useState(-1);
 const patch=(index:number,change:Partial<ScenarioArtifact>)=>onChange(artifacts.map((a,i)=>i===index?{...a,...change}:a));
 function add(){
  onChange([...artifacts,{name:'',ownerId:characters[0]?.id||'',body:'',keywords:[]}]);
  setOpenIndex(artifacts.length);
 }
 function remove(index:number,name:string){
  if(!window.confirm(`Remover ${name||'este documento'} do cenário?`))return;
  onChange(artifacts.filter((_,i)=>i!==index));setOpenIndex(-1);
 }
 const ownerName=(id:string)=>characters.find(person=>person.id===id)?.name||'sem dono';

 return <section className="panel">
  <div className="studio-head">
   <div><div className="eyebrow">ARTEFATOS</div><h2>Documentos que precisam ser pedidos</h2>
   <p className="muted">Só entram aqui os documentos que alguém <b>entrega durante a história</b>. O que já está em Arquivos desde o início é público dentro do mundo e não precisa de dono.</p>
   <p className="muted">O dono é quem pode entregar. Se outra pessoa afirmar que já tem o documento, o motor devolve a conversa para quem realmente o possui — é isso que impede o mundo de inventar que um arquivo existe.</p></div>
   <button className="btn" onClick={add}><FilePlus2 size={16}/>Novo documento</button>
  </div>

  {artifacts.length===0&&<p className="muted">Nenhum documento. A história funciona, mas ninguém terá o que entregar sob demanda.</p>}

  <div className="persona-list">{artifacts.map((artifact,index)=>{
   const open=openIndex===index;
   return <div className={'persona-item '+(open?'open':'')} key={index}>
    <div className="persona-row">
     <button className="persona-toggle" aria-expanded={open} onClick={()=>setOpenIndex(open?-1:index)}>
      <ChevronDown size={17} className="persona-chevron"/>
      <span className="persona-id"><b>{artifact.name||'Documento sem nome'}</b>
       <small>entregue por {ownerName(artifact.ownerId)} · {(artifact.keywords||[]).length} palavra(s)-chave</small></span>
     </button>
     <span className="persona-actions">
      <button className="btn persona-icon" aria-label={`Remover ${artifact.name||'documento'}`} onClick={()=>remove(index,artifact.name)}><Trash2 size={15}/></button>
     </span>
    </div>
    {open&&<div className="persona-body">
     <div className="field-grid">
      <label><span>Nome do documento</span><input className="input" value={artifact.name} onChange={e=>patch(index,{name:e.target.value})}/></label>
      <label><span>Quem entrega</span>
       <select className="input" value={artifact.ownerId} onChange={e=>patch(index,{ownerId:e.target.value})}>
        <option value="">— escolha uma pessoa —</option>
        {characters.map(person=><option key={person.id} value={person.id}>{person.name||person.id}</option>)}
       </select></label>
     </div>
     <label className="field"><span>Como as pessoas pedem por ele (uma por linha)</span>
      <textarea className="input" style={{height:70}} value={(artifact.keywords||[]).join('\n')} onChange={e=>patch(index,{keywords:toList(e.target.value)})}/>
      <small className="muted">Termos que aparecem quando alguém pede este documento. Evite palavras curtas ou genéricas: elas fazem o motor reagir onde não deveria.</small>
     </label>
     <label className="field"><span>Conteúdo do documento</span>
      <textarea className="input" style={{height:160}} value={artifact.body} onChange={e=>patch(index,{body:e.target.value})}/>
      <small className="muted">É isto que a pessoa lê em Arquivos quando o documento chega.</small>
     </label>
    </div>}
   </div>;
  })}</div>
 </section>;
}
