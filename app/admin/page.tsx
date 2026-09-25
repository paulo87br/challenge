import{redirect}from'next/navigation';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{defaultScenario,type ScenarioConfig}from'@/lib/simulation/scenario';
import{AdminConsole,type Participant,type TurnRow}from'./admin-console';

export const dynamic='force-dynamic';
export const metadata={title:'Studio · Challenge'};

export default async function Admin(){
 const supabase=createSupabaseServerClient();
 // Backstop for the middleware: a change to its matcher must not silently
 // open the Studio to participants.
 if(!supabase)redirect('/login');
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login?next=%2Fadmin');
 const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
 if(!isInstructor)redirect('/lab');

 const{data:scenarioRow}=await supabase.from('challenge_scenarios').select('*').eq('key','atlas').maybeSingle();
 const scenario:ScenarioConfig=scenarioRow?{...defaultScenario,...scenarioRow,temperature:scenarioRow.temperature||{}}:defaultScenario;

 const[{data:sessions},{data:evidence},{data:telemetry},{data:turnRows}]=await Promise.all([
  supabase.from('challenge_sessions').select('id,user_id,status,started_at,updated_at,debrief').order('updated_at',{ascending:false}),
  supabase.from('challenge_evidence').select('session_id,polarity'),
  supabase.from('challenge_telemetry').select('session_id'),
  supabase.from('challenge_turns').select('*').order('created_at',{ascending:false}).limit(40)
 ]);
 // Every query above tolerates a missing table: 003 may not be applied yet, and
 // the Studio has to open anyway. An empty .in() is also an error, not a no-op.
 const turnIds=(turnRows||[]).map(turn=>turn.id);
 const{data:logRows}=turnIds.length
  ? await supabase.from('challenge_engine_logs').select('turn_id,stage,status,message,meta').in('turn_id',turnIds).order('id')
  : {data:[] as any[]};

 // "Who entered" means every account, including the ones that signed in and
 // never acted -- that absence is itself information for the instructor.
 const admin=createSupabaseAdminClient();
 const people=admin?(await admin.auth.admin.listUsers({perPage:200})).data?.users||[]:[];
 const emailOf=(id:string)=>people.find(person=>person.id===id)?.email||id;
 const count=(rows:any[]|null,id:string|null)=>id?(rows||[]).filter(row=>row.session_id===id).length:0;

 const participants:Participant[]=people.map(person=>{
  const session=(sessions||[]).find(row=>row.user_id===person.id);
  return{userId:person.id,email:person.email||person.id,createdAt:person.created_at,
   lastSignIn:person.last_sign_in_at||null,sessionId:session?.id||null,status:session?.status||null,
   actions:count(telemetry,session?.id||null),evidence:count(evidence,session?.id||null),
   risks:session?(evidence||[]).filter(row=>row.session_id===session.id&&row.polarity==='risk').length:0,
   hasDebrief:Boolean(session?.debrief),startedAt:session?.started_at||null,updatedAt:session?.updated_at||null};
 }).sort((a,b)=>(b.actions-a.actions)||a.email.localeCompare(b.email));

 const sessionOwner=new Map((sessions||[]).map(row=>[row.id,emailOf(row.user_id)]));
 const turns:TurnRow[]=(turnRows||[]).map(turn=>({
  id:turn.id,requestId:turn.request_id,createdAt:turn.created_at,severity:turn.severity,headline:turn.headline,
  summary:turn.summary,model:turn.model,actionName:turn.action_name,actionChannel:turn.action_channel,
  durationMs:turn.duration_ms,email:sessionOwner.get(turn.session_id)||'—',
  logs:(logRows||[]).filter(log=>log.turn_id===turn.id).map(log=>({stage:log.stage,status:log.status,message:log.message,meta:log.meta}))
 }));

 return <AdminConsole scenario={scenario} participants={participants} turns={turns}/>;
}
