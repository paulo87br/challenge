import Link from 'next/link';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{NoAccess}from'./no-access';

export const dynamic='force-dynamic';
export const metadata={title:'Painel · Challenge'};

export default async function Painel(){
 const supabase=createSupabaseServerClient();
 if(!supabase)return <NoAccess reason="Supabase não está configurado neste ambiente."/>;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return <NoAccess reason="Entre com a sua conta para continuar."/>;
 const{data:isInstructor}=await supabase.rpc('is_instructor');
 if(!isInstructor)return <NoAccess reason="Sua conta não está na lista de instrutores deste Challenge."/>;

 const{data:sessions}=await supabase.from('sessions')
  .select('id,user_id,scenario_key,status,started_at,updated_at,world_state,debrief')
  .order('updated_at',{ascending:false}).limit(100);
 const{data:evidence}=await supabase.from('evidence').select('session_id,competency,polarity');
 const{data:telemetry}=await supabase.from('telemetry').select('session_id');

 // Emails live in auth.users, which RLS never exposes. Only an instructor
 // reaches this line, and only the addresses of people in these sessions.
 const admin=createSupabaseAdminClient();
 const emails=new Map<string,string>();
 if(admin){
  const{data}=await admin.auth.admin.listUsers({perPage:200});
  for(const person of data?.users||[])emails.set(person.id,person.email||person.id);
 }
 const countBy=(rows:any[]|null,id:string)=>(rows||[]).filter(row=>row.session_id===id).length;

 return <main className="painel">
  <header className="painel-head">
   <div><div className="eyebrow">CHALLENGE · INSTRUTOR</div><h1 className="h1">Sessões</h1>
   <p className="muted">Cada linha é o Challenge de uma pessoa. A evidência é observação, não nota: leia junto com o que a pessoa realmente fez.</p></div>
   <span className="tag">{sessions?.length||0} sessões</span>
  </header>
  {!sessions?.length&&<div className="panel"><p className="muted">Nenhuma sessão registrada ainda.</p></div>}
  <div className="painel-list">
   {(sessions||[]).map(session=>{
    const signals=countBy(evidence,session.id);
    const risks=(evidence||[]).filter(row=>row.session_id===session.id&&row.polarity==='risk').length;
    const world=session.world_state as any;
    return <Link href={`/painel/${session.id}`} key={session.id} className="panel painel-row">
     <div className="painel-row-main">
      <b>{emails.get(session.user_id)||session.user_id}</b>
      <span className="muted">{world?.title||session.scenario_key} · atualizado {new Date(session.updated_at).toLocaleString('pt-BR')}</span>
     </div>
     <div className="painel-stats">
      <span className="tag">{countBy(telemetry,session.id)} ações</span>
      <span className="tag">{signals} evidências</span>
      {risks>0&&<span className="tag hot">{risks} de risco</span>}
      <span className={'diagnostic-pill '+(session.status==='completed'?'ok':'attention')}>{session.status==='completed'?'encerrada':'em andamento'}</span>
      {session.debrief&&<span className="tag">debrief</span>}
     </div>
    </Link>;
   })}
  </div>
 </main>;
}
