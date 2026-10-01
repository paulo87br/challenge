'use client';
import{Coins}from'lucide-react';
import{PRECOS,VOZ_FONTE,VOZ_POR_MINUTO,custoDeTokens,custoDeVoz}from'@/lib/ai/precos';

export type UsoPorModelo={model:string;provider:string;turnos:number;entrada:number;saida:number};
export type UsoDeVoz={chamadas:number;segundos:number};

const dinheiro=(v:number)=>`US$ ${v.toFixed(v<1?3:2)}`;

/**
 * O que esta turma consumiu.
 *
 * O texto é desprezível e a voz é quem decide a conta: numa sessão medida, US$
 * 0,03 de turnos contra US$ 1,03 de ligação. Sem esta tela, isso só aparecia na
 * fatura, depois da aula.
 */
export function Custo({modelos,voz,pessoas,rotulo}:{
 modelos:UsoPorModelo[];voz:UsoDeVoz;pessoas:number;rotulo:string}){
 const linhas=modelos.map(m=>({...m,custo:custoDeTokens(m.model,m.entrada,m.saida)}));
 const texto=linhas.reduce((t,l)=>t+(l.custo||0),0);
 const semPreco=linhas.filter(l=>l.custo===null);
 const vozCusto=custoDeVoz(voz.segundos);
 const total=texto+vozCusto;
 const minutos=voz.segundos/60;
 const porPessoa=pessoas>0?total/pessoas:0;

 return <section className="panel">
  <div className="studio-head">
   <div><div className="eyebrow">CONSUMO</div><h2>O que {rotulo} custou até agora</h2>
   <p className="muted">Estimativa a partir do que ficou gravado: tokens de cada turno e segundos de cada ligação. Não é a fatura — é o que dá para somar daqui.</p></div>
   <div className="custo-total"><Coins size={17}/><b>{dinheiro(total)}</b>
    {pessoas>0&&<small>{dinheiro(porPessoa)} por pessoa</small>}</div>
  </div>

  <div className="custo-partes">
   <div className="custo-parte">
    <div className="eyebrow">VOZ</div>
    <b>{dinheiro(vozCusto)}</b>
    <small className="muted">{voz.chamadas} {voz.chamadas===1?'ligação':'ligações'} · {minutos.toFixed(1)} min · {dinheiro(VOZ_POR_MINUTO)}/min</small>
    {total>0&&<span className="custo-fatia" style={{width:`${Math.round(vozCusto/total*100)}%`}} aria-hidden/>}
    {total>0&&<small className="muted">{Math.round(vozCusto/total*100)}% da conta</small>}
   </div>
   <div className="custo-parte">
    <div className="eyebrow">TEXTO</div>
    <b>{dinheiro(texto)}</b>
    <small className="muted">{linhas.reduce((t,l)=>t+l.turnos,0)} turnos</small>
    {total>0&&<span className="custo-fatia texto" style={{width:`${Math.round(texto/total*100)}%`}} aria-hidden/>}
    {total>0&&<small className="muted">{Math.round(texto/total*100)}% da conta</small>}
   </div>
  </div>

  {linhas.length>0&&<div className="people-table custo-tabela">
   <div className="people-row people-header"><span>Modelo</span><span>Turnos</span><span>Entrada</span><span>Saída</span><span>Custo</span></div>
   {linhas.map(l=><div className="people-row" key={l.provider+l.model}>
    <span className="people-who"><b>{l.model||'(sem modelo)'}</b><small>{l.provider}</small></span>
    <span>{l.turnos}</span>
    <span>{l.entrada.toLocaleString('pt-BR')}</span>
    <span>{l.saida.toLocaleString('pt-BR')}</span>
    <span>{l.custo===null?<span className="muted">preço não configurado</span>:dinheiro(l.custo)}</span>
   </div>)}
  </div>}

  {semPreco.length>0&&<p className="muted custo-aviso">
   {semPreco.length===1?'Um modelo não tem preço configurado':`${semPreco.length} modelos não têm preço configurado`} e
   ficou de fora do total: {semPreco.map(l=>l.model).join(', ')}. Preferi mostrar os tokens sem cifra a estimar por semelhança.
  </p>}

  <p className="muted custo-aviso">
   Preços usados: {Object.entries(PRECOS).map(([m,p])=>`${m} US$ ${p.entrada}/${p.saida} por 1M`).join(' · ')}
   {' · '}voz {dinheiro(VOZ_POR_MINUTO)}/min ({VOZ_FONTE}). Quando a fatura divergir, é <code>lib/ai/precos.ts</code> que se corrige.
  </p>
 </section>;
}
