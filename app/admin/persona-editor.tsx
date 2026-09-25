'use client';
import{Plus,Trash2,UserPlus}from'lucide-react';
import type{Character}from'@/lib/simulation/types';

const TRAITS:Array<{key:keyof Character['traits'];label:string}>=[
 {key:'directness',label:'Direto'},{key:'diplomacy',label:'Diplomático'},{key:'detailOrientation',label:'Detalhista'},
 {key:'politicalAwareness',label:'Político'},{key:'riskAversion',label:'Avesso a risco'},
 {key:'technicalDepth',label:'Técnico'},{key:'patience',label:'Paciente'}
];

function blank(index:number):Character{
 return{id:`persona-${Date.now()}-${index}`,name:'',role:'',seniority:'',influence:.5,
  traits:{directness:.5,diplomacy:.5,detailOrientation:.5,politicalAwareness:.5,riskAversion:.5,technicalDepth:.5,patience:.5},
  goals:[],concerns:[],channels:['mail','chat','call'],relationships:{},
  state:{mood:'neutro',trustInParticipant:.5,pressure:.4,knownFacts:[],memory:[]}};
}
const lines=(value:string[])=>(value||[]).join('\n');
const toLines=(value:string)=>value.split('\n').map(line=>line.trim()).filter(Boolean);

export function PersonaEditor({characters,onChange,usingDefaults}:{
 characters:Character[];onChange:(next:Character[])=>void;usingDefaults:boolean;
}){
 const patch=(index:number,change:Partial<Character>)=>onChange(characters.map((c,i)=>i===index?{...c,...change}:c));
 const patchState=(index:number,change:Partial<Character['state']>)=>
  onChange(characters.map((c,i)=>i===index?{...c,state:{...c.state,...change}}:c));

 return <section className="panel">
  <div className="studio-head">
   <div><div className="eyebrow">PERSONAS</div><h2>Quem vive neste mundo?</h2>
   <p className="muted">Personalidade é estável. Humor, confiança e pressão mudam durante o Challenge — o que você define aqui é o ponto de partida.</p>
   {usingDefaults&&<p className="muted"><b>Este cenário ainda usa o elenco padrão.</b> Qualquer alteração abaixo passa a valer como elenco próprio.</p>}</div>
   <button className="btn" onClick={()=>onChange([...characters,blank(characters.length)])}><UserPlus size={16}/>Nova persona</button>
  </div>

  {characters.length===0&&<p className="muted">Nenhuma persona. Sem gente, o mundo não reage.</p>}

  <div className="persona-grid">{characters.map((person,index)=><article className="persona-card" key={person.id}>
   <div className="persona-top">
    <span className="person-avatar">{(person.name||'?').split(' ').map(part=>part[0]).slice(0,2).join('')}</span>
    <button className="btn persona-remove" aria-label={`Remover ${person.name||'persona'}`}
     onClick={()=>onChange(characters.filter((_,i)=>i!==index))}><Trash2 size={15}/></button>
   </div>
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
    <label><span>Objetivos (um por linha)</span><textarea className="input" style={{height:80}} value={lines(person.goals)} onChange={e=>patch(index,{goals:toLines(e.target.value)})}/></label>
    <label><span>Preocupações (uma por linha)</span><textarea className="input" style={{height:80}} value={lines(person.concerns)} onChange={e=>patch(index,{concerns:toLines(e.target.value)})}/></label>
   </div>
   <label className="field"><span>O que esta pessoa sabe (um fato por linha)</span>
    <textarea className="input" style={{height:80}} value={lines(person.state.knownFacts)} onChange={e=>patchState(index,{knownFacts:toLines(e.target.value)})}/>
    <small className="muted">Este é o perímetro de conhecimento: a pessoa só pode falar do que está aqui, mais o que aprender durante a conversa.</small>
   </label>
  </article>)}</div>
 </section>;
}
