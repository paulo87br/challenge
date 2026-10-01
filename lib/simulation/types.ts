export type Channel='mail'|'chat'|'feed'|'assistant'|'files'|'calendar'|'call'|'world';
export type Temperature={ambiguity:number;timePressure:number;stakeholderConflict:number;informationNoise:number;technicalComplexity:number;incidentSeverity:number};
export type CharacterTraits={directness:number;diplomacy:number;detailOrientation:number;politicalAwareness:number;riskAversion:number;technicalDepth:number;patience:number};
export type CharacterState={mood:string;trustInParticipant:number;pressure:number;knownFacts:string[];memory:string[]};
// 'reportsTo' é o id de quem esta pessoa responde, ou 'voce' para quem responde
// ao assento do participante. 'org' é a organização dela: vazio significa a
// mesma do participante, e é o que separa quem é de casa de quem é de fora --
// no caso jurídico, a fronteira entre a empresa e o escritório contratado é o
// próprio assunto da discussão.
export const ASSENTO='voce';
export type Character={id:string;name:string;role:string;seniority:string;influence:number;reportsTo?:string;org?:string;avatar?:string;voice?:string;voiceRegister?:'feminina'|'masculina'|'neutra';traits:CharacterTraits;goals:string[];concerns:string[];channels:Channel[];relationships:Record<string,string>;state:CharacterState};
export type WorldEvent={id:string;channel:Channel;sender:string;characterId?:string;recipientCharacterId?:string;subject?:string;body:string;urgency:number;visible:boolean;reason?:string;at:number;delay_minutes?:number;mentionedCharacterIds?:string[]};
export type TelemetryEvent={id:string;at:number;action:string;channel:Channel;objectId?:string;characterId?:string;text?:string;metadata?:Record<string,unknown>};
export type WorldState={scenarioId:string;title:string;day:number;minute:number;
 // Em que minuto o relógio do mundo começou. A imprensa autorada é escrita em
 // minutos depois do início, não em hora do dia: o mesmo cenário rodando em
 // outro horário entrega as notícias nos mesmos pontos da sessão.
 startMinute?:number;seat:{role:string;authority:string[]};temperature:Temperature;characters:Character[];facts:Record<string,unknown>;flags:Record<string,boolean>;events:WorldEvent[];telemetry:TelemetryEvent[]};
export type CharacterPatch={characterId:string;mood?:string;trustInParticipant?:number;pressure?:number;knownFactsAdd?:string[];memoryAdd?:string[]};
export type DirectorResult={summary:string;clock_advance_minutes:number;state_patch:{facts?:Record<string,unknown>;flags?:Record<string,boolean>;characters?:CharacterPatch[]};events:Array<Omit<WorldEvent,'id'|'at'>>};
export type EvidenceSignal={competency:string;behavior:string;evidence:string;strength:number;confidence:number;polarity:'positive'|'neutral'|'risk';corroboration_required:boolean};
export type ObserverResult={signals:EvidenceSignal[];uncovered_areas:string[]};
export type EngineLog={id:string;at:number;stage:string;status:'info'|'ok'|'warn'|'error';message:string;meta?:Record<string,unknown>;durationMs?:number};
export type TurnDiagnostic={severity:'ok'|'attention'|'error';headline:string;summary:string;checks:Array<{id:string;status:'ok'|'attention'|'error';label:string;detail:string}>;causalChain:Array<{stage:string;status:'ok'|'attention'|'error';detail:string}>;requestId:string;durationMs:number};
export type AssistantMessage={id:string;role:'you'|'ara';text:string;at:number};
export type UploadedFile={id:string;name:string;sender:string;at:number;body:string;kind:string;size:number};
// 'at' é minutos depois do início da sessão, não hora do dia.
export type NewsItem={id:string;source:string;at:number;headline:string;summary:string;article:string;tag?:string};
export type Debrief={headline:string;narrative:string;moves:Array<{action:string;effect:string}>;blind_spots:Array<{observation:string;why_it_matters:string}>;uncovered:string[];questions_to_sit_with:string[];generatedAt:number};
export type Competency={code:string;name:string;definition:string};
export type CompetencyProfile={code:string;name:string;definition:string;signals:number;
 positive:number;neutral:number;risk:number;meanConfidence:number;meanStrength:number;
 needsCorroboration:number;behaviors:string[]};
