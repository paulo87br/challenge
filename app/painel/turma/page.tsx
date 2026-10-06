import Link from 'next/link';
import{quando}from'@/lib/mundo/quando';
import{NavInstrutor}from'@/app/ui/nav-instrutor';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{defaultScenario}from'@/lib/simulation/scenario';
import{buildProfile}from'@/lib/simulation/profile';
import{todasAsLinhas}from'@/lib/supabase/paginar';
import{SeletorDeMundo,type Opcao}from'./seletor-de-mundo';
import{NoAccess}from'../no-access';
import{PrintButton}from'../print-button';

export const dynamic='force-dynamic';
export const metadata={title:'Turma · Challenge'};

export default async function Turma({searchParams}:{searchParams?:{escopo?:string;cenario?:string}}){
 const supabase=createSupabaseServerClient();
 if(!supabase)return <NoAccess reason="Supabase não está configurado neste ambiente."/>;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return <NoAccess reason="Entre com a sua conta para continuar."/>;
 const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
 if(!isInstructor)return <NoAccess reason="Sua conta não está na lista de instrutores deste Challenge."/>;

 // Antes da 028 não há turmas, e a tela continua servindo o relatório por
 // atividade em vez de abrir vazia.
 const comTurma=await supabase.from('challenge_scenarios')
  .select('key,title,active,competencies,turma_id').eq('is_template',false).order('title');
 const semTurma=comTurma.error
  ?await supabase.from('challenge_scenarios').select('key,title,active,competencies').eq('is_template',false).order('title')
  :comTurma;
 const mundos=((semTurma.data||[])as any[]).map(m=>({...m,turma_id:m.turma_id??null}));
 const turmasRes=comTurma.error?{data:[]}:await supabase.from('challenge_turmas')
  .select('id,nome,arquivada').eq('arquivada',false).order('created_at',{ascending:false});
 const turmas=((turmasRes.data||[])as any[]);

 const[sesRes,evRes,telRes]=await Promise.all([
  todasAsLinhas<any>(()=>supabase.from('challenge_sessions')
   .select('id,user_id,status,scenario_key,started_at,debrief').order('started_at')),
  // Paginado: o PostgREST corta em mil linhas sem avisar, e uma turma já passou
  // de 1977 evidências -- quem tinha 127 sinais aparecia com zero.
  // Em degraus: antes da 027 não há coluna de lastro, e um relatório vazio por
  // causa disso seria pior que um relatório sem a distinção.
  (async()=>{
   const comLastro=await todasAsLinhas<any>(()=>supabase.from('challenge_evidence')
    .select('session_id,competency,polarity,confidence,support').order('id'));
   if(comLastro.completo||comLastro.linhas.length)return comLastro;
   return todasAsLinhas<any>(()=>supabase.from('challenge_evidence')
    .select('session_id,competency,polarity,confidence').order('id'));
  })(),
  todasAsLinhas<any>(()=>supabase.from('challenge_telemetry').select('session_id').order('id'))]);
 const parcial=!sesRes.completo||!evRes.completo||!telRes.completo;
 const todasSessoes=sesRes.linhas;
 const pessoasPorMundo=(k:string)=>todasSessoes.filter(s=>s.scenario_key===k).length;

 // Escopo: uma turma (várias atividades) ou uma atividade só.
 const pedido=String(searchParams?.escopo||(searchParams?.cenario?`mundo:${searchParams.cenario}`:''));
 const opcoes:Opcao[]=[
  ...turmas.map(t=>{
   const dela=mundos.filter(m=>m.turma_id===t.id);
   const gente=dela.reduce((n,m)=>n+pessoasPorMundo(m.key),0);
   return{valor:`turma:${t.id}`,grupo:'turma' as const,
    rotulo:`${t.nome} — ${dela.length} ${dela.length===1?'atividade':'atividades'}, ${gente} ${gente===1?'sessão':'sessões'}`};
  }),
  ...mundos.filter(m=>!m.turma_id).map(m=>({valor:`mundo:${m.key}`,grupo:'mundo' as const,
   rotulo:`${m.title}${m.active?' · no ar':''} — ${pessoasPorMundo(m.key)} ${pessoasPorMundo(m.key)===1?'sessão':'sessões'}`}))];

 const escolhido=opcoes.find(o=>o.valor===pedido)
  ||opcoes.find(o=>o.grupo==='mundo'&&mundos.find(m=>`mundo:${m.key}`===o.valor)?.active&&pessoasPorMundo(String(o.valor).slice(6)))
  ||opcoes.find(o=>o.grupo==='turma')
  ||opcoes[0];
 const ehTurma=escolhido?.grupo==='turma';
 const turmaAtual=ehTurma?turmas.find(t=>`turma:${t.id}`===escolhido!.valor):null;
 const doEscopo=ehTurma
  ?mundos.filter(m=>m.turma_id===turmaAtual?.id)
  :mundos.filter(m=>`mundo:${m.key}`===escolhido?.valor);
 const titulo=ehTurma?String(turmaAtual?.nome||'Turma'):String(doEscopo[0]?.title||'Challenge');

 const admin=createSupabaseAdminClient();
 const people=admin?(await admin.auth.admin.listUsers({perPage:200})).data?.users||[]:[];
 const emailOf=(id:string)=>people.find(person=>person.id===id)?.email||id;

 // Evidência sem lastro não entra na leitura: ela existe no banco e aparece no
 // Studio como medida do motor, mas dizer que alguém exerceu uma competência a
 // partir de um sinal que não toca o que a pessoa escreveu seria afirmar demais.
 const util=(linha:any)=>linha.support!=='sem_apoio';
 const evidencia=evRes.linhas.filter(util);
 const descartados=evRes.linhas.length-evidencia.length;

 // Uma atividade por vez: cada uma com a sua régua, porque somar competências
 // de casos diferentes produziria uma média sem significado.
 const atividades=doEscopo.map(mundo=>{
  const sessoes=todasSessoes.filter(s=>s.scenario_key===mundo.key);
  const ids=new Set(sessoes.map(s=>s.id));
  const framework=((mundo.competencies as any[])?.length?mundo.competencies:defaultScenario.competencies)as any[];
  const linhas=sessoes.map(sessao=>{
   const meus=evidencia.filter(x=>x.session_id===sessao.id);
   return{id:sessao.id,email:emailOf(sessao.user_id),
    actions:telRes.linhas.filter(t=>t.session_id===sessao.id).length,
    hasDebrief:Boolean(sessao.debrief),profile:buildProfile(framework,meus as any[]),signals:meus.length};
  }).filter(l=>l.actions>0||l.signals>0);
  const cobertura=framework.map((c:any)=>{
   const comSinal=linhas.filter(l=>l.profile.find(e=>e.code===c.code)?.signals);
   const total=linhas.reduce((n,l)=>n+(l.profile.find(e=>e.code===c.code)?.signals||0),0);
   const riscos=linhas.reduce((n,l)=>n+(l.profile.find(e=>e.code===c.code)?.risk||0),0);
   return{...c,students:comSinal.length,signals:total,risks:riscos};
  }).sort((a,b)=>b.students-a.students);
  return{mundo,framework,linhas,cobertura,ids};
 }).filter(a=>a.linhas.length>0);

 // Na visão de turma, a mesma pessoa aparece uma vez, com o que fez em cada
 // atividade. É para isso que a turma existe como conceito.
 const pessoas=new Map<string,{email:string;porAtividade:Map<string,{acoes:number;sinais:number;id:string;debrief:boolean}>}>();
 for(const a of atividades)for(const l of a.linhas){
  const atual=pessoas.get(l.email)||{email:l.email,porAtividade:new Map()};
  atual.porAtividade.set(a.mundo.key,{acoes:l.actions,sinais:l.signals,id:l.id,debrief:l.hasDebrief});
  pessoas.set(l.email,atual);
 }
 const gente=[...pessoas.values()].sort((a,b)=>a.email.localeCompare(b.email));

 const csv=[['pessoa','atividade','acoes','sinais','debrief'].join(','),
  ...atividades.flatMap(a=>a.linhas.map(l=>[l.email,a.mundo.title,l.actions,l.signals,l.hasDebrief?'sim':'nao'].join(',')))].join('\n');

 return <main className="painel painel-largo">
  <header className="painel-head no-print">
   <div><NavInstrutor atual="/painel/turma"/>
   <h1 className="h1" style={{marginTop:14}}>{ehTurma?titulo:'A turma'}</h1>
   <p className="muted">{gente.length} {gente.length===1?'pessoa':'pessoas'} · {atividades.length} {atividades.length===1?'atividade':'atividades'}</p>
   {escolhido&&<SeletorDeMundo atual={escolhido.valor} opcoes={opcoes}/>}</div>
   <PrintButton csv={csv} filename="challenge-turma.csv"/>
  </header>
  {parcial&&<div className="panel barra-recado erro"><span>A leitura do banco não veio inteira: estes números estão por baixo. Recarregue a página antes de usar este relatório para avaliar alguém.</span></div>}
  <div className="print-only print-head"><h1>{titulo} — relatório</h1>
   <p>{gente.length} participantes · gerado em {quando(new Date())}</p></div>

  {atividades.length===0&&<div className="panel"><p className="muted">Ninguém agiu ainda neste recorte.</p></div>}

  {atividades.map(a=><section className="panel" key={a.mundo.key}>
   <h2>Cobertura por competência{atividades.length>1?` · ${a.mundo.title}`:''}</h2>
   <p className="muted">Quantas pessoas produziram evidência de cada competência. Competência sem ninguém diz respeito ao caminho que o cenário ofereceu — não a uma falha da turma.</p>
   <div className="coverage">{a.cobertura.map(entry=>{
    const share=a.linhas.length?Math.round(100*entry.students/a.linhas.length):0;
    return <div className="coverage-row" key={entry.code}>
     <span className="coverage-name"><b>{entry.name}</b><small>{entry.students} de {a.linhas.length} pessoas · {entry.signals} sinais{entry.risks?` · ${entry.risks} de risco`:''}</small></span>
     <span className="coverage-bar"><span className={'coverage-fill '+(share===0?'empty':'')} style={{width:`${Math.max(share,share?4:0)}%`}}/></span>
     <span className="coverage-share">{share}%</span>
    </div>;
   })}</div>
  </section>)}

  {atividades.length===1&&<section className="panel"><h2>Pessoa por pessoa</h2>
   <div className="class-table">
    <div className="class-row class-header"><span>Pessoa</span><span>Ações</span><span>Sinais</span>
     {atividades[0].framework.map((c:any)=><span key={c.code} className="class-comp" title={c.definition}>{c.name}</span>)}</div>
    {atividades[0].linhas.map(row=><div className="class-row" key={row.id}>
     <span className="class-who"><Link href={`/painel/${row.id}`}>{row.email}</Link>
      {row.hasDebrief&&<b className="tag">debrief</b>}</span>
     <span>{row.actions}</span><span>{row.signals}</span>
     {atividades[0].framework.map((c:any)=>{const cell=row.profile.find(e=>e.code===c.code);
      return <span key={c.code} className={'class-cell '+(cell?.risk?'risk':cell?.signals?'has':'')}>{cell?.signals||'·'}</span>})}
    </div>)}
   </div>
  </section>}

  {atividades.length>1&&<section className="panel"><h2>A turma ao longo das atividades</h2>
   <p className="muted">A mesma pessoa, atividade por atividade. Célula vazia é quem não participou daquela — o que é informação sobre a presença, não sobre a capacidade.</p>
   <div className="class-table">
    <div className="class-row class-header"><span>Pessoa</span><span>Atividades</span>
     {atividades.map(a=><span key={a.mundo.key} className="class-comp" title={a.mundo.title}>{a.mundo.title}</span>)}</div>
    {gente.map(p=><div className="class-row" key={p.email}>
     <span className="class-who">{p.email}</span>
     <span>{p.porAtividade.size} de {atividades.length}</span>
     {atividades.map(a=>{const c=p.porAtividade.get(a.mundo.key);
      return <span key={a.mundo.key} className={'class-cell '+(c?'has':'')}>
       {c?<Link href={`/painel/${c.id}`}>{c.acoes}/{c.sinais}</Link>:'·'}</span>})}
    </div>)}
   </div>
   <p className="muted" style={{marginTop:10}}>Cada célula traz ações/sinais daquela atividade.</p>
  </section>}

  {descartados>0&&<p className="muted no-print" style={{marginTop:14}}>
   {descartados} {descartados===1?'sinal ficou':'sinais ficaram'} fora desta leitura por não se apoiar no que a pessoa escreveu. Isso é medida do motor, não da turma, e aparece no Studio.</p>}
 </main>;
}
