'use client';
/**
 * O briefing é a única tela que fala de fora do mundo.
 *
 * Ele era um arquivo no acervo da empresa, ao lado da decisão do tribunal e do
 * contrato. Além de não ser um documento que exista naquela organização, ele
 * explica como a plataforma funciona — e isso não cabe dentro da ficção. Aqui é
 * uma tela própria, com a cara de quem abre o Challenge, não de quem abre uma
 * pasta.
 */
import{Compass}from'lucide-react';
import type{WorldState}from'@/lib/simulation/types';
import{briefingDoMundo}from'@/lib/simulation/briefing';

export function BriefingScreen({world,onComecar,pronto}:{world:WorldState;onComecar:()=>void;pronto:boolean}){
 // Até o mundo do servidor chegar, o que existe na tela é o mundo compilado --
 // outro caso, outro elenco, outra missão. Enquanto o briefing era um arquivo
 // isso passava despercebido; sendo a primeira tela, seria a primeira coisa que
 // a pessoa lê, e estaria errada.
 if(!pronto)return <section className="panel briefing">
  <div className="briefing-topo"><Compass size={22}/>
   <div><div className="eyebrow">ANTES DE COMEÇAR</div><h2>Preparando seu mundo…</h2></div></div>
  <p className="muted briefing-esperando"><span className="queue-spinner"/>Montando o caso, as pessoas e o que já está em mãos.</p>
 </section>;
 const briefing=briefingDoMundo(world);
 const secoes=briefing.body.split(/\n\n(?=[A-ZÀ-Ú][A-ZÀ-Ú ,]{3,}\n)/);

 return <section className="panel briefing">
  <div className="briefing-topo">
   <Compass size={22}/>
   <div><div className="eyebrow">ANTES DE COMEÇAR</div><h2>{world.title}</h2></div>
  </div>
  <div className="briefing-corpo">{secoes.map((bloco,i)=>{
   const[titulo,...resto]=bloco.split('\n');
   const corpo=resto.join('\n').trim();
   const ehTitulo=/^[A-ZÀ-Ú][A-ZÀ-Ú ,]{3,}$/.test(titulo.trim());
   return <div className="briefing-bloco" key={i}>
    {ehTitulo?<><h3>{titulo.trim()}</h3>{corpo.split('\n').filter(Boolean).map((linha,j)=><p key={j}>{linha}</p>)}</>
     :bloco.split('\n').filter(Boolean).map((linha,j)=><p key={j}>{linha}</p>)}
   </div>;
  })}</div>
  <button className="btn primary briefing-ir" onClick={onComecar}>Entrar no mundo</button>
 </section>;
}
