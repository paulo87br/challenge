'use client';
import{useRouter,useSearchParams}from'next/navigation';

/**
 * De quem é este relatório.
 *
 * Turma e mundo deixaram de ser a mesma coisa: um mundo é uma atividade, e uma
 * turma pode ter várias ao longo do semestre. O seletor oferece as duas
 * leituras porque elas respondem a perguntas diferentes -- "como foi esta
 * aula?" e "como esta turma vem se comportando?".
 */
export type Opcao={valor:string;rotulo:string;grupo:'turma'|'mundo'};

export function SeletorDeMundo({opcoes,atual}:{opcoes:Opcao[];atual:string}){
 const router=useRouter();
 const params=useSearchParams();
 const turmas=opcoes.filter(o=>o.grupo==='turma');
 const mundos=opcoes.filter(o=>o.grupo==='mundo');
 return <label className="seletor-mundo">
  <span className="eyebrow">RELATÓRIO DE</span>
  <select className="input" value={atual} aria-label="De qual turma ou atividade é o relatório"
   onChange={e=>{
    const p=new URLSearchParams(params.toString());
    p.set('escopo',e.target.value);
    router.push(`/painel/turma?${p.toString()}`);
   }}>
   {turmas.length>0&&<optgroup label="Turmas">
    {turmas.map(o=><option key={o.valor} value={o.valor}>{o.rotulo}</option>)}</optgroup>}
   <optgroup label={turmas.length?'Atividades avulsas':'Atividades'}>
    {mundos.map(o=><option key={o.valor} value={o.valor}>{o.rotulo}</option>)}</optgroup>
  </select>
 </label>;
}
