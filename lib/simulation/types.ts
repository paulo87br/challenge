export type Channel='mail'|'chat'|'assistant'|'files'|'calendar'|'world';
export type Temperature={ambiguity:number;timePressure:number;stakeholderConflict:number;informationNoise:number;technicalComplexity:number;incidentSeverity:number};
export type WorldEvent={id:string;channel:Channel;sender:string;subject?:string;body:string;urgency:number;visible:boolean;reason?:string;at:number};
export type TelemetryEvent={id:string;at:number;action:string;channel:Channel;objectId?:string;text?:string;metadata?:Record<string,unknown>};
export type WorldState={scenarioId:string;title:string;day:number;minute:number;seat:{role:string;authority:string[]};temperature:Temperature;facts:Record<string,unknown>;flags:Record<string,boolean>;events:WorldEvent[];telemetry:TelemetryEvent[]};
export type DirectorResult={summary:string;clock_advance_minutes:number;state_patch:{facts?:Record<string,unknown>;flags?:Record<string,boolean>};events:Array<Omit<WorldEvent,'id'|'at'>>};
export type EvidenceSignal={competency:string;behavior:string;evidence:string;strength:number;confidence:number;polarity:'positive'|'neutral'|'risk';corroboration_required:boolean};
export type ObserverResult={signals:EvidenceSignal[];uncovered_areas:string[]};
