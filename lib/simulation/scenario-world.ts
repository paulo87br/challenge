import type{Character,WorldState}from'./types';
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
  // Seed events reference the original cast; a scenario with its own people
  // starts from a clean inbox rather than someone else's conversation.
  events:(scenario.characters as any[])?.length?[]:initialWorld.events};
}
