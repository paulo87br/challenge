import Link from 'next/link';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{defaultScenario}from'@/lib/simulation/scenario';
import{buildProfile}from'@/lib/simulation/profile';
import{NoAccess}from'../no-access';
import{PrintButton}from'../print-button';

export const dynamic='force-dynamic';
export const metadata={title:'Turma · Challenge'};

export default async function Turma(){
 const supabase=createSupabaseServerClient();
 if(!supabase)return <NoAccess reason="Supabase não está configurado neste ambiente."/>;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return <NoAccess reason="Entre com a sua conta para continuar."/>;
 const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
 if(!isInstructor)return <NoAccess reason="Sua conta não está na lista de instrutores deste Challenge."/>;

 const[{data:sessions},{data:evidence},{data:telemetry},{data:scenarioRow}]=await Promise.all([
  supabase.from('challenge_sessions').select('id,user_id,status,started_at,updated_at,debrief').order('updated_at',{ascending:false}),
  supabase.from('challenge_evidence').select('session_id,competency,polarity,confidence'),
  supabase.from('challenge_telemetry').select('session_id'),
  supabase.from('challenge_scenarios').select('title,competencies').eq('key','atlas').maybeSingle()
 ]);
 const framework=(scenarioRow?.competencies?.length?scenarioRow.competencies:defaultScenario.competencies) as any[];

 const admin=createSupabaseAdminClient();
 const people=admin?(await admin.auth.admin.listUsers({perPage:200})).data?.users||[]:[];
 const emailOf=(id:string)=>people.find(person=>person.id===id)?.email||id;

 const rows=(sessions||[]).map(session=>{
  const mine=(evidence||[]).filter(signal=>signal.session_id===session.id);
  return{id:session.id,email:emailOf(session.user_id),status:session.status,
   actions:(telemetry||[]).filter(entry=>entry.session_id===session.id).length,
   hasDebrief:Boolean(session.debrief),
   profile:buildProfile(framework,mine as any[]),
   signals:mine.length};
 }).filter(row=>row.actions>0||row.signals>0);

 // Where the class as a whole went, and where it did not. A competency nobody
 // touched says something about the scenario, not about the students.
 const coverage=framework.map((competency:any)=>{
  const withSignal=rows.filter(row=>row.profile.find(entry=>entry.code===competency.code)?.signals);
  const total=rows.reduce((sum,row)=>sum+(row.profile.find(entry=>entry.code===competency.code)?.signals||0),0);
  const risks=rows.reduce((sum,row)=>sum+(row.profile.find(entry=>entry.code===competency.code)?.risk||0),0);
  return{...competency,students:withSignal.length,signals:total,risks};
 }).sort((a,b)=>b.students-a.students);

 const csv=[['pessoa','acoes','sinais','debrief',...framework.map((c:any)=>c.code)].join(','),
  ...rows.map(row=>[row.email,row.actions,row.signals,row.hasDebrief?'sim':'nao',
   ...framework.map((c:any)=>row.profile.find(entry=>entry.code===c.code)?.signals||0)].join(','))].join('\n');

 return <main className="painel">
  <header className="painel-head no-print">
   <div><Link href="/painel" className="btn">← Sessões</Link>
   <h1 className="h1" style={{marginTop:14}}>A turma</h1>
   <p className="muted">{rows.length} pessoa(s) que agiram no mundo · {scenarioRow?.title||'Challenge'}</p></div>
   <PrintButton csv={csv} filename="challenge-turma.csv"/>
  </header>
  <div className="print-only print-head"><h1>{scenarioRow?.title||'Challenge'} — relatório da turma</h1>
   <p>{rows.length} participantes · gerado em {new Date().toLocaleString('pt-BR')}</p></div>

  <section className="panel"><h2>Cobertura por competência</h2>
   <p className="muted">Quantas pessoas produziram evidência de cada competência. Competência sem ninguém diz respeito ao caminho que o cenário ofereceu — não a uma falha da turma.</p>
   <div className="coverage">{coverage.map(entry=>{
    const share=rows.length?Math.round(100*entry.students/rows.length):0;
    return <div className="coverage-row" key={entry.code}>
     <span className="coverage-name"><b>{entry.name}</b><small>{entry.students} de {rows.length} pessoas · {entry.signals} sinais{entry.risks?` · ${entry.risks} de risco`:''}</small></span>
     <span className="coverage-bar"><span className={'coverage-fill '+(share===0?'empty':'')} style={{width:`${Math.max(share,share?4:0)}%`}}/></span>
     <span className="coverage-share">{share}%</span>
    </div>;
   })}</div>
  </section>

  <section className="panel"><h2>Pessoa por pessoa</h2>
   {rows.length===0&&<p className="muted">Ninguém agiu no mundo ainda.</p>}
   {rows.length>0&&<div className="class-table">
    <div className="class-row class-header"><span>Pessoa</span><span>Ações</span><span>Sinais</span>
     {framework.map((c:any)=><span key={c.code} className="class-comp" title={c.name}>{c.name}</span>)}</div>
    {rows.map(row=><div className="class-row" key={row.id}>
     <span className="class-who"><Link href={`/painel/${row.id}`}>{row.email}</Link>
      {row.hasDebrief&&<b className="tag">debrief</b>}</span>
     <span>{row.actions}</span><span>{row.signals}</span>
     {framework.map((c:any)=>{const cell=row.profile.find(entry=>entry.code===c.code);
      return <span key={c.code} className={'class-cell '+(cell?.risk?'risk':cell?.signals?'has':'')}>{cell?.signals||'·'}</span>})}
    </div>)}
   </div>}
  </section>
 </main>;
}
