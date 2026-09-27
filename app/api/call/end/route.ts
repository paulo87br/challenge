import{NextResponse}from'next/server';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{defaultScenario}from'@/lib/simulation/scenario';
import{OBSERVER_PROMPT}from'@/lib/ai/prompts';
import{complete,parseJson,DEFAULT_PROVIDER,defaultModel,isProvider}from'@/lib/ai/providers';
import type{EvidenceSignal}from'@/lib/simulation/types';

// The call is over; what it produced has to land in the same places a turn's
// does, or voice becomes a part of the Challenge that the assessment cannot see.
export async function POST(req:Request){
 try{
  const supabase=createSupabaseServerClient();
  if(!supabase)return NextResponse.json({error:'supabase_not_configured'},{status:503});
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'unauthenticated'},{status:401});

  const{callId,sessionId,seconds,transcript,failure}=await req.json();
  if(!callId||!sessionId)return NextResponse.json({error:'call_and_session_required'},{status:400});
  const{data:session}=await supabase.from('challenge_sessions')
   .select('id,user_id,scenario_key,world_state').eq('id',sessionId).maybeSingle();
  if(!session||session.user_id!==user.id)return NextResponse.json({error:'forbidden'},{status:403});

  const lines=Array.isArray(transcript)?transcript.filter((line:any)=>line?.text):[];
  const admin=createSupabaseAdminClient();
  if(admin)await admin.from('challenge_calls').update({
   status:failure?'failed':'ended',
   seconds:Math.max(0,Math.round(Number(seconds)||0)),
   transcript:lines,failure:failure?String(failure).slice(0,400):null,
   ended_at:new Date().toISOString()}).eq('id',callId).eq('session_id',sessionId);

  // A call under fifteen seconds or with nothing said is a misdial, not an
  // assessment event; running the Observer on it would manufacture evidence.
  if(failure||lines.length<2||Number(seconds)<15)
   return NextResponse.json({saved:true,signals:0,reason:'chamada curta demais para gerar evidência'});

  const{data:scenarioRow}=await supabase.from('challenge_scenarios')
   .select('*').eq('key',session.scenario_key||'atlas').maybeSingle();
  const scenario={...defaultScenario,...(scenarioRow||{})} as any;
  const framework=scenario.competencies?.length?scenario.competencies:defaultScenario.competencies;
  const provider=isProvider(scenario.provider)?scenario.provider:DEFAULT_PROVIDER;
  const world=(session.world_state||{}) as any;

  let signals:EvidenceSignal[]=[];
  try{
   const result=await complete({provider,model:String(scenario.model||'')||defaultModel(provider),
    instructions:OBSERVER_PROMPT,
    input:JSON.stringify({competencyFramework:framework,seat:world.seat,temperature:world.temperature,
     channel:'call',
     note:'This is the transcript of a voice call the participant made. Judge only what was said.',
     transcript:lines.map((line:any)=>({speaker:line.role==='participant'?'PARTICIPANT':'CHARACTER',text:line.text}))})});
   const parsed=parseJson(result.text);
   const canonical=new Map(framework.flatMap((c:any)=>[[c.code,c.code],[String(c.name).toLocaleLowerCase(),c.code]]));
   signals=(parsed?.signals||[]).map((signal:any)=>{
    const code=canonical.get(signal.competency)||canonical.get(String(signal.competency||'').toLocaleLowerCase());
    return code?{...signal,competency:code}:null;
   }).filter(Boolean);
  }catch(error){
   console.error('call_observer_error',error instanceof Error?error.message:String(error));
   return NextResponse.json({saved:true,signals:0,reason:'o Observer não conseguiu ler esta chamada'});
  }

  if(admin&&signals.length)await admin.from('challenge_evidence').insert(signals.map(signal=>({
   session_id:sessionId,competency:signal.competency,behavior:signal.behavior,evidence:signal.evidence,
   strength:Number(signal.strength)||0,confidence:Number(signal.confidence)||0,
   polarity:signal.polarity,corroboration_required:Boolean(signal.corroboration_required)})));

  return NextResponse.json({saved:true,signals:signals.length});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('call_end_error',message);
  return NextResponse.json({error:'call_end_failed',detail:message},{status:500});
 }
}
