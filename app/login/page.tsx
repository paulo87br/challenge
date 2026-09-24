import{LoginButtons}from'./login-buttons';
export const metadata={title:'Entrar · Challenge'};
export default function Login({searchParams}:{searchParams:{next?:string;error?:string}}){
 const next=searchParams.next?.startsWith('/')?searchParams.next:'/lab';
 return <main className="login-shell"><section className="panel login-card">
  <div className="brand"><span className="brand-mark">C</span>Challenge</div>
  <div className="eyebrow" style={{marginTop:22}}>ENTRE NO MUNDO</div>
  <h1 className="h1">Seu lugar na história</h1>
  <p className="muted">Você vai ocupar um assento dentro de uma organização simulada. Entre com a conta que você usa no trabalho ou na faculdade.</p>
  <LoginButtons next={next} initialError={searchParams.error?'Não foi possível concluir o login. Tente de novo.':''}/>
  <small className="muted">Usamos sua conta apenas para separar o seu mundo do mundo das outras pessoas.</small>
 </section></main>;
}
