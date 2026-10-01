import Link from'next/link';
import{Flag,LayoutDashboard,Users}from'lucide-react';

/**
 * Os três lugares do instrutor, em todos eles.
 *
 * Antes o Studio não levava a lugar nenhum: para ler uma sessão era preciso
 * abrir "Quem entrou", achar a pessoa e clicar em Abrir, e só de dentro da
 * sessão aparecia o caminho para a lista. "Ver a turma" existia num único
 * botão, dentro de Sessões, que por sua vez não tinha link de entrada.
 */
const LUGARES=[
 {href:'/admin',label:'Studio',Icon:LayoutDashboard},
 {href:'/painel',label:'Sessões',Icon:Flag},
 {href:'/painel/turma',label:'Turma',Icon:Users},
];

export function NavInstrutor({atual}:{atual:'/admin'|'/painel'|'/painel/turma'}){
 return <nav className="nav-instrutor" aria-label="Áreas do instrutor">
  {LUGARES.map(({href,label,Icon})=>
   <Link key={href} href={href} className={'nav-instrutor-item'+(href===atual?' atual':'')}
    aria-current={href===atual?'page':undefined}>
    <Icon size={15}/>{label}
   </Link>)}
 </nav>;
}
