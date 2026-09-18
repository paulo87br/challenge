import{NextResponse}from'next/server';import{openai,model}from'@/lib/ai/openai';import{DIRECTOR_PROMPT,OBSERVER_PROMPT}from'@/lib/ai/prompts';import type{DirectorResult,WorldEvent,EngineLog}from'@/lib/simulation/types';

async function jsonResponse(instructions:string,input:unknown){
 const jsonInstructions=`${instructions}\n\nOUTPUT CONTRACT: Return valid JSON only. The response must be a JSON object.`;
 const r=await openai.responses.create({model,instructions:jsonInstructions,input:JSON.stringify(input),text:{format:{type:'json_object'}}});
 if(r.status==='failed')throw new Error(`model_failed:${r.error?.code||'unknown'}:${r.error?.message||'no_message'}`);
 if(r.status==='incomplete')throw new Error(`model_incomplete:${r.incomplete_details?.reason||'unknown'}`);
 if(!r.output_text)throw new Error(`empty_model_output:status=${r.status}`);
 try{return JSON.parse(r.output_text)}catch{throw new Error(`invalid_json_output:${r.output_text.slice(0,300)}`)}
}

export async function POST(req:Request){
 const requestId=crypto.randomUUID();
 const startedAt=Date.now();
 const logs:EngineLog[]=[];
 const log=(stage: string,status:EngineLog['status'],message:string,meta?:Record<string,unknown>)=>logs.push({id:crypto.randomUUID(),at:Date.now(),stage,status,message,meta});
 try{
  log('request','info','Turn received',{requestId});
  const{world,action}=await req.json();
  if(!world||!action)return NextResponse.json({error:'world_and_action_required'},{status:400});
  const target=action.characterId?world.characters?.find((c:any)=>c.id===action.characterId):null;
  log('context','ok','Context assembled',{channel:action.channel,action:action.action,targetCharacterId:action.characterId,target:target?.name,events:world.events?.length||0,telemetry:world.telemetry?.length||0});
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
  let director:DirectorResult;
  try{
   log('director','info','Calling Director',{model,history:conversationHistory.length});
   director=await jsonResponse(DIRECTOR_PROMPT,context);
   log('director','ok','Director returned',{summary:director.summary,clockAdvance:director.clock_advance_minutes,eventCount:director.events?.length||0,eventChannels:(director.events||[]).map((e:any)=>e.channel)});
   const chars=(world.characters||[]) as any[];
   const normalizeMentions=(events:any[])=>events.map((event:any)=>{
    if(event.channel!=='chat')return event;
    const mentioned=[...(event.mentionedCharacterIds||[])];
    for(const character of chars){
     const first=String(character.name||'').split(' ')[0];
     if(first&&String(event.body||'').toLocaleLowerCase().includes('@'+first.toLocaleLowerCase()))mentioned.push(character.id);
    }
    const unique=[...new Set(mentioned)].filter(Boolean);
    return{...event,mentionedCharacterIds:unique,recipientCharacterId:event.recipientCharacterId||unique[0]};
   });

   director.events=normalizeMentions(director.events||[]);
   log('mentions','info','Mentions normalized',{mentions:(director.events||[]).filter((e:any)=>e.channel==='chat'&&e.mentionedCharacterIds?.length).map((e:any)=>({sender:e.sender,recipient:e.recipientCharacterId,mentioned:e.mentionedCharacterIds,body:String(e.body).slice(0,180)}))});

   // A mention is an actual handoff between people, not just formatting.
   // If Rafael pulls Júlia into the thread, give Júlia her own turn immediately.
   // This keeps the simulation alive while still limiting the cascade to a small,
   // deterministic number of additional actors per participant action.
   const initialMentions=[...(director.events||[])]
    .filter((e:any)=>e.channel==='chat'&&e.mentionedCharacterIds?.length)
    .flatMap((e:any)=>e.mentionedCharacterIds as string[]);
   const cascadeIds=[...new Set(initialMentions)].slice(0,3);
   log('cascade','info','Cascade candidates identified',{ids:cascadeIds,names:cascadeIds.map(id=>chars.find((c:any)=>c.id===id)?.name).filter(Boolean)});
   for(const characterId of cascadeIds){
    const character=chars.find((c:any)=>c.id===characterId);
    if(!character){log('cascade','warn','Mentioned character not found',{characterId});continue;}
    log('cascade','info','Invoking mentioned character',{characterId,character:character.name});
    const alreadyReplied=(director.events||[]).some((e:any)=>e.channel==='chat'&&e.characterId===characterId);
    if(alreadyReplied){log('cascade','warn','Character already replied in generated events',{characterId,character:character.name});continue;}

    const cascadeHistory=[
     ...conversationHistory,
     ...(director.events||[]).filter((e:any)=>e.channel==='chat').map((e:any)=>({
      sender:e.sender,body:e.body,subject:e.subject,at:e.at,
      direction:e.sender==='Você'?'participant_to_character':'character_to_participant'
     }))
    ].slice(-24);

    const cascadeContext={
     world:{...world,telemetry:undefined,events:undefined},
     targetCharacter:character,
     conversationHistory:cascadeHistory,
     latestParticipantAction:action,
     recentTelemetry:[...(world.telemetry||[]).slice(-8),action],
     runtimeDirective:'You have just been brought into a live workplace chat by another character mentioning you. Respond as this character now. Read the latest message carefully and answer the concrete request. If the message asks you for a document or evidence you own, say what you can provide and, when appropriate, actually emit the files artifact in your events. Do not narrate the simulation. Return valid JSON.'
    };
    const follow=await jsonResponse(DIRECTOR_PROMPT,cascadeContext) as DirectorResult;
    log('cascade','ok','Mentioned character returned',{characterId,character:character.name,summary:follow.summary,eventCount:follow.events?.length||0,eventChannels:(follow.events||[]).map((e:any)=>e.channel)});
    const followEvents=normalizeMentions(follow.events||[]).map((e:any)=>({...e,delay_minutes:e.delay_minutes??0}));
    director.events=[...(director.events||[]),...followEvents];
    if(Number(follow.clock_advance_minutes)>Number(director.clock_advance_minutes))director.clock_advance_minutes=follow.clock_advance_minutes;
    if(follow.state_patch?.facts)director.state_patch.facts={...(director.state_patch?.facts||{}),...follow.state_patch.facts};
    if(follow.state_patch?.flags)director.state_patch.flags={...(director.state_patch?.flags||{}),...follow.state_patch.flags};
    if(follow.state_patch?.characters)director.state_patch.characters=[...(director.state_patch?.characters||[]),...follow.state_patch.characters];
   }

   // The current Atlas scenario has a known evidence path: Rafael can route
   // the request to Júlia, who owns the Dataset Manifest. If the chain clearly
   // asks for that artifact, make the artifact concrete rather than leaving
   // the participant with a promise that can never resolve.
   const allText=(director.events||[]).map((e:any)=>String(e.body||'')).join(' ');
   const asksManifest=/(manifest|tabelas|campos|dataset)/i.test(allText);
   log('artifact','info','Artifact detection evaluated',{asksManifest,hasRelevantText:/manifest|tabelas|campos|dataset/i.test(allText),generatedFiles:(director.events||[]).filter((e:any)=>e.channel==='files').map((e:any)=>({subject:e.subject,delay:e.delay_minutes,characterId:e.characterId}))});
   const hasManifest=director.events.some((e:any)=>e.channel==='files'&&/manifest|dataset/i.test(`${e.subject||''} ${e.body||''}`));
   if(asksManifest&&!hasManifest){
    const body=world.facts?.documentContents?.['Dataset Manifest']||'Dataset Manifest — conteúdo não disponível.';
    const owner=chars.find((c:any)=>c.id==='julia')||chars.find((c:any)=>c.id==='rafael');
    log('artifact','warn','Director did not emit manifest; deterministic scenario fallback creating it',{owner:owner?.name||'Data'});
    director.events=[...(director.events||[]),{
     channel:'files',
     sender:owner?.name||'Data',
     characterId:owner?.id||'julia',
     subject:'Dataset Manifest',
     body,
     urgency:.7,
     visible:true,
     reason:'Artefato liberado após a solicitação do participante.',
     delay_minutes:3
    }];
   }

   const artifactNotices:Array<Omit<WorldEvent,'id'|'at'>>=(director.events||[]).filter((e:any)=>e.channel==='files').flatMap((file:any)=>{
    const name=String(file.subject||'Documento');
    const alreadyNotifies=(director.events||[]).some((e:any)=>e.channel==='chat'&&/arquivos|files/i.test(String(e.body||''))&&String(e.body||'').toLowerCase().includes(name.toLowerCase()));
    if(alreadyNotifies)return [];
    const senderCharacter=chars.find((c:any)=>c.id===file.characterId);
    const sender=senderCharacter?String(senderCharacter.name):String(file.sender||'Equipe');
    return[{channel:'chat' as const,sender,characterId:file.characterId,recipientCharacterId:action.characterId,mentionedCharacterIds:[],subject:'Arquivo disponível',body:`O documento “${name}” já está disponível em Arquivos.`,urgency:.55,visible:true,reason:'Notificação de novo artefato.',delay_minutes:Number(file.delay_minutes)||0}];
   });
   director.events=[...(director.events||[]),...artifactNotices];
   log('artifact','ok','Artifact pipeline completed',{files:director.events.filter((e:any)=>e.channel==='files').map((e:any)=>({subject:e.subject,delay:e.delay_minutes,at:'assigned_on_apply'})),notifications:artifactNotices.map((e:any)=>({subject:e.subject,delay:e.delay_minutes}))});
  }catch(error){
   const message=error instanceof Error?error.message:String(error);
   console.error('director_generation_error',{model,message});
   log('director','error','Director pipeline failed',{message,elapsedMs:Date.now()-startedAt});
   return NextResponse.json({error:'director_generation_failed',detail:message,model,requestId,logs},{status:502});
  }
  log('observer','info','Starting Observer asynchronously');
  jsonResponse(OBSERVER_PROMPT,{seat:world.seat,temperature:world.temperature,targetCharacter:target,recentTelemetry:[...(world.telemetry||[]).slice(-12),action]}).catch(error=>console.error('observer_generation_error',error));
  log('request','ok','Turn completed',{requestId,elapsedMs:Date.now()-startedAt,totalEvents:director.events?.length||0});
  return NextResponse.json({director,engine:'llm',model,requestId,logs});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('turn_error',message);
  log('request','error','Turn failed',{message,elapsedMs:Date.now()-startedAt});
  return NextResponse.json({error:'turn_failed',detail:message,requestId,logs},{status:500})
 }
}
