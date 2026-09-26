'use client';
import{useState}from'react';import{ChevronDown,Copy,Trash2,UserPlus}from'lucide-react';
import type{Character}from'@/lib/simulation/types';

const TRAITS:Array<{key:keyof Character['traits'];label:string}>=[
 {key:'directness',label:'Direto'},{key:'diplomacy',label:'Diplomático'},{key:'detailOrientation',label:'Detalhista'},
 {key:'politicalAwareness',label:'Político'},{key:'riskAversion',label:'Avesso a risco'},
 {key:'technicalDepth',label:'Técnico'},{key:'patience',label:'Paciente'}
];

function blank():Character{
 return{id:`persona-${Date.now().toString(36)}`,name:'',role:'',seniority:'',influence:.5,
  traits:{directness:.5,diplomacy:.5,detailOrientation:.5,politicalAwareness:.5,riskAversion:.5,technicalDepth:.5,patience:.5},
  goals:[],concerns:[],channels:['mail','chat','call'],relationships:{},
  state:{mood:'neutro',trustInParticipant:.5,pressure:.4,knownFacts:[],memory:[]}};
}
const lines=(value:string[])=>(value||[]).join('\n');
const toLines=(value:string)=>value.split('\n').map(line=>line.trim()).filter(Boolean);
const initials=(name:string)=>(name||'?').trim().split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase();

export function PersonaEditor({characters,onChange,usingDefaults}:{
 characters:Character[];onChange:(next:Character[])=>void;usingDefaults:boolean;
}){
 // One open at a time. A cast of eight with every field expanded is the state
 // this screen was in before, and it made the rest of the Studio unreachable.
 const[openId,setOpenId]=useState('');
 const patch=(index:number,change:Partial<Character>)=>onChange(characters.map((c,i)=>i===index?{...c,...change}:c));
 const patchState=(index:number,change:Partial<Character['state']>)=>
  onChange(characters.map((c,i)=>i===index?{...c,state:{...c.state,...change}}:c));
 function add(){const person=blank();onChange([...characters,person]);setOpenId(person.id)}
 function duplicate(person:Character){
  const copy={...person,id:`persona-${Date.now().toString(36)}`,name:`${person.name} (cópia)`};
  onChange([...characters,copy]);setOpenId(copy.id);
 }
 function remove(person:Character){
  if(!window.confirm(`Remover ${person.name||'esta persona'} do mundo?`))return;
  onChange(characters.filter(c=>c.id!==person.id));
  if(openId===person.id)setOpenId('');
 }

 return <section className="panel">
  <div className="studio-head">
   <div><div className="eyebrow">PERSONAS</div><h2>Quem vive neste mundo?</h2>
   <p className="muted">Personalidade é estável. Humor, confiança e pressão mudam durante o Challenge — o que você define aqui é o ponto de partida.</p>
   {usingDefaults&&<p className="muted"><b>Este cenário ainda usa o elenco padrão.</b> Qualquer alteração abaixo passa a valer como elenco próprio.</p>}</div>
   <button className="btn" onClick={add}><UserPlus size={16}/>Nova persona</button>
  </div>

  {characters.length===0&&<p className="muted">Nenhuma persona. Sem gente, o mundo não reage.</p>}

  <div className="persona-list">{characters.map((person,index)=>{
   const open=openId===person.id;
   return <div className={'persona-item '+(open?'open':'')} key={person.id}>
    <div className="persona-row">
     <button className="persona-toggle" aria-expanded={open} onClick={()=>setOpenId(open?'':person.id)}>
      <ChevronDown size={17} className="persona-chevron"/>
      <span className="person-avatar">{initials(person.name)}</span>
      <span className="persona-id">
       <b>{person.name||'Persona sem nome'}</b>
       <small>{[person.role,person.seniority].filter(Boolean).join(' · ')||'sem cargo definido'}</small>
      </span>
      <span className="persona-meta">
       <span className="tag">influência {Math.round(person.influence*100)}%</span>
       <span className="tag">{person.state.mood||'neutro'}</span>
       <span className="tag">{(person.state.knownFacts||[]).length} fato(s)</span>
      </span>
     </button>
     <span className="persona-actions">
      <button className="btn persona-icon" aria-label={`Duplicar ${person.name||'persona'}`} onClick={()=>duplicate(person)}><Copy size={15}/></button>
      <button className="btn persona-icon" aria-label={`Remover ${person.name||'persona'}`} onClick={()=>remove(person)}><Trash2 size={15}/></button>
     </span>
    </div>

    {open&&<div className="persona-body">
     <div className="field-grid">
      <label><span>Nome</span><input className="input" value={person.name} onChange={e=>patch(index,{name:e.target.value})}/></label>
      <label><span>Cargo</span><input className="input" value={person.role} onChange={e=>patch(index,{role:e.target.value})}/></label>
      <label><span>Senioridade</span><input className="input" value={person.seniority} onChange={e=>patch(index,{seniority:e.target.value})}/></label>
      <label><span>Humor inicial</span><input className="input" value={person.state.mood} onChange={e=>patchState(index,{mood:e.target.value})}/></label>
     </div>

     <label className="slider"><span className="slider-label">Influência na organização<b>{Math.round(person.influence*100)}%</b></span>
      <input type="range" min={0} max={100} value={Math.round(person.influence*100)} aria-label={`Influência de ${person.name}`}
       onChange={e=>patch(index,{influence:Number(e.target.value)/100})}/></label>

     <div className="persona-traits">{TRAITS.map(trait=>
      <label className="slider" key={trait.key}>
       <span className="slider-label">{trait.label}<b>{Math.round((person.traits[trait.key]||0)*100)}</b></span>
       <input type="range" min={0} max={100} value={Math.round((person.traits[trait.key]||0)*100)} aria-label={`${trait.label} de ${person.name}`}
        onChange={e=>patch(index,{traits:{...person.traits,[trait.key]:Number(e.target.value)/100}})}/>
      </label>)}</div>

     <div className="field-grid">
      <label><span>Objetivos (um por linha)</span><textarea className="input" style={{height:78}} value={lines(person.goals)} onChange={e=>patch(index,{goals:toLines(e.target.value)})}/></label>
      <label><span>Preocupações (uma por linha)</span><textarea className="input" style={{height:78}} value={lines(person.concerns)} onChange={e=>patch(index,{concerns:toLines(e.target.value)})}/></label>
     </div>
     <label className="field"><span>O que esta pessoa sabe (um fato por linha)</span>
      <textarea className="input" style={{height:78}} value={lines(person.state.knownFacts)} onChange={e=>patchState(index,{knownFacts:toLines(e.target.value)})}/>
      <small className="muted">Este é o perímetro de conhecimento: a pessoa só pode falar do que está aqui, mais o que aprender durante a conversa.</small>
     </label>
    </div>}
   </div>;
  })}</div>
 </section>;
}
