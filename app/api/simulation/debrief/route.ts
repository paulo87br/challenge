import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';import{complete,parseJson,DEFAULT_PROVIDER,defaultModel,isProvider}from'@/lib/ai/providers';import{DEBRIEF_PROMPT}from'@/lib/ai/prompts';

export async function POST(req:Request){
 try{
  const{seat,evidence,telemetry,world,engine,sessionId}=await req.json();

  // The database is the source of truth. The client only ever saw evidence that
  // came back from a turn, so a signal produced by a voice call -- written
  // server-side -- was invisible to it, and the participant was told they had
  // none.
  let signals=Array.isArray(evidence)?evidence:[];
  if(sessionId){
   const supabase=createSupabaseServerClient();
   const{data:{user}}=supabase?await supabase.auth.getUser():{data:{user:null}};
   if(supabase&&user){
    const{data:stored}=await supabase.from('challenge_evidence')
     .select('competency,behavior,evidence,strength,confidence,polarity,corroboration_required')
     .eq('session_id',sessionId).order('created_at');
    if(stored?.length)signals=stored as any[];
   }
  }
  if(signals.length===0)
   return NextResponse.json({error:'no_evidence',detail:'Esta sessão ainda não produziu evidência: o debrief se constrói do que você fez no mundo.'},{status:422});
  const input=JSON.stringify({
   output_contract:'Respond with valid JSON only. The response must be a JSON object.',
   seat,scenario:world?.title,elapsed_minutes:world?.elapsedMinutes,
   observable_actions:(telemetry||[]).map((entry:any)=>({action:entry.action,channel:entry.channel,character:entry.characterId,text:entry.text})),
   evidence:signals
  });
  const provider=isProvider(engine?.provider)?engine.provider:DEFAULT_PROVIDER;
  const r=await complete({provider,model:String(engine?.model||'')||defaultModel(provider),instructions:DEBRIEF_PROMPT,input});
  if(!r.text.trim())throw new Error('empty_model_output');
  return NextResponse.json({...parseJson(r.text),usage:r.usage});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('debrief_error',message);
  return NextResponse.json({error:'debrief_failed',detail:message},{status:502});
 }
}
