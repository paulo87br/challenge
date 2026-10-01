import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';import{complete,parseJson,DEFAULT_PROVIDER,defaultModel,isProvider}from'@/lib/ai/providers';import{DEBRIEF_PROMPT}from'@/lib/ai/prompts';

export async function POST(req:Request){
 try{
  const{seat,evidence,telemetry,world,engine,sessionId,compulsorio}=await req.json();

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
  if(signals.length===0){
   // Pedido por quem clicou em Encerrar: não há o que ler, e dizer isso é mais
   // honesto que inventar uma leitura.
   if(!compulsorio)
    return NextResponse.json({error:'no_evidence',detail:'Esta sessão ainda não produziu evidência: o debrief se constrói do que você fez no mundo.'},{status:422});
   // Encerramento por tempo: a sessão fecha de qualquer jeito. Prova em branco
   // também é prova entregue, e uma sessão que não fecha fica aberta para
   // sempre, contando tempo que já acabou.
   const vazio={headline:'A janela terminou sem material para ler',
    narrative:'O tempo desta sessão acabou e ela foi encerrada automaticamente. Não houve ação suficiente no mundo para produzir uma leitura: o debrief se constrói do que a pessoa fez, e aqui não há o que observar.',
    moves:[],blind_spots:[],uncovered:[],
    questions_to_sit_with:['O que te impediu de começar?','Se a janela recomeçasse agora, qual seria sua primeira ação?'],
    semMaterial:true};
   return NextResponse.json(vazio);
  }
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
