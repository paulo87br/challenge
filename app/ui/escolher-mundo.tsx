'use client';
/**
 * Quando há mais de um mundo no ar, escolher é da pessoa. A lista existe para
 * quem já está dentro e abriu o /lab direto; o código e o link existem para
 * quem chega pela aula. Os dois caminhos levam ao mesmo lugar.
 */
import Link from'next/link';
import{ArrowRight}from'lucide-react';
import{EntrarPorCodigo}from'./entrar-por-codigo';
import type{MundoNoAr}from'@/lib/mundo/tipos';
import{UsuarioSessao}from'./usuario-sessao';

export function EscolherMundo({mundos,titulo='Em qual mundo você vai entrar?',descricao,faltaMigracao,usuario}:{
 mundos:MundoNoAr[];titulo?:string;descricao?:string;faltaMigracao?:boolean;
 usuario?:{nome:string;email:string}|null}){
 return <main className="entrada">
  <div className="entrada-caixa">
   <div className="brand"><span className="brand-mark">C</span>Challenge</div>
   <h1>{titulo}</h1>
   {descricao&&<p className="muted">{descricao}</p>}
   {faltaMigracao&&<div className="runtime-error">O banco ainda não tem os códigos de acesso.
    Quem cuida do Challenge precisa rodar a migração 016.</div>}

   {mundos.length===0
    ?<p className="muted">Nenhum mundo está no ar agora. Quem conduz a aula coloca um no ar pelo Studio.</p>
    :<div className="mundo-lista">{mundos.map(mundo=>{
      const destino=mundo.join_code?`/e/${mundo.join_code}`:'';
      const conteudo=<>
       <span className="mundo-nome"><b>{mundo.title}</b>
        <small>{[mundo.domain,mundo.seat_role].filter(Boolean).join(' · ')}</small></span>
       {mundo.join_code&&<span className="mundo-codigo">{mundo.join_code}</span>}
       <ArrowRight size={18}/></>;
      return destino
       ?<Link className="mundo-card" href={destino} key={mundo.key}>{conteudo}</Link>
       :<div className="mundo-card indisponivel" key={mundo.key}>{conteudo}</div>;
     })}</div>}

   <div className="entrada-ou"><span>ou digite o código</span></div>
   <EntrarPorCodigo autoFocus={mundos.length===0}/>
   {usuario&&<UsuarioSessao nome={usuario.nome} email={usuario.email}/>}
  </div>
 </main>;
}
