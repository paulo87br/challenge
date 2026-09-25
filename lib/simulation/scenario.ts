import type{Character,Temperature,WorldState}from'./types';
import{initialWorld}from'./runtime';

// What the Studio can author today. Characters and their knowledge perimeter
// still live in code; this is the layer the instructor already expects to
// control, and it is the part the engine can consume without being rewritten.
export type ScenarioConfig={
 key:string;title:string;domain:string;seat_role:string;mission:string;
 world_description:string;temperature:Partial<Temperature>;duration_minutes:number;
 provider:string;model:string;
 // Authored in the Studio. Empty means "use the cast compiled into runtime.ts",
 // which is what every scenario did before personas became editable.
 characters:Character[];
 artifacts:Array<{name:string;ownerId:string;body:string;keywords:string[]}>;
 knowledge:Record<string,unknown>;
};

export const defaultScenario:ScenarioConfig={
 key:'atlas',title:initialWorld.title,domain:'AI Governance',seat_role:initialWorld.seat.role,
 mission:'conduza a decisão sobre a entrada do assistente de IA em produção.',
 world_description:'Empresa de médio porte preparando um assistente de IA generativa para produção. Existe pressão executiva, documentação incompleta e sinais de uso de dados reais no piloto.',
 temperature:initialWorld.temperature,duration_minutes:30,provider:'openai',model:'gpt-5.6',
 characters:[],artifacts:[],knowledge:{}
};

// A new world starts from the authored configuration. Existing sessions keep
// the world they were played in: editing a scenario must not rewrite history.
export{worldFor as worldFromScenario}from'./scenario-world';

export const TEMPERATURE_FIELDS:Array<{key:keyof Temperature;label:string;icon:string}>=[
 {key:'ambiguity',label:'Ambiguidade',icon:'🌫️'},
 {key:'timePressure',label:'Pressão de tempo',icon:'⏱️'},
 {key:'stakeholderConflict',label:'Conflito entre pessoas',icon:'⚡'},
 {key:'informationNoise',label:'Ruído de informação',icon:'📡'},
 {key:'technicalComplexity',label:'Complexidade técnica',icon:'🧩'},
 {key:'incidentSeverity',label:'Gravidade do incidente',icon:'🔥'}
];
