import Link from 'next/link';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{NoAccess}from'../no-access';

export const dynamic='force-dynamic';

function clock(minute:number){return `${String(Math.floor(minute/60)%24).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`}

export default async function SessionDetail({params}:{params:{id:string}}){
 const supabase=createSupabaseServerClient();
 if(!supabase)return <NoAccess reason="Supabase não está configurado neste ambiente."/>;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return <NoAccess reason="Entre com a sua conta para continuar."/>;
 const{data:isInstructor}=await supabase.rpc('is_instructor');
 if(!isInstructor)return <NoAccess reason="Sua conta não está na lista de instrutores deste Challenge."/>;

 const{data:session}=await supabase.from('sessions').select('*').eq('id',params.id).maybeSingle();
 if(!session)return <NoAccess reason="Sessão não encontrada."/>;
 const{data:evidence}=await supabase.from('evidence').select('*').eq('session_id',params.id).order('created_at');
 const{data:telemetry}=await supabase.from('telemetry').select('*').eq('session_id',params.id).order('created_at');

 const admin=createSupabaseAdminClient();
 let email=session.user_id;
 if(admin){const{data}=await admin.auth.admin.listUsers({perPage:200});email=data?.users.find(p=>p.id===session.user_id)?.email||email}

 const world=session.world_state as any;
 const debrief=session.debrief as any;
 // Replay: what the participant did, interleaved with what the world answered,
 // in simulated time rather than wall-clock order.
 const worldEvents=(world?.events||[]).filter((event:any)=>event.visible)
  .map((event:any)=>({at:event.at,kind:'mundo',who:event.sender,channel:event.channel,text:event.subject?`${event.subject} — ${event.body}`:event.body}));
 const actions=(telemetry||[]).map(entry=>({at:entry.simulated_minute??0,kind:'participante',who:'Você',channel:entry.channel,text:entry.body||entry.action}));
 const replay=[...worldEvents,...actions].sort((a,b)=>a.at-b.at);
 const byCompetency=new Map<string,any[]>();
 for(const signal of evidence||[]){const list=byCompetency.get(signal.competency)||[];list.push(signal);byCompetency.set(signal.competency,list)}

 return <main className="painel">
  <header className="painel-head">
   <div><Link href="/painel" className="btn">← Sessões</Link>
   <h1 className="h1" style={{marginTop:14}}>{email}</h1>
   <p className="muted">{world?.title||session.scenario_key} · {(telemetry||[]).length} ações · {(evidence||[]).length} sinais de evidência</p></div>
  </header>

  {debrief&&<section className="panel"><div className="eyebrow">DEBRIEF ENTREGUE À PESSOA</div><h2>{debrief.headline}</h2>
   {String(debrief.narrative||'').split('\n').filter(Boolean).map((p:string,i:number)=><p key={i}>{p}</p>)}</section>}

  <section className="panel"><h2>Evidência por competência</h2>
   <p className="muted">Observação comportamental com força e confiança declaradas. Ausência de sinal não é sinal negativo.</p>
   {byCompetency.size===0&&<p className="muted">Nenhuma evidência registrada nesta sessão.</p>}
   {[...byCompetency.entries()].map(([competency,signals])=><div className="evidence-group" key={competency}>
    <h3>{competency} <span className="tag">{signals.length}</span></h3>
    {signals.map(signal=><div className={'evidence-row polarity-'+signal.polarity} key={signal.id}>
     <b>{signal.behavior}</b>
     <span>{signal.evidence}</span>
     <small className="muted">força {Number(signal.strength).toFixed(2)} · confiança {Number(signal.confidence).toFixed(2)}{signal.corroboration_required?' · precisa de corroboração':''}</small>
    </div>)}
   </div>)}
  </section>

  <section className="panel"><h2>Replay</h2>
   <p className="muted">A sessão em tempo simulado: o que a pessoa fez e o que o mundo respondeu.</p>
   <div className="replay">{replay.map((entry,i)=><div className={'replay-row replay-'+entry.kind} key={i}>
    <span className="replay-time">{clock(entry.at)}</span>
    <span className="replay-who"><b>{entry.who}</b><small>{entry.channel}</small></span>
    <span className="replay-text">{entry.text}</span>
   </div>)}</div>
   {replay.length===0&&<p className="muted">Nada registrado ainda.</p>}
  </section>
 </main>;
}
