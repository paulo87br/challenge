import type{Character,WorldEvent,WorldState}from'./types';
import{initialWorld}from'./runtime';
import type{ScenarioConfig}from'./scenario';

// An artifact the world can hand over. "ownerId" is what replaces the hardcoded
// rule that Júlia owns the Dataset Manifest: the engine asks the scenario who
// holds a document instead of naming a person in code.
export type ScenarioArtifact={name:string;ownerId:string;body:string;keywords:string[]};

export function scenarioCharacters(scenario:ScenarioConfig|null):Character[]{
 const authored=scenario?.characters;
 return Array.isArray(authored)&&authored.length?authored as Character[]:initialWorld.characters;
}

export function scenarioArtifacts(scenario:ScenarioConfig|null):ScenarioArtifact[]{
 const authored=scenario?.artifacts;
 return Array.isArray(authored)?authored as ScenarioArtifact[]:[];
}

// Which artifact a sentence is asking for. Replaces the Atlas-specific
// /(manifest|tabela|campo|dataset)/ that fired on any scenario.
export function artifactFor(text:string,artifacts:ScenarioArtifact[]):ScenarioArtifact|undefined{
 const body=fold(text);
 if(!body)return undefined;
 return artifacts.find(artifact=>{
  const words=[artifact.name,...(artifact.keywords||[])].map(fold).filter(Boolean);
  return words.some(word=>word.length>3&&body.includes(word));
 });
}

export function fold(value:string){
 return String(value||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase();
}

export function worldFor(scenario:ScenarioConfig|null):WorldState{
 const characters=scenarioCharacters(scenario);
 if(!scenario)return{...initialWorld,startMinute:initialWorld.minute};
 return{...initialWorld,
  startMinute:initialWorld.minute,
  title:scenario.title||initialWorld.title,
  seat:{...initialWorld.seat,role:scenario.seat_role||initialWorld.seat.role},
  temperature:{...initialWorld.temperature,...(scenario.temperature||{})},
  characters,
  facts:{...initialWorld.facts,...(scenario.knowledge||{}),
   mission:scenario.mission,worldDescription:scenario.world_description,
   organizacao:(scenario as any).organization||'',
   // Os documentos do próprio cenário vinham por ...scenario.knowledge e eram
   // apagados aqui: a chave era reconstruída a partir dos documentos do Atlas
   // mais os artefatos. O mundo anunciava em documents_available três peças do
   // caso -- decisão, carta, contrato -- cujo conteúdo tinha virado outro. Um
   // cenário com gente própria não herda mais o acervo alheio, pela mesma razão
   // que não herda a caixa de entrada logo abaixo.
   documentContents:{
    ...((scenario.characters as any[])?.length?{}:(initialWorld.facts as any).documentContents),
    ...((scenario.knowledge as any)?.documentContents||{}),
    ...Object.fromEntries(scenarioArtifacts(scenario).map(a=>[a.name,a.body]))}},
  // Os eventos autorados do cenário, agendados a partir do início da sessão.
  //
  // Antes isto era só `[]` para qualquer cenário com elenco próprio: a regra
  // existia para não herdar a conversa de outro mundo, e acabou jogando fora
  // também o que o próprio mundo tinha a dizer. O resultado num teste real foi
  // uma caixa de entrada vazia e ninguém procurando o participante em 40
  // minutos -- o mundo só respondia, nunca acionava.
  events:eventosDoCenario(scenario)};
}

function eventosDoCenario(scenario:ScenarioConfig):WorldEvent[]{
 const autorados=(scenario as any)?.events;
 if(Array.isArray(autorados)&&autorados.length)
  return autorados
   .filter((e:any)=>e&&e.channel&&e.body)
   .map((e:any,i:number)=>({
    ...e,
    id:String(e.id||`evento-${i}`),
    urgency:Number(e.urgency)||0.5,
    visible:e.visible!==false,
    // 'at' é deslocamento do início, como na imprensa: um minuto absoluto
    // amarraria o cenário à hora em que o relógio do mundo começa.
    at:initialWorld.minute+Math.max(0,Number(e.at)||0)}));
 // Sem eventos próprios, um cenário com elenco começa limpo em vez de herdar a
 // conversa de outro mundo.
 return (scenario.characters as any[])?.length?[]:initialWorld.events;
}
