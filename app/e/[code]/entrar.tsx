'use client';
/**
 * Entra no mundo e sai do caminho. A tela só aparece de verdade nos dois casos
 * em que há algo a resolver: uma corrida já em andamento em outro mundo, ou uma
 * falha. Nos outros, é uma piscada antes do /lab.
 */
import{useEffect,useRef,useState}from'react';
import{useRouter}from'next/navigation';
import{ArrowRight}from'lucide-react';
import{clearSession}from'@/lib/simulation/persistence';
import type{MundoNoAr}from'@/lib/mundo/tipos';

type Conflito={atual:{key:string;title:string};novo:{key:string;title:string}};

export function Entrar({mundo}:{mundo:MundoNoAr}){
 const router=useRouter();
 const[conflito,setConflito]=useState<Conflito|null>(null);
 const[erro,setErro]=useState('');
 const[indo,setIndo]=useState(true);
 // Em desenvolvimento o React monta duas vezes, e sem isto a segunda montagem
 // abre uma segunda sessão e abandona a primeira recém-criada.
 const jaPediu=useRef(false);

 async function entrar(abandonarAtual:boolean){
  setIndo(true);setErro('');
  try{
   const r=await fetch('/api/session/entrar',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({codigo:mundo.join_code,abandonarAtual})});
   const data=await r.json();
   if(r.status===409&&data.conflito){setConflito(data.conflito);setIndo(false);return}
   if(!r.ok)throw new Error(data.detail||data.erro||`HTTP ${r.status}`);
   // O navegador guarda a corrida anterior; entrar em outro mundo sem limpar
   // faria o /lab servir o mundo antigo por cima da sessão nova.
   if(abandonarAtual)clearSession();
   router.replace('/lab');
  }catch(problema){setErro(problema instanceof Error?problema.message:'Não foi possível entrar.');setIndo(false)}
 }

 useEffect(()=>{if(jaPediu.current)return;jaPediu.current=true;entrar(false)},[]);

 return <main className="entrada">
  <div className="entrada-caixa">
   <div className="brand"><span className="brand-mark">C</span>Challenge</div>
   {conflito
    ?<>
      <h1>Você já está no meio de um desafio</h1>
      <p className="muted">Está em <b>{conflito.atual.title}</b> e o código abre <b>{conflito.novo.title}</b>.
       Entrar no novo encerra o atual — ele fica registrado para quem conduz a aula, mas você não volta para ele.</p>
      <div className="entrada-acoes">
       <button className="btn primary" onClick={()=>router.replace('/lab')}>
        Continuar em {conflito.atual.title}<ArrowRight size={16}/></button>
       <button className="btn perigo" disabled={indo} onClick={()=>entrar(true)}>
        {indo?'Entrando…':`Encerrar e entrar em ${conflito.novo.title}`}</button>
      </div>
     </>
    :<>
      <h1>{mundo.title}</h1>
      <p className="muted">{[mundo.domain,mundo.seat_role].filter(Boolean).join(' · ')}</p>
      {erro
       ?<><div className="runtime-error">{erro}</div>
          <button className="btn primary" onClick={()=>entrar(false)}>Tentar de novo</button></>
       :<p className="entrada-indo"><span className="queue-spinner"/>Preparando seu mundo…</p>}
     </>}
  </div>
 </main>;
}
