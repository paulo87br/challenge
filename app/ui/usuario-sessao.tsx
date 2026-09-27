'use client';
/**
 * Quem está logado e como sair.
 *
 * O formulário é um POST de verdade para /auth/signout, não um fetch: sair é
 * das poucas ações que precisam funcionar mesmo quando o JavaScript da página
 * quebrou, que é justamente quando alguém quer sair.
 */
import{LogOut}from'lucide-react';
import{iniciais}from'@/lib/mundo/usuario';

export function UsuarioSessao({nome,email,compacto}:{nome:string;email?:string;compacto?:boolean}){
 return <form className={'usuario-sessao'+(compacto?' compacto':'')} method="post" action="/auth/signout">
  <span className="usuario-marca" aria-hidden>{iniciais(nome)}</span>
  <span className="usuario-quem">
   <b>{nome}</b>
   {email&&<small title={email}>{email}</small>}
  </span>
  <button type="submit" className="btn usuario-sair" title="Sair da conta">
   <LogOut size={15}/><span className="usuario-sair-rotulo">Sair</span>
  </button>
 </form>;
}
