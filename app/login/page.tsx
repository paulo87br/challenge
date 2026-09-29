import{LoginButtons}from'./login-buttons';import{supabaseEnv}from'@/lib/supabase/env';import{motivoDoLogin}from'@/lib/mundo/erros-de-login';
export const metadata={title:'Entrar · Challenge'};
export default function Login({searchParams}:{searchParams:{next?:string;error?:string;erro?:string;detalhe?:string}}){
 const env=supabaseEnv();
 const next=searchParams.next?.startsWith('/')?searchParams.next:'/lab';
 // 'error' é o parâmetro antigo, de antes do callback saber dizer o motivo:
 // um link velho no histórico de alguém não pode virar uma tela sem explicação.
 const motivo=motivoDoLogin(searchParams.erro||(searchParams.error?'sem_codigo':null),searchParams.detalhe);
 return <main className="login-shell"><section className="panel login-card">
  <div className="brand"><span className="brand-mark">C</span>Challenge</div>
  <div className="eyebrow" style={{marginTop:22}}>ENTRE NO MUNDO</div>
  <h1 className="h1">Seu lugar na história</h1>
  <p className="muted">Você vai ocupar um assento dentro de uma organização simulada. Entre com a conta que você usa no trabalho ou na faculdade.</p>
  {motivo&&<div className="login-motivo">
   <b>{motivo.titulo}</b>
   <span>{motivo.detalhe}</span>
  </div>}
  <LoginButtons next={next} url={env?.url||''} publishableKey={env?.publishableKey||''} initialError=""/>
  <small className="muted">Usamos sua conta apenas para separar o seu mundo do mundo das outras pessoas.</small>
 </section></main>;
}
