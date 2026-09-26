'use client';
import{ListPlus,Trash2}from'lucide-react';
import type{Competency}from'@/lib/simulation/types';

// A code is what the Observer writes on every signal and what the panel groups
// by, so it has to be stable: lowercase, no accents, no spaces.
const toCode=(value:string)=>String(value||'').normalize('NFD').replace(/[̀-ͯ]/g,'')
 .toLocaleLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48);

export function CompetencyEditor({competencies,onChange}:{competencies:Competency[];onChange:(next:Competency[])=>void}){
 const patch=(index:number,change:Partial<Competency>)=>onChange(competencies.map((c,i)=>i===index?{...c,...change}:c));
 const duplicated=new Set(competencies.map(c=>c.code).filter((code,i,all)=>code&&all.indexOf(code)!==i));

 return <section className="panel">
  <div className="studio-head">
   <div><div className="eyebrow">O QUE SE OBSERVA</div><h2>Competências desta avaliação</h2>
   <p className="muted">O Observer só pode rotular evidência com um código desta lista. Sinais que não couberem em nenhuma competência são descartados, não forçados na mais próxima.</p>
   <p className="muted">Não há nota nem nível: o resultado é quanta evidência cada competência reuniu, de que natureza e com que confiança.</p></div>
   <button className="btn" onClick={()=>onChange([...competencies,{code:'',name:'',definition:''}])}><ListPlus size={16}/>Nova competência</button>
  </div>

  {competencies.length===0&&<p className="muted">Sem competências, o Observer não tem como rotular nada e a sessão não produz perfil.</p>}

  <div className="competency-list">{competencies.map((competency,index)=><div className="competency-row" key={index}>
   <div className="competency-head">
    <input className="input" placeholder="Nome da competência" value={competency.name}
     aria-label={`Nome da competência ${index+1}`}
     onChange={e=>patch(index,{name:e.target.value,code:competency.code||toCode(e.target.value)})}/>
    <input className={'input competency-code '+(duplicated.has(competency.code)?'invalid':'')} placeholder="codigo"
     aria-label={`Código da competência ${index+1}`}
     value={competency.code} onChange={e=>patch(index,{code:toCode(e.target.value)})}/>
    <button className="btn persona-icon" aria-label={`Remover ${competency.name||'competência'}`}
     onClick={()=>onChange(competencies.filter((_,i)=>i!==index))}><Trash2 size={15}/></button>
   </div>
   <textarea className="input" style={{height:58}} placeholder="O que conta como evidência desta competência"
    aria-label={`Definição de ${competency.name||'competência '+(index+1)}`}
    value={competency.definition} onChange={e=>patch(index,{definition:e.target.value})}/>
   {duplicated.has(competency.code)&&<small className="competency-warn">Código repetido: duas competências com o mesmo código viram uma só no relatório.</small>}
  </div>)}</div>
 </section>;
}
