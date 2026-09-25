import{NextResponse}from'next/server';import{getOpenAI,getModel}from'@/lib/ai/openai';import{DIRECTOR_PROMPT,OBSERVER_PROMPT}from'@/lib/ai/prompts';import type{DirectorResult,WorldEvent,EngineLog,TurnDiagnostic,ObserverResult}from'@/lib/simulation/types';import{normalizeEvents}from'@/lib/simulation/normalize';import{recordTurn}from'@/lib/logs/store';import{recordTurnRows}from'@/lib/supabase/sessions';

async function jsonResponse(instructions:string,input:unknown){
 const jsonInstructions=`${instructions}\n\nOUTPUT CONTRACT: Return valid JSON only. The response must be a JSON object.`;
 // The Responses API rejects json_object formatting unless the word "json"
 // appears in the input itself; putting it only in the instructions is what was
 // failing every Observer call with a 400.
 const payload={output_contract:'Respond with valid JSON only. The response must be a JSON object.',data:input};
 const r=await getOpenAI().responses.create({model:getModel(),instructions:jsonInstructions,input:JSON.stringify(payload),text:{format:{type:'json_object'}}});
 if(r.status==='failed')throw new Error(`model_failed:${r.error?.code||'unknown'}:${r.error?.message||'no_message'}`);
 if(r.status==='incomplete')throw new Error(`model_incomplete:${r.incomplete_details?.reason||'unknown'}`);
 if(!r.output_text)throw new Error(`empty_model_output:status=${r.status}`);
 try{return JSON.parse(r.output_text)}catch{throw new Error(`invalid_json_output:${r.output_text.slice(0,300)}`)}
}

