'use client';
import{useState}from'react';import type{FormEvent}from'react';import{createSupabaseBrowserClient}from'@/lib/supabase/client';
type Provider='google'|'azure';

export function LoginButtons({next,initialError,url,publishableKey}:{next:string;initialError:string;url:string;publishableKey:string}){
 const[busy,setBusy]=useState<Provider|'email'|null>(null);
 const[error,setError]=useState(initialError);
 const[email,setEmail]=useState('');
 const[sent,setSent]=useState('');

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
  {error&&<div className="runtime-error">{error}</div>}
  <div className="login-actions">
   <button className="btn primary" disabled={busy!==null} onClick={()=>signIn('google')}>{busy==='google'?'Abrindo…':'Entrar com Google'}</button>
   <button className="btn" disabled={busy!==null} onClick={()=>signIn('azure')}>{busy==='azure'?'Abrindo…':'Entrar com Microsoft'}</button>
  </div>
  <div className="login-divider"><span>ou</span></div>
  <form className="login-email" onSubmit={signInWithEmail}>
   <input className="input" type="email" required value={email} onChange={event=>setEmail(event.target.value)}
    placeholder="seu@email.com" aria-label="Seu e-mail" autoComplete="email"/>
   <button className="btn" type="submit" disabled={busy!==null}>{busy==='email'?'Enviando…':'Receber link por e-mail'}</button>
  </form>
 </>;
}
