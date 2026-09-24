'use client';
import{useState}from'react';import{createSupabaseBrowserClient}from'@/lib/supabase/client';
type Provider='google'|'azure';
export function LoginButtons({next,initialError}:{next:string;initialError:string}){
 const[busy,setBusy]=useState<Provider|null>(null);const[error,setError]=useState(initialError);
 async function signIn(provider:Provider){
  const supabase=createSupabaseBrowserClient();
  if(!supabase){setError('Supabase ainda não está configurado neste ambiente.');return}
  setBusy(provider);setError('');
  const{error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:`${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,scopes:provider==='azure'?'email':undefined}});
  if(error){setError(error.message);setBusy(null)}
 }
 return <>{error&&<div className="runtime-error">{error}</div>}<div className="login-actions">
  <button className="btn primary" disabled={busy!==null} onClick={()=>signIn('google')}>{busy==='google'?'Abrindo…':'Entrar com Google'}</button>
  <button className="btn" disabled={busy!==null} onClick={()=>signIn('azure')}>{busy==='azure'?'Abrindo…':'Entrar com Microsoft'}</button>
 </div></>;
}
