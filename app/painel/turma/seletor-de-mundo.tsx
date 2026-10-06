'use client';
import{useRouter,useSearchParams}from'next/navigation';

/**
 * O relatório é de uma turma, e turma hoje é o mundo em que as pessoas
 * sentaram. Sem este recorte, a tela somava tudo que já existiu -- o teste da
 * madrugada, a corrida de um colega e a aula inteira na mesma média.
 */
export function SeletorDeMundo({mundos,atual}:{mundos:{key:string;title:string;active:boolean;pessoas:number}[];atual:string}){
 const router=useRouter();
 const params=useSearchParams();
 return <label className="seletor-mundo">
  <span className="eyebrow">TURMA</span>
  <select className="input" value={atual} aria-label="Ver o relatório de qual mundo"
   onChange={e=>{
    const p=new URLSearchParams(params.toString());
    p.set('cenario',e.target.value);
    router.push(`/painel/turma?${p.toString()}`);
   }}>
   {mundos.map(m=><option key={m.key} value={m.key}>
    {m.title}{m.active?' · no ar':''} — {m.pessoas} {m.pessoas===1?'pessoa':'pessoas'}</option>)}
  </select>
 </label>;
}
