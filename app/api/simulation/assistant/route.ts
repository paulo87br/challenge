import{NextResponse}from'next/server';import{getOpenAI,getModel}from'@/lib/ai/openai';import{ASSISTANT_PROMPT}from'@/lib/ai/prompts';

type Turn={role:'you'|'ara';text:string};

export async function POST(req:Request){
 try{
  const{question,context,history}=await req.json();
  if(!question)return NextResponse.json({error:'question_required'},{status:400});
  // Ara is a conversation, not a lookup: without the previous turns every
  // follow-up ("e quanto a isso?") would be answered from scratch.
  const conversation=(Array.isArray(history)?history as Turn[]:[]).slice(-12)
   .map(turn=>`${turn.role==='you'?'PARTICIPANT':'ARA'}: ${turn.text}`).join('\n');
  const input=`AVAILABLE CONTEXT (json):\n${JSON.stringify(context||{})}\n\n`
   +(conversation?`CONVERSATION SO FAR:\n${conversation}\n\n`:'')
   +`PARTICIPANT:\n${question}`;
  const r=await getOpenAI().responses.create({model:getModel(),instructions:ASSISTANT_PROMPT,input});
  return NextResponse.json({answer:r.output_text});
 }catch(error){
  console.error('assistant_error',error);
  return NextResponse.json({error:'assistant_failed'},{status:500});
 }
}
