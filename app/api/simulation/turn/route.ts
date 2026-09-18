import{NextResponse}from'next/server';import{openai,model}from'@/lib/ai/openai';import{DIRECTOR_PROMPT,OBSERVER_PROMPT}from'@/lib/ai/prompts';

async function jsonResponse(instructions:string,input:unknown){
 const jsonInstructions=`${instructions}\n\nOUTPUT CONTRACT: Return valid JSON only. The response must be a JSON object.`;
 const r=await openai.responses.create({model,instructions:jsonInstructions,input:JSON.stringify(input),text:{format:{type:'json_object'}}});
 if(r.status==='failed')throw new Error(`model_failed:${r.error?.code||'unknown'}:${r.error?.message||'no_message'}`);
 if(r.status==='incomplete')throw new Error(`model_incomplete:${r.incomplete_details?.reason||'unknown'}`);
 if(!r.output_text)throw new Error(`empty_model_output:status=${r.status}`);
 try{return JSON.parse(r.output_text)}catch{throw new Error(`invalid_json_output:${r.output_text.slice(0,300)}`)}
}

export async function POST(req:Request){
 try{
  const{world,action}=await req.json();
  if(!world||!action)return NextResponse.json({error:'world_and_action_required'},{status:400});
  const target=action.characterId?world.characters?.find((c:any)=>c.id===action.characterId):null;
  const conversationHistory=(world.events||[]).filter((e:any)=>{
   if(action.channel==='chat')return e.channel==='chat'&&(e.characterId===action.characterId||e.recipientCharacterId===action.characterId);
   if(action.channel==='mail')return e.channel==='mail'&&(e.characterId===action.characterId||e.recipientCharacterId===action.characterId);
   return false
  }).slice(-20).map((e:any)=>({sender:e.sender,body:e.body,subject:e.subject,at:e.at,direction:e.sender==='Você'?'participant_to_character':'character_to_participant'}));
  const context={
   world:{...world,telemetry:undefined,events:undefined},
   targetCharacter:target||undefined,
   conversationHistory,
   latestParticipantAction:action,
   recentTelemetry:[...(world.telemetry||[]).slice(-8),action],
   runtimeDirective:'This is a live professional simulation. Continue the conversation as the target character. Reason from the scenario, the character knowledge perimeter and conversation history. Answer the exact latest question, add useful detail when supported, distinguish what the character knows from what they infer, and never repeat the previous answer merely because the topic is similar. If a detail is unknown, identify the realistic source/person/artifact that would contain it. Generate the character response now. Return the result as valid JSON.'
  };
  let director;
  try{
   director=await jsonResponse(DIRECTOR_PROMPT,context);
   const chars=(world.characters||[]) as any[];
   const normalizedEvents=(director.events||[]).map((event:any)=>{
    if(event.channel!=='chat')return event;
    const mentioned=[...(event.mentionedCharacterIds||[])];
    for(const character of chars){
     const first=String(character.name||'').split(' ')[0];
     if(first&&String(event.body||'').toLocaleLowerCase().includes('@'+first.toLocaleLowerCase()))mentioned.push(character.id);
    }
    const unique=[...new Set(mentioned)].filter(Boolean);
    return{...event,mentionedCharacterIds:unique,recipientCharacterId:event.recipientCharacterId||unique[0]};
   });
   director.events=normalizedEvents;
   const requestText=String(action.text||'').toLowerCase();
   const asksManifest=/manifest|tabelas|campos|dataset/.test(requestText);
   const hasManifest=director.events.some((e:any)=>e.channel==='files'&&/manifest|dataset/i.test(`${e.subject||''} ${e.body||''}`));
   if(asksManifest&&!hasManifest){
    const body=world.facts?.documentContents?.['Dataset Manifest']||'Dataset Manifest — conteúdo não disponível.';
    director.events=[...director.events,{channel:'files',sender:'Rafael Lima · Engineering',characterId:action.characterId||'rafael',subject:'Dataset Manifest',body,urgency:.7,visible:true,reason:'Artefato liberado após a solicitação do participante.',delay_minutes:Math.max(2,Math.min(10,Number(director.clock_advance_minutes)||5))}];
   }
   const artifactNotices=(director.events||[]).filter((e:any)=>e.channel==='files').flatMap((file:any)=>{
    const name=String(file.subject||'Documento');
    const alreadyNotifies=(director.events||[]).some((e:any)=>e.channel==='chat'&&/arquivos|files/i.test(String(e.body||''))&&String(e.body||'').toLowerCase().includes(name.toLowerCase()));
    if(alreadyNotifies)return [];
    const senderCharacter=chars.find((c:any)=>c.id===file.characterId);
    const sender=senderCharacter?String(senderCharacter.name):String(file.sender||'Equipe');
    return[{channel:'chat',sender,characterId:file.characterId,recipientCharacterId:action.characterId,mentionedCharacterIds:[],subject:'Arquivo disponível',body:`O documento “${name}” já está disponível em Arquivos.`,urgency:.55,visible:true,reason:'Notificação de novo artefato.',delay_minutes:Number(file.delay_minutes)||0}];
   });
   director.events=[...(director.events||[]),...artifactNotices];
  }catch(error){
   const message=error instanceof Error?error.message:String(error);
   console.error('director_generation_error',{model,message});
   return NextResponse.json({error:'director_generation_failed',detail:message,model},{status:502});
  }
  jsonResponse(OBSERVER_PROMPT,{seat:world.seat,temperature:world.temperature,targetCharacter:target,recentTelemetry:[...(world.telemetry||[]).slice(-12),action]}).catch(error=>console.error('observer_generation_error',error));
  return NextResponse.json({director,engine:'llm',model});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('turn_error',message);
  return NextResponse.json({error:'turn_failed',detail:message},{status:500})
 }
}
