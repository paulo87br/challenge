'use client';
/**
 * O mundo ligando para você.
 *
 * Antes isto era um pontinho na barra lateral: o mundo tomava iniciativa e a
 * pessoa só descobria se estivesse olhando para a aba certa. Uma ligação
 * interrompe — é disso que ela é feita — então ela toma a tela e pergunta.
 */
import{useEffect}from'react';
import{Phone,PhoneOff}from'lucide-react';
import{iniciarToque,pararToque}from'@/lib/som';
import type{Character}from'@/lib/simulation/types';

export function ChamadaEntrando({quem,texto,onAtender,onRecusar}:{
 quem?:Character;texto:string;onAtender:()=>void;onRecusar:()=>void}){
 useEffect(()=>{iniciarToque();return()=>pararToque()},[]);
 const iniciais=(quem?.name||'?').split(/\s+/).map(p=>p[0]).slice(0,2).join('').toLocaleUpperCase();
 return <div className="veu chamada-veu">
  <div className="chamada-card" role="dialog" aria-modal="true" aria-label={`Chamada de ${quem?.name||'alguém'}`}>
   <span className="chamada-pulso" aria-hidden><span className="person-avatar chamada-avatar">{iniciais}</span></span>
   <div className="eyebrow">LIGAÇÃO RECEBIDA</div>
   <h2>{quem?.name||'Alguém da organização'}</h2>
   {quem?.role&&<p className="muted">{quem.role}</p>}
   {texto&&<p className="chamada-motivo">{texto}</p>}
   <div className="chamada-acoes">
    <button className="btn perigo" onClick={()=>{pararToque();onRecusar()}}><PhoneOff size={17}/>Recusar</button>
    <button className="btn atender" onClick={()=>{pararToque();onAtender()}}><Phone size={17}/>Atender</button>
   </div>
   <small className="muted">Recusar não some com o assunto: quem ligou volta de outro jeito.</small>
  </div>
 </div>;
}