export async function POST(req:Request){
 const model=getModel();
 const requestId=crypto.randomUUID();
 const startedAt=Date.now();
 const logs:EngineLog[]=[];
 const log=(stage: string,status:EngineLog['status'],message:string,meta?:Record<string,unknown>)=>logs.push({id:crypto.randomUUID(),at:Date.now(),stage,status,message,meta});
 const buildDiagnostic=(director:DirectorResult,action:any,chars:any[],elapsed:number,observer:ObserverResult|null):TurnDiagnostic=>{
  const events=director.events||[]; const chats=events.filter((e:any)=>e.channel==='chat'); const files=events.filter((e:any)=>e.channel==='files');
  const mentions=[...new Set(chats.flatMap((e:any)=>e.mentionedCharacterIds||[]))];
  const cascaded=mentions.filter(id=>events.some((e:any)=>e.channel==='chat'&&e.characterId===id));
  const fallback=logs.some(l=>l.stage==='artifact'&&l.status==='warn'&&/fallback/i.test(l.message));
  const hasArtifact=files.length>0;
  const artifactNotice=chats.some((e:any)=>e.subject==='Arquivo disponível'||/já está disponível em Arquivos/i.test(String(e.body||'')));
  const checks:Array<TurnDiagnostic['checks'][number]>=[];
  // The failure this catches: the Director answers, the event is stored, and the
  // participant still sees silence because the reply was invisible, misattributed
  // or scheduled into the future.
  const addressed=action.characterId as string|undefined;
  const addressedName=addressed?(chars.find(c=>c.id===addressed)?.name||addressed):'';
  const answered=!addressed||events.some((e:any)=>e.channel==='chat'&&e.characterId===addressed&&e.visible!==false&&(Number(e.delay_minutes)||0)===0);
  checks.push({id:'reply',status:!addressed?'attention':answered?'ok':'error',label:'Resposta',detail:!addressed?'Nenhum personagem foi endereçado.':answered?`${addressedName} respondeu de forma visível.`:`${addressedName} não produziu resposta visível: o participante vê silêncio.`});
  checks.push({id:'director',status:'ok',label:'Director',detail:`${events.length} evento(s) gerado(s); avanço de ${Number(director.clock_advance_minutes)||0} min.`});
  checks.push({id:'mentions',status:mentions.length===0?'attention':'ok',label:'Menções',detail:mentions.length?`${mentions.length} pessoa(s) envolvida(s): ${mentions.map(id=>chars.find(c=>c.id===id)?.name||id).join(', ')}.`:'Nenhuma menção identificada no turno.'});
  checks.push({id:'cascade',status:mentions.length===0?'attention':cascaded.length===mentions.length?'ok':'error',label:'Cascata',detail:mentions.length===0?'Não houve handoff entre personagens.':`${cascaded.length}/${mentions.length} pessoa(s) mencionada(s) responderam.`});
  checks.push({id:'artifact',status:hasArtifact?'ok':fallback?'attention':'attention',label:'Artefatos',detail:hasArtifact?`${files.length} arquivo(s) gerado(s): ${files.map((e:any)=>e.subject||'Documento').join(', ')}.`:'Nenhum evento de arquivo foi gerado neste turno.'});
  checks.push({id:'notification',status:hasArtifact?(artifactNotice?'ok':'error'):'attention',label:'Notificação',detail:hasArtifact?(artifactNotice?'Notificação de Arquivos criada.':'Arquivo gerado sem notificação correspondente.'):'Sem arquivo para notificar.'});
  const signalCount=observer?.signals?.length||0;
  checks.push({id:'evidence',status:observer?(signalCount?'ok':'attention'):'error',label:'Evidência',detail:observer?(signalCount?`${signalCount} sinal(is) capturado(s): ${[...new Set(observer.signals.map(signal=>signal.competency))].join(', ')}.`:'Observer respondeu sem sinais neste turno.'):'Observer não retornou; nada foi capturado.'});
  const causalChain:TurnDiagnostic['causalChain']=[
   {stage:'ação',status:'ok',detail:`${action.channel}/${action.action}${action.characterId?` → ${chars.find(c=>c.id===action.characterId)?.name||action.characterId}`:''}`},
   {stage:'Director',status:'ok',detail:`${events.length} evento(s)`},
   {stage:'resposta',status:!addressed?'attention':answered?'ok':'error',detail:!addressed?'sem destinatário':answered?`${addressedName} respondeu`:`${addressedName} em silêncio`},
   {stage:'cascata',status:mentions.length===0?'attention':cascaded.length===mentions.length?'ok':'error',detail:mentions.length?`${cascaded.length}/${mentions.length} handoff(s) concluído(s)`:'nenhum handoff'},
   {stage:'artefato',status:hasArtifact?'ok':'attention',detail:hasArtifact?`${files.length} arquivo(s)`:fallback?'fallback não aplicado neste diagnóstico':'nenhum arquivo'},
   {stage:'Observer',status:observer?(signalCount?'ok':'attention'):'error',detail:observer?`${signalCount} sinal(is) de evidência`:'sem retorno'}
  ];
  let severity:TurnDiagnostic['severity']='ok'; let headline='Turno executado corretamente';
  if(!answered){severity='error';headline='Personagem endereçado não respondeu de forma visível';}
  else if(cascaded.length<mentions.length|| (hasArtifact&&!artifactNotice)){severity='error';headline='Turno executado com falha de cadeia';}
  else if(!hasArtifact&&fallback){severity='attention';headline='Turno executado com recuperação determinística';}
  else if(mentions.length===0&&!hasArtifact){severity='attention';headline='Turno sem efeitos encadeados';}
  const summary=severity==='ok'?`Fluxo completo: ${events.length} evento(s), ${mentions.length} menção(ões), ${files.length} artefato(s).`:`${headline}. ${checks.filter(c=>c.status!=='ok').map(c=>c.detail).join(' ')}`;
  return{severity,headline,summary,checks,causalChain,requestId,durationMs:elapsed};
 };
 try{
  log('request','info','Turn received',{requestId});
  const{world,action,sessionId}=await req.json();
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
  // The Observer reads telemetry only, so it does not depend on the Director.
  // Starting it here keeps evidence collection off the critical path: it runs
  // while the Director and the mention cascade are still talking to the model.
  log('observer','info','Observer started alongside Director');
  let observerError='';
  const observerPromise=jsonResponse(OBSERVER_PROMPT,{seat:world.seat,temperature:world.temperature,targetCharacter:target,recentTelemetry:[...(world.telemetry||[]).slice(-12),action]})
   .then(result=>result as ObserverResult)
   .catch(error=>{observerError=error instanceof Error?error.message:String(error);console.error('observer_generation_error',observerError);return null});

  let director:DirectorResult;
  try{
   log('director','info','Calling Director',{model,history:conversationHistory.length});
   director=await jsonResponse(DIRECTOR_PROMPT,context);
   log('director','ok','Director returned',{summary:director.summary,clockAdvance:director.clock_advance_minutes,eventCount:director.events?.length||0,eventChannels:(director.events||[]).map((e:any)=>e.channel)});
   const chars=(world.characters||[]) as any[];
   director.events=normalizeEvents(director.events||[],chars,action.characterId);
   log('events','info','Events normalized',{events:(director.events||[]).map((e:any)=>({channel:e.channel,sender:e.sender,characterId:e.characterId,recipientCharacterId:e.recipientCharacterId,visible:e.visible,delay:e.delay_minutes,body:String(e.body||'').slice(0,140)}))});
   log('mentions','info','Mentions normalized',{mentions:(director.events||[]).filter((e:any)=>e.channel==='chat'&&e.mentionedCharacterIds?.length).map((e:any)=>({sender:e.sender,recipient:e.recipientCharacterId,mentioned:e.mentionedCharacterIds,body:String(e.body).slice(0,180)}))});

   // Artifact truth is event-based: conversational claims cannot make a file exist.
   // In the Atlas scenario Rafael must not "open" or "confirm" the manifest before
   // Júlia has actually handed it over. Convert that hallucinated state into the
   // causal handoff the world requires.
   const existingFiles=()=>director.events.filter((e:any)=>e.channel==='files');
   // This used to match a bare "confirma", so a correct answer about who owns
   // privacy was destroyed because it contained "confirmação". A claim only
   // counts when the sentence is about the artifact AND asserts possession.
   const artifactNoun=/(manifest|dataset|documento|arquivo|planilha|relatório)/i;
   const possessionClaim=/(abri|abriu|aberto|recebi|recebemos|em m[ãa]os|anexei|anexado|encontrei|já (?:está|esta) dispon[íi]vel|ja (?:está|esta) dispon[íi]vel)/i;
   const artifactClaim=(body:string)=>artifactNoun.test(body)&&possessionClaim.test(body);
   const rafael=chars.find((c:any)=>c.id==='rafael');
   const julia=chars.find((c:any)=>c.id==='julia');
   if(action.characterId==='rafael'&&rafael&&julia&&existingFiles().length===0){
    const hallucinated=director.events.filter((e:any)=>e.channel==='chat'&&e.characterId==='rafael'&&artifactClaim(String(e.body||'')));
    if(hallucinated.length){
     for(const event of hallucinated){
      event.body='Ainda não tenho o Dataset Manifest em mãos. @Júlia, consegue me enviar o manifest original do recorte que foi carregado? Preciso confirmar exatamente quais dados e identificadores entraram no ambiente de homologação antes de fechar esse ponto com compliance.';
      event.mentionedCharacterIds=[julia.id];
      event.recipientCharacterId=julia.id;
     }
     log('causality','warn','Blocked unsupported artifact claim and converted it into a Júlia handoff',{from:'rafael',to:'julia',reason:'no files event existed',replaced:hallucinated.map((e:any)=>String(e.body||'').slice(0,160))});
    }
   }

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
    let followEvents=normalizeEvents(follow.events||[],chars,characterId).map((e:any)=>({...e,delay_minutes:e.delay_minutes??0}));
    const manifest=world.facts?.documentContents?.['Dataset Manifest'];
    const ownsManifest=characterId==='julia'&&Boolean(manifest);
    const sourceRequest=[...cascadeHistory].reverse().find((e:any)=>e.direction==='character_to_participant'||e.sender===rafael?.name||e.sender===action.characterId);
    const requestsManifest=ownsManifest&&/(manifest|tabela|campo|dataset|dados|identificad)/i.test(String(sourceRequest?.body||''));
    const characterSpoke=followEvents.some((e:any)=>e.channel==='chat'&&e.characterId===characterId);
    if(!characterSpoke){
      log('cascade','warn','Mentioned character produced no chat event; deterministic response fallback',{characterId,character:character.name});
      const sourceCharacter=chars.find((c:any)=>c.id===action.characterId);
      const firstName=String(sourceCharacter?.name||'Rafael').split(' ')[0];
      followEvents.push({channel:'chat',sender:character.name,characterId,recipientCharacterId:action.characterId,mentionedCharacterIds:action.characterId?[action.characterId]:[],subject:undefined,body:requestsManifest?('@'+firstName+', encontrei o Dataset Manifest. Estou te enviando o manifest original, com a origem, tabelas e campos do recorte.'):'Entendi. Posso ajudar com essa solicitação e vou verificar a informação disponível no meu contexto.',urgency:.65,visible:true,reason:'Fallback de continuidade do handoff.',delay_minutes:0});
    }
    // A chat claim such as 'te enviei' never substitutes for the files event.
    if(requestsManifest&&!followEvents.some((e:any)=>e.channel==='files'&&/manifest/i.test(String(e.subject||e.body||'')))){
      followEvents.push({channel:'files',sender:character.name,characterId,subject:'Dataset Manifest',body:String(manifest),urgency:.7,visible:true,reason:'Artefato liberado pela responsável pelo dataset.',delay_minutes:3});
      log('artifact','warn','Manifest generated by causal handoff fallback',{characterId,subject:'Dataset Manifest',delay_minutes:3});
    }
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
   const handoffToJulia=director.events.some((e:any)=>e.channel==='chat'&&e.mentionedCharacterIds?.includes('julia')&&/(manifest|tabela|campo|dataset|dados|identificad)/i.test(String(e.body||'')));
   const asksManifest=handoffToJulia;
   log('artifact','info','Artifact detection evaluated',{asksManifest,handoffToJulia,generatedFiles:(director.events||[]).filter((e:any)=>e.channel==='files').map((e:any)=>({subject:e.subject,delay:e.delay_minutes,characterId:e.characterId}))});
   const hasManifest=director.events.some((e:any)=>e.channel==='files'&&/manifest|dataset/i.test(`${e.subject||''} ${e.body||''}`));
   if(asksManifest&&!hasManifest){
    const body=world.facts?.documentContents?.['Dataset Manifest']||'Dataset Manifest — conteúdo não disponível.';
    const owner=chars.find((c:any)=>c.id==='julia');
    if(owner){
     log('artifact','info','Manifest requested from Júlia; waiting for owner response',{owner:owner.name});
    }
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

   // A chat message saying the document is in Arquivos must not arrive before
   // the files event it announces. The Director schedules artifacts a few
   // minutes out, so without this the participant is told to look at a folder
   // that is still empty.
   const fileDelays=(director.events||[]).filter((e:any)=>e.channel==='files').map((e:any)=>Number(e.delay_minutes)||0);
   if(fileDelays.length){
    const earliestFile=Math.min(...fileDelays);
    for(const event of director.events as any[]){
     if(event.channel!=='chat')continue;
     // Only an availability claim has to wait. "Vou colocar em Arquivos" is a
     // promise and should stay immediate; "já está disponível" is the lie.
     if(!/(j[áa]\s+est[áa]\s+dispon[íi]vel|dispon[íi]vel em arquivos|est[áa]\s+em arquivos)/i.test(String(event.body||'')))continue;
     const current=Number(event.delay_minutes)||0;
     if(current<earliestFile){
      log('causality','warn','Delayed an availability notice to match its artifact',{from:current,to:earliestFile,body:String(event.body||'').slice(0,120)});
      event.delay_minutes=earliestFile;
     }
    }
   }
   log('artifact','ok','Artifact pipeline completed',{files:director.events.filter((e:any)=>e.channel==='files').map((e:any)=>({subject:e.subject,delay:e.delay_minutes,at:'assigned_on_apply'})),notifications:artifactNotices.map((e:any)=>({subject:e.subject,delay:e.delay_minutes}))});
  }catch(error){
   const message=error instanceof Error?error.message:String(error);
   console.error('director_generation_error',{model,message});
   log('director','error','Director pipeline failed',{message,elapsedMs:Date.now()-startedAt});
   return NextResponse.json({error:'director_generation_failed',detail:message,model,requestId,logs},{status:502});
  }
  const observer=await observerPromise;
  log('observer',observer?'ok':'warn',observer?'Observer returned':'Observer failed; turn continues without evidence',{signals:observer?.signals?.length||0,uncovered:observer?.uncovered_areas?.length||0,competencies:[...new Set((observer?.signals||[]).map(signal=>signal.competency))],error:observerError||undefined});
  const durationMs=Date.now()-startedAt;
  const diagnostic=buildDiagnostic(director,action,world.characters||[],durationMs,observer);
  log('diagnostic',diagnostic.severity==='error'?'error':diagnostic.severity==='attention'?'warn':'ok','Turn diagnosis',{severity:diagnostic.severity,headline:diagnostic.headline,durationMs});
  log('request','ok','Turn completed',{requestId,elapsedMs:durationMs,totalEvents:director.events?.length||0});
  // Local history, mirroring the shape the Supabase tables will have. Best
  // effort: a read-only filesystem must not cost the participant their turn.
  const stored=await recordTurn({requestId,durationMs,model,action,diagnostic,logs,events:(director.events||[]) as any[],observer});
  // Evidence goes up with the service role: the policies give the participant
  // no insert on it, so the assessment record cannot be forged from the browser.
  const remote=sessionId?await recordTurnRows(String(sessionId),action,observer?.signals||[],world?.minute):'unavailable';
  log('history',stored==='saved'?'ok':'warn',`Turn history ${stored}`,{requestId,store:'sqlite',supabase:remote});
  return NextResponse.json({director,observer,engine:'llm',model,requestId,logs,diagnostic});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('turn_error',message);
  log('request','error','Turn failed',{message,elapsedMs:Date.now()-startedAt});
  return NextResponse.json({error:'turn_failed',detail:message,requestId,logs},{status:500})
 }
}
