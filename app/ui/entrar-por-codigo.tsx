'use client';
/**
 * O campo do código. Quatro caracteres, monoespaçado e grande, porque quem
 * digita está lendo de um projetor ou de uma mensagem e conferindo caractere a
 * caractere. Aceita o link inteiro colado — ver lib/mundo/codigo.
 */
import{useState}from'react';
import{useRouter}from'next/navigation';
import{ArrowRight}from'lucide-react';
import{TAMANHO,codigoValido,normalizaCodigo}from'@/lib/mundo/codigo';

export function EntrarPorCodigo({rotulo='Código do mundo',autoFocus=false}:{rotulo?:string;autoFocus?:boolean}){
 const router=useRouter();
 const[valor,setValor]=useState('');
 const[indo,setIndo]=useState(false);
 const pronto=codigoValido(valor);
 function enviar(){
  if(!pronto||indo)return;
  setIndo(true);
  router.push(`/e/${normalizaCodigo(valor)}`);
 }
 return <form className="codigo-form" onSubmit={evento=>{evento.preventDefault();enviar()}}>
  <label className="campo">
   <span>{rotulo}</span>
   <input className="input codigo-input" value={valor} autoFocus={autoFocus}
    inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false}
    maxLength={80} placeholder={'•'.repeat(TAMANHO)} aria-label={rotulo}
    onChange={evento=>setValor(normalizaCodigo(evento.target.value))}/>
  </label>
  <button type="submit" className="btn primary" disabled={!pronto||indo}>
   {indo?'Entrando…':'Entrar'}<ArrowRight size={16}/></button>
 </form>;
}
