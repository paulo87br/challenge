import{NextResponse}from'next/server';import{getOpenAI,getModel}from'@/lib/ai/openai';import{DEBRIEF_PROMPT}from'@/lib/ai/prompts';

export async function POST(req:Request){
 try{
  const{seat,evidence,telemetry,world}=await req.json();
  if(!Array.isArray(evidence)||evidence.length===0)
   return NextResponse.json({error:'no_evidence',detail:'A sessão ainda não produziu evidência suficiente para um debrief.'},{status:422});
  const input=JSON.stringify({
   output_contract:'Respond with valid JSON only. The response must be a JSON object.',
   seat,scenario:world?.title,elapsed_minutes:world?.elapsedMinutes,
   observable_actions:(telemetry||[]).map((entry:any)=>({action:entry.action,channel:entry.channel,character:entry.characterId,text:entry.text})),
   evidence
  });
  const r=await getOpenAI().responses.create({model:getModel(),instructions:DEBRIEF_PROMPT,input,text:{format:{type:'json_object'}}});
  if(!r.output_text)throw new Error(`empty_model_output:status=${r.status}`);
  return NextResponse.json(JSON.parse(r.output_text));
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('debrief_error',message);
  return NextResponse.json({error:'debrief_failed',detail:message},{status:502});
 }
}
