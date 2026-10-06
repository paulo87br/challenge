'use client';
/**
 * Entra no mundo e sai do caminho. Desde que cada mundo tem a sua corrida, não
 * há mais nada a decidir aqui: o código leva à sessão daquele mundo, retomada
 * se já existir. A tela só aparece quando algo falha.
 */
import{useEffect,useRef,useState}from'react';
import{useRouter}from'next/navigation';
import{clearSession,loadSession}from'@/lib/simulation/persistence';
import type{MundoNoAr}from'@/lib/mundo/tipos';


export function Entrar({mundo}:{mundo:MundoNoAr}){
 const router=useRouter();
 const[erro,setErro]=useState('');
 const[indo,setIndo]=useState(true);
 // Em desenvolvimento o React monta duas vezes, e sem isto a segunda montagem
 // abre uma segunda sessão e abandona a primeira recém-criada.
 const jaPediu=useRef(false);

 async function entrar(){
  setIndo(true);setErro('');
  try{
   const r=await fetch('/api/session/entrar',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({codigo:mundo.join_code})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.detail||data.erro||`HTTP ${r.status}`);
   // O navegador guarda a corrida anterior. Se o código levou a outra sessão, o
   // estado local é de outro mundo e serviria o mundo antigo por cima do novo.
   // Sendo a mesma, preservá-lo guarda o que só vive aqui -- o que já foi lido,
   // o rascunho na tela.
   if(loadSession()?.sessionId&&loadSession()?.sessionId!==data?.session?.id)clearSession();
   router.replace('/lab');
  }catch(problema){setErro(problema instanceof Error?problema.message:'Não foi possível entrar.');setIndo(false)}
 }

 useEffect(()=>{if(jaPediu.current)return;jaPediu.current=true;entrar()},[]);

 return <main className="entrada">
  <div className="entrada-caixa">
   <div className="brand"><span className="brand-mark">C</span>Challenge</div>
   <h1>{mundo.title}</h1>
   <p className="muted">{[mundo.domain,mundo.seat_role].filter(Boolean).join(' · ')}</p>
   {erro
    ?<><div className="runtime-error">{erro}</div>
       <button className="btn primary" onClick={()=>entrar()}>Tentar de novo</button></>
    :<p className="entrada-indo"><span className="queue-spinner"/>Preparando seu mundo…</p>}
  </div>
 </main>;
}
