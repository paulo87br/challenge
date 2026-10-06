'use client';
import{useState}from'react';import{Mail}from'lucide-react';import{recadoDeEntrada}from'@/lib/auth/recados';import type{FormEvent}from'react';import{createSupabaseBrowserClient}from'@/lib/supabase/client';
type Provider='google'|'azure';

export function LoginButtons({next,initialError,url,publishableKey}:{next:string;initialError:string;url:string;publishableKey:string}){
 const[busy,setBusy]=useState<Provider|'email'|null>(null);
 const[error,setError]=useState(initialError);
 const[email,setEmail]=useState('');
 const[sent,setSent]=useState('');
 // O caminho do e-mail deixou de ficar aberto na cara de quem chega. Numa turma
 // inteira ele é a pior porta: a cota do serviço é baixa, estoura para todo
 // mundo de uma vez, e o SSO ao lado resolve na hora. Quem não tem conta Google
 // nem Microsoft continua tendo o caminho, a um clique.
 const[mostrarEmail,setMostrarEmail]=useState(false);
 const recado=recadoDeEntrada(error);

 function client(){
  const supabase=createSupabaseBrowserClient(url,publishableKey);
  if(!supabase)setError('Supabase ainda não está configurado neste ambiente.');
  return supabase;
 }
 function redirectTo(){return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`}

 async function signIn(provider:Provider){
  const supabase=client();if(!supabase)return;
  setBusy(provider);setError('');setSent('');
  const{error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:redirectTo(),scopes:provider==='azure'?'email':undefined}});
  if(error){setError(error.message);setBusy(null)}
 }
 async function signInWithEmail(event:FormEvent){
  event.preventDefault();
  const address=email.trim();if(!address)return;
  const supabase=client();if(!supabase)return;
  setBusy('email');setError('');setSent('');
  const{error}=await supabase.auth.signInWithOtp({email:address,options:{emailRedirectTo:redirectTo()}});
  if(error)setError(error.message);
  else setSent(address);
  setBusy(null);
 }

 if(sent)return <div className="login-sent">
  <b>Link enviado para {sent}</b>
  <p className="muted">Abra o e-mail <b>neste mesmo navegador</b> e clique no link para entrar. Ele vale por uma hora.</p>
  <button className="btn" onClick={()=>{setSent('');setEmail('')}}>Usar outro acesso</button>
 </div>;

 return <>
  {recado.texto&&<div className="runtime-error">{recado.texto}</div>}
  <div className={'login-actions'+(recado.sugereSSO?' login-urgente':'')}>
   <button className="btn primary" disabled={busy!==null} onClick={()=>signIn('google')}>{busy==='google'?'Abrindo…':'Entrar com Google'}</button>
   <button className="btn" disabled={busy!==null} onClick={()=>signIn('azure')}>{busy==='azure'?'Abrindo…':'Entrar com Microsoft'}</button>
  </div>
  {!mostrarEmail
   ?<button type="button" className="login-outro" onClick={()=>setMostrarEmail(true)}>
      <Mail size={15}/>Não tenho nenhuma das duas</button>
   :<>
     <div className="login-divider"><span>ou</span></div>
     <form className="login-email" onSubmit={signInWithEmail}>
      <input className="input" type="email" required value={email} onChange={event=>setEmail(event.target.value)}
       placeholder="seu@email.com" aria-label="Seu e-mail" autoComplete="email" autoFocus/>
      <button className="btn" type="submit" disabled={busy!==null}>{busy==='email'?'Enviando…':'Receber link por e-mail'}</button>
      <small className="muted">O link depende do serviço de e-mail e tem cota baixa. Numa turma, Google ou Microsoft é mais rápido e não falha.</small>
     </form>
    </>}
 </>;
}
