import Link from 'next/link';
import{quando}from'@/lib/mundo/quando';
import{NavInstrutor}from'@/app/ui/nav-instrutor';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{defaultScenario}from'@/lib/simulation/scenario';
import{buildProfile}from'@/lib/simulation/profile';import{todasAsLinhas}from'@/lib/supabase/paginar';import{SeletorDeMundo}from'./seletor-de-mundo';
import{NoAccess}from'../no-access';
import{PrintButton}from'../print-button';

export const dynamic='force-dynamic';
export const metadata={title:'Turma · Challenge'};

export default async function Turma({searchParams}:{searchParams?:{cenario?:string}}){
 const supabase=createSupabaseServerClient();
 if(!supabase)return <NoAccess reason="Supabase não está configurado neste ambiente."/>;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return <NoAccess reason="Entre com a sua conta para continuar."/>;
 const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
 if(!isInstructor)return <NoAccess reason="Sua conta não está na lista de instrutores deste Challenge."/>;

 // Qual turma. Sem recorte, a tela somava tudo que já existiu no banco -- o
 // teste de quem conduz, a corrida de um colega e a aula inteira na mesma
 // média. Hoje "turma" é o mundo em que as pessoas sentaram; quando turma e
 // aplicação virarem coisas próprias, é aqui que o recorte muda.
 const pedido=typeof searchParams?.cenario==='string'?searchParams.cenario:'';
 const{data:mundosRows}=await supabase.from('challenge_scenarios')
  .select('key,title,active,competencies').eq('is_template',false).order('active',{ascending:false}).order('title');
 const mundos=mundosRows||[];

 const{linhas:todasSessoes,completo:sessoesInteiras}=await todasAsLinhas<any>(()=>
  supabase.from('challenge_sessions').select('id,user_id,status,scenario_key,started_at,updated_at,debrief').order('started_at'));
 const porMundo=(k:string)=>todasSessoes.filter(s=>s.scenario_key===k);
 // Sem pedido explícito: o mundo no ar com gente; senão, o do grupo mais
 // recente. Abrir a tela num mundo vazio não ajuda ninguém.
 const escolhido=mundos.find(m=>m.key===pedido)
  ||mundos.find(m=>m.active&&porMundo(m.key).length)
  ||mundos.map(m=>({m,ultima:porMundo(m.key).slice(-1)[0]?.started_at||''}))
     .sort((a,b)=>b.ultima.localeCompare(a.ultima))[0]?.m
  ||mundos[0];
 const chave=escolhido?.key||'';
 const sessions=porMundo(chave);
 const idsDaTurma=new Set(sessions.map(s=>s.id));

 // A régua é a do cenário que a turma jogou. Estava fixa no 'atlas': a turma do
 // jurídico era medida com nove competências que a evidência dela não tem --
 // zero de oito em comum, e a tela mostrava 0% em tudo sem dar erro.
 const framework=((escolhido?.competencies as any[])?.length?escolhido!.competencies:defaultScenario.competencies) as any[];

 // Paginado: o PostgREST corta em mil linhas e não avisa. Uma turma de 26
 // pessoas passou de 1977 evidências, e quem tinha 127 sinais aparecia com 0.
 const[ev,tl]=await Promise.all([
  todasAsLinhas<any>(()=>supabase.from('challenge_evidence').select('session_id,competency,polarity,confidence').order('id')),
  todasAsLinhas<any>(()=>supabase.from('challenge_telemetry').select('session_id').order('id'))]);
 const evidence=ev.linhas.filter(r=>idsDaTurma.has(r.session_id));
 const telemetry=tl.linhas.filter(r=>idsDaTurma.has(r.session_id));
 const parcial=!ev.completo||!tl.completo||!sessoesInteiras;

 const admin=createSupabaseAdminClient();
 const people=admin?(await admin.auth.admin.listUsers({perPage:200})).data?.users||[]:[];
 const emailOf=(id:string)=>people.find(person=>person.id===id)?.email||id;

 const rows=sessions.map(session=>{
  const mine=evidence.filter(signal=>signal.session_id===session.id);
  return{id:session.id,email:emailOf(session.user_id),status:session.status,
   actions:telemetry.filter(entry=>entry.session_id===session.id).length,
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

 return <main className="painel painel-largo">
  <header className="painel-head no-print">
   <div><NavInstrutor atual="/painel/turma"/>
   <h1 className="h1" style={{marginTop:14}}>A turma</h1>
   <p className="muted">{rows.length} pessoa(s) que agiram neste mundo</p>
   <SeletorDeMundo atual={chave} mundos={mundos.map(m=>({key:m.key,title:m.title,active:Boolean(m.active),pessoas:porMundo(m.key).length}))}/></div>
   <PrintButton csv={csv} filename="challenge-turma.csv"/>
  </header>
  {parcial&&<div className="panel barra-recado erro"><span>A leitura do banco não veio inteira, então estes números estão por baixo. Recarregue a página; se persistir, não use este relatório para avaliar ninguém.</span></div>}
  <div className="print-only print-head"><h1>{escolhido?.title||'Challenge'} — relatório da turma</h1>
   <p>{rows.length} participantes · gerado em {quando(new Date())}</p></div>

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
