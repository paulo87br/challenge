import Link from 'next/link';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{NoAccess}from'../no-access';import{PrintButton}from'../print-button';import{buildProfile,profileSummary}from'@/lib/simulation/profile';
import{defaultScenario}from'@/lib/simulation/scenario';

export const dynamic='force-dynamic';

function clock(minute:number){return `${String(Math.floor(minute/60)%24).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`}

export default async function SessionDetail({params}:{params:{id:string}}){
 const supabase=createSupabaseServerClient();
 if(!supabase)return <NoAccess reason="Supabase não está configurado neste ambiente."/>;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return <NoAccess reason="Entre com a sua conta para continuar."/>;
 const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
 if(!isInstructor)return <NoAccess reason="Sua conta não está na lista de instrutores deste Challenge."/>;

 const{data:session}=await supabase.from('challenge_sessions').select('*').eq('id',params.id).maybeSingle();
 if(!session)return <NoAccess reason="Sessão não encontrada."/>;
 const{data:evidence}=await supabase.from('challenge_evidence').select('*').eq('session_id',params.id).order('created_at');
 const{data:telemetry}=await supabase.from('challenge_telemetry').select('*').eq('session_id',params.id).order('created_at');

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
 // The framework the session was played under, not today's -- editing the
 // Studio must not relabel evidence that was already collected.
 const{data:scenarioRow}=await supabase.from('challenge_scenarios').select('competencies').eq('key',session.scenario_key||'atlas').maybeSingle();
 const framework=(scenarioRow?.competencies?.length?scenarioRow.competencies:defaultScenario.competencies) as any[];
 const profile=buildProfile(framework,(evidence||[]) as any[]);
 const summary=profileSummary(profile);
 const orphans=(evidence||[]).filter(signal=>!framework.some((c:any)=>c.code===signal.competency));
 const csv=[['competencia','comportamento','evidencia','polaridade','forca','confianca','corroboracao'].join(','),
  ...(evidence||[]).map(signal=>[
   framework.find((c:any)=>c.code===signal.competency)?.name||signal.competency,
   signal.behavior,signal.evidence,signal.polarity,signal.strength,signal.confidence,
   signal.corroboration_required?'sim':'nao'
  ].map(cell=>`"${String(cell??'').replace(/"/g,'""')}"`).join(','))].join('\n');

 return <main className="painel">
  <header className="painel-head no-print">
   <div><Link href="/painel" className="btn">← Sessões</Link>
   <h1 className="h1" style={{marginTop:14}}>{email}</h1>
   <p className="muted">{world?.title||session.scenario_key} · {(telemetry||[]).length} ações · {(evidence||[]).length} sinais de evidência</p></div>
   <PrintButton csv={csv} filename={`challenge-${email}.csv`}/>
  </header>
  <div className="print-only print-head"><h1>{world?.title||'Challenge'} — {email}</h1>
   <p>{(telemetry||[]).length} ações · {(evidence||[]).length} sinais · gerado em {new Date().toLocaleString('pt-BR')}</p></div>

  {debrief&&<section className="panel"><div className="eyebrow">DEBRIEF ENTREGUE À PESSOA</div><h2>{debrief.headline}</h2>
   {String(debrief.narrative||'').split('\n').filter(Boolean).map((p:string,i:number)=><p key={i}>{p}</p>)}</section>}

  <section className="panel"><h2>Perfil de evidência</h2>
   <p className="muted">Quanto cada competência reuniu, de que natureza e com que confiança. Não há nota, nível nem ordenação de pessoas — ausência de sinal diz respeito ao caminho que a sessão tomou.</p>
   <div className="profile-summary">
    <div><b>{summary.touched}</b><small>de {summary.total} competências tocadas</small></div>
    <div><b>{summary.signals}</b><small>sinais no total</small></div>
    <div><b>{summary.risks}</b><small>sinais de risco</small></div>
    <div><b>{summary.needsCorroboration}</b><small>pedem corroboração</small></div>
   </div>
   {orphans.length>0&&<p className="muted">{orphans.length} sinal(is) fora da lista de competências deste cenário foram ignorados no perfil.</p>}
   <div className="profile-list">{profile.map(entry=><div className={'profile-row '+(entry.signals?'':'untouched')} key={entry.code}>
    <div className="profile-name"><b>{entry.name}</b><small>{entry.definition}</small></div>
    <div className="profile-bars">
     {entry.signals===0&&<span className="muted">sem evidência nesta sessão</span>}
     {entry.signals>0&&<>
      <span className="profile-count">{entry.signals} sinal(is)</span>
      <span className="profile-polarity">
       {entry.positive>0&&<span className="dot positive" title={`${entry.positive} positivo(s)`}>{entry.positive}</span>}
       {entry.neutral>0&&<span className="dot neutral" title={`${entry.neutral} neutro(s)`}>{entry.neutral}</span>}
       {entry.risk>0&&<span className="dot risk" title={`${entry.risk} de risco`}>{entry.risk}</span>}
      </span>
      <span className="muted">confiança média {entry.meanConfidence.toFixed(2)}{entry.needsCorroboration?` · ${entry.needsCorroboration} pede corroboração`:''}</span>
     </>}
    </div>
    {entry.behaviors.length>0&&<ul className="profile-behaviors">{entry.behaviors.map((behavior,i)=><li key={i}>{behavior}</li>)}</ul>}
   </div>)}</div>
  </section>

  <section className="panel"><h2>Evidência bruta</h2>
   <p className="muted">Cada sinal como o Observer registrou, com força e confiança declaradas.</p>
   {(evidence||[]).length===0&&<p className="muted">Nenhuma evidência registrada nesta sessão.</p>}
   {(evidence||[]).map(signal=><div className={'evidence-row polarity-'+signal.polarity} key={signal.id}>
    <b>{signal.behavior}</b>
    <span>{signal.evidence}</span>
    <small className="muted">{framework.find((c:any)=>c.code===signal.competency)?.name||signal.competency} · força {Number(signal.strength).toFixed(2)} · confiança {Number(signal.confidence).toFixed(2)}{signal.corroboration_required?' · precisa de corroboração':''}</small>
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
