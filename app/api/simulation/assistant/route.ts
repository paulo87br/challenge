import{NextResponse}from'next/server';import{complete,DEFAULT_PROVIDER,defaultModel,isProvider}from'@/lib/ai/providers';import{ASSISTANT_PROMPT}from'@/lib/ai/prompts';

type Turn={role:'you'|'ara';text:string};

export async function POST(req:Request){
 try{
  const{question,context,history,engine}=await req.json();
  if(!question)return NextResponse.json({error:'question_required'},{status:400});
  // Ara is a conversation, not a lookup: without the previous turns every
  // follow-up ("e quanto a isso?") would be answered from scratch.
  const conversation=(Array.isArray(history)?history as Turn[]:[]).slice(-12)
   .map(turn=>`${turn.role==='you'?'PARTICIPANT':'ARA'}: ${turn.text}`).join('\n');
  const input=`AVAILABLE CONTEXT (json):\n${JSON.stringify(context||{})}\n\n`
   +(conversation?`CONVERSATION SO FAR:\n${conversation}\n\n`:'')
   +`PARTICIPANT:\n${question}`;
  const provider=isProvider(engine?.provider)?engine.provider:DEFAULT_PROVIDER;
  const r=await complete({provider,model:String(engine?.model||'')||defaultModel(provider),instructions:ASSISTANT_PROMPT,input,json:false,maxTokens:2000});
  return NextResponse.json({answer:r.text,usage:r.usage});
 }catch(error){
  console.error('assistant_error',error);
  return NextResponse.json({error:'assistant_failed'},{status:500});
 }
}
