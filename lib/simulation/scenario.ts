import type{Temperature,WorldState}from'./types';
import{initialWorld}from'./runtime';

// What the Studio can author today. Characters and their knowledge perimeter
// still live in code; this is the layer the instructor already expects to
// control, and it is the part the engine can consume without being rewritten.
export type ScenarioConfig={
 key:string;title:string;domain:string;seat_role:string;mission:string;
 world_description:string;temperature:Partial<Temperature>;duration_minutes:number;
};

export const defaultScenario:ScenarioConfig={
 key:'atlas',title:initialWorld.title,domain:'AI Governance',seat_role:initialWorld.seat.role,
 mission:'conduza a decisão sobre a entrada do assistente de IA em produção.',
 world_description:'Empresa de médio porte preparando um assistente de IA generativa para produção. Existe pressão executiva, documentação incompleta e sinais de uso de dados reais no piloto.',
 temperature:initialWorld.temperature,duration_minutes:30
};

// A new world starts from the authored configuration. Existing sessions keep
// the world they were played in: editing a scenario must not rewrite history.
export function worldFromScenario(scenario:ScenarioConfig|null):WorldState{
 if(!scenario)return initialWorld;
 return{...initialWorld,
  title:scenario.title||initialWorld.title,
  seat:{...initialWorld.seat,role:scenario.seat_role||initialWorld.seat.role},
  temperature:{...initialWorld.temperature,...(scenario.temperature||{})},
  facts:{...initialWorld.facts,mission:scenario.mission,worldDescription:scenario.world_description}};
}

export const TEMPERATURE_FIELDS:Array<{key:keyof Temperature;label:string;icon:string}>=[
 {key:'ambiguity',label:'Ambiguidade',icon:'🌫️'},
 {key:'timePressure',label:'Pressão de tempo',icon:'⏱️'},
 {key:'stakeholderConflict',label:'Conflito entre pessoas',icon:'⚡'},
 {key:'informationNoise',label:'Ruído de informação',icon:'📡'},
 {key:'technicalComplexity',label:'Complexidade técnica',icon:'🧩'},
 {key:'incidentSeverity',label:'Gravidade do incidente',icon:'🔥'}
];
