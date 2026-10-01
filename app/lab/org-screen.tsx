'use client';
import{Building2}from'lucide-react';
import type{Character}from'@/lib/simulation/types';
import{organograma,type NoDoOrganograma}from'@/lib/simulation/hierarquia';

/**
 * Quem é quem, e quem responde a quem.
 *
 * O desenho antigo era uma fila: um nome em cima, todo o resto numa linha
 * embaixo. Quando o caso tem gente de fora da empresa -- um escritório
 * contratado, um fornecedor -- essa fila afirma uma subordinação que não existe,
 * e justamente onde a fronteira entre as organizações é o assunto.
 */
function No({no}:{no:NoDoOrganograma}){
 return <li className="org-no">
  <div className={'org-node'+(no.euMesmo?' you':'')}>
   <b>{no.nome}</b><span>{no.papel}</span>
   {no.respondeA&&<small className="org-responde">responde a {no.respondeA}</small>}
  </div>
  {no.filhos.length>0&&<ul className="org-filhos">{no.filhos.map(f=><No no={f} key={f.id}/>)}</ul>}
 </li>;
}

export function OrgScreen({characters,seatRole,organizacao}:{characters:Character[];seatRole:string;organizacao?:string}){
 const blocos=organograma(characters,seatRole,organizacao);
 const varios=blocos.length>1;
 return <section className="panel">
  <div className="eyebrow">PESSOAS</div>
  <h2>Quem é quem</h2>
  {varios&&<p className="muted">Nem todo mundo aqui é da mesma organização. Quem está fora dela responde a outra cadeia de comando — e não à sua.</p>}
  <div className={'org-blocos'+(varios?' varios':'')}>
   {blocos.map(bloco=><div className={'org-bloco'+(bloco.deCasa?' casa':'')} key={bloco.org||'casa'}>
    {bloco.org&&<div className="org-titulo"><Building2 size={15}/>{bloco.org}
     {!bloco.deCasa&&<span className="tag">fora da empresa</span>}</div>}
    <ul className="org-arvore">{bloco.raizes.map(r=><No no={r} key={r.id}/>)}</ul>
   </div>)}
  </div>
 </section>;
}
