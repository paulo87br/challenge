export function NoAccess({reason}:{reason:string}){
 return <main className="login-shell"><section className="panel login-card">
  <div className="brand"><span className="brand-mark">C</span>Challenge</div>
  <div className="eyebrow" style={{marginTop:20}}>PAINEL DO INSTRUTOR</div>
  <h1 className="h1">Sem acesso</h1>
  <p className="muted">{reason}</p>
 </section></main>;
}
