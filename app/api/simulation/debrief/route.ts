import{NextResponse}from'next/server';import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';import{levantarOmissoes}from'@/lib/simulation/omissao';import{complete,parseJson,DEFAULT_PROVIDER,defaultModel,isProvider}from'@/lib/ai/providers';import{DEBRIEF_PROMPT}from'@/lib/ai/prompts';

export async function POST(req:Request){
 try{
  const{seat,evidence,telemetry,world,engine,sessionId,compulsorio}=await req.json();

  // The database is the source of truth. The client only ever saw evidence that
  // came back from a turn, so a signal produced by a voice call -- written
  // server-side -- was invisible to it, and the participant was told they had
  // none.
  // Lido com a chave de serviço, não com a sessão de quem pede: a política não
  // dá leitura de evidência ao participante -- é o que o impede de se avaliar
  // -- então o caminho do banco nunca valia para ele e o debrief acabava sendo
  // escrito sobre a cópia crua do navegador. Agora que a evidência passa por
  // deduplicação, lastro e segunda passada antes de ser gravada, as duas
  // leituras diziam coisas diferentes sobre a mesma sessão.
  //
  // A dona da sessão é conferida antes: a chave de serviço ignora RLS, e quem
  // pede só pode receber a evidência da própria corrida.
  let signals=Array.isArray(evidence)?evidence:[];
  if(sessionId){
   const supabase=createSupabaseServerClient();
   const{data:{user}}=supabase?await supabase.auth.getUser():{data:{user:null}};
   const admin=createSupabaseAdminClient();
   if(user&&admin){
    const{data:dona}=await admin.from('challenge_sessions').select('user_id').eq('id',sessionId).maybeSingle();
    if(dona?.user_id===user.id){
     const{data:stored}=await admin.from('challenge_evidence')
      .select('competency,behavior,evidence,strength,confidence,polarity,corroboration_required,support')
      .eq('session_id',sessionId).order('created_at');
     // Sinal sem lastro não entra na leitura da pessoa: ele existe, aparece no
     // Studio como medida do motor, mas não sustenta uma frase sobre ela.
     const uteis=(stored||[]).filter((x:any)=>x.support!=='sem_apoio');
     if(uteis.length)signals=uteis.map(({support,...resto}:any)=>resto);
    }
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
  // O que o mundo pôs diante da pessoa e ela não respondeu. Lido do banco, não
  // do corpo da requisição: o estado do mundo e a telemetria gravada são o que
  // de fato aconteceu, e o navegador não precisa carregar isso de volta.
  let semResposta:any[]=[];
  let estimulosVistos=0;
  if(sessionId){
   const admin=createSupabaseAdminClient();
   if(admin){
    const[{data:linha},{data:acoes}]=await Promise.all([
     admin.from('challenge_sessions').select('world_state').eq('id',sessionId).maybeSingle(),
     admin.from('challenge_telemetry').select('character_id,channel,simulated_minute')
      .eq('session_id',sessionId).order('created_at')]);
    const mundo=(linha?.world_state||{})as any;
    const r=levantarOmissoes(mundo.events||[],
     (acoes||[]).map((a:any)=>({characterId:a.character_id,channel:a.channel,at:a.simulated_minute||0})),
     Number(mundo.minute)||0);
    estimulosVistos=r.estimulos.length;
    semResposta=r.semResposta.slice(0,12).map(e=>({
     de:e.de,canal:e.canal,assunto:e.assunto,trecho:e.trecho,minuto:e.minuto,urgencia:e.urgencia}));
   }
  }

  const input=JSON.stringify({
   output_contract:'Respond with valid JSON only. The response must be a JSON object.',
   seat,scenario:world?.title,elapsed_minutes:world?.elapsedMinutes,
   observable_actions:(telemetry||[]).map((entry:any)=>({action:entry.action,channel:entry.channel,character:entry.characterId,text:entry.text})),
   evidence:signals,
   stimuli_seen:estimulosVistos,
   stimuli_without_answer:semResposta
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
