import{NextResponse}from'next/server';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{defaultScenario}from'@/lib/simulation/scenario';
import{scenarioCharacters}from'@/lib/simulation/scenario-world';
import{callInstructions,mintCallSecret,REALTIME_MODEL}from'@/lib/call/realtime';import{resolveVoice,withVoiceRegisters}from'@/lib/call/voices';
import{classify,FAILURE_LABELS}from'@/lib/ai/errors';
import{recordIncident}from'@/lib/queue/rate';

export async function POST(req:Request){
 try{
  const supabase=createSupabaseServerClient();
  if(!supabase)return NextResponse.json({error:'supabase_not_configured'},{status:503});
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'unauthenticated'},{status:401});

  const{sessionId,characterId}=await req.json();
  if(!sessionId||!characterId)return NextResponse.json({error:'session_and_character_required'},{status:400});

  const{data:session}=await supabase.from('challenge_sessions')
   .select('id,user_id,scenario_key,world_state').eq('id',sessionId).maybeSingle();
  if(!session||session.user_id!==user.id)return NextResponse.json({error:'forbidden'},{status:403});

  const{data:scenarioRow}=await supabase.from('challenge_scenarios')
   .select('*').eq('key',session.scenario_key||'atlas').maybeSingle();
  const scenario={...defaultScenario,...(scenarioRow||{})} as any;
  if(!scenario.calls_enabled)
   return NextResponse.json({error:'calls_disabled',detail:'As chamadas por voz estão desligadas neste Challenge.'},{status:409});

  const world=(session.world_state||{}) as any;
  const authored=scenarioCharacters(scenario);
  const cast=withVoiceRegisters(world?.characters?.length?world.characters:authored,authored);
  const character=cast.find((person:any)=>person.id===characterId);
  if(!character)return NextResponse.json({error:'character_not_found'},{status:404});
  // A character who does not take calls does not take calls. The UI hides them;
  // this makes it true rather than merely hidden.
  if(Array.isArray(character.channels)&&!character.channels.includes('call'))
   return NextResponse.json({error:'character_unreachable',
    detail:`${character.name} não atende ligações neste cenário.`},{status:409});

  const perCall=Math.max(1,Number(scenario.call_minutes_per_call)||5)*60;
  const perSession=Math.max(1,Number(scenario.call_minutes_per_session)||15)*60;
  const{data:spent}=await supabase.rpc('challenge_call_seconds',{p_session:sessionId});
  const used=Number(spent)||0;
  const remaining=Math.min(perCall,perSession-used);
  if(remaining<=15)
   return NextResponse.json({error:'call_budget_exhausted',
    detail:`O tempo de chamada desta sessão acabou (${Math.round(perSession/60)} min no total).`},{status:409});

  const instructions=callInstructions(character,{title:world.title,seatRole:world.seat?.role,facts:world.facts});
  const voice=resolveVoice(character,cast,String(scenario.call_voice||'marin'));

  let minted;
  try{
   minted=await mintCallSecret({instructions,voice,sessionHint:String(sessionId)});
  }catch(error){
   const failure=classify(error);
   if(failure.kind==='blocking')
    await recordIncident({sessionId:String(sessionId),provider:'openai',model:REALTIME_MODEL,
     failure,kind:'blocking',attempts:1});
   return NextResponse.json({error:'call_mint_failed',blocked:failure.kind==='blocking',
    code:failure.code,label:FAILURE_LABELS[failure.code]||failure.code,
    detail:failure.message.slice(0,300)},{status:502});
  }

  // Recorded before the browser dials, so a call that drops mid-connection is
  // still visible instead of vanishing.
  const admin=createSupabaseAdminClient();
  let callId:string|null=null;
  if(admin){
   const{data:row}=await admin.from('challenge_calls').insert({
    session_id:sessionId,character_id:character.id,character_name:character.name,
    model:REALTIME_MODEL,voice,status:'ringing'}).select('id').single();
   callId=row?.id??null;
  }

  return NextResponse.json({callId,secret:minted.value,model:REALTIME_MODEL,voice,
   character:{id:character.id,name:character.name,role:character.role},
   remainingSeconds:remaining,sessionBudgetSeconds:perSession,usedSeconds:used});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('call_token_error',message);
  return NextResponse.json({error:'call_token_failed',detail:message},{status:500});
 }
}
