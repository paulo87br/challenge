import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import{classify}from'./errors';

// Four providers behind one call. Three of them speak the OpenAI chat API and
// differ only by base URL; Anthropic has its own SDK and a different request
// shape, so it gets its own branch rather than an OpenAI-compatible shim.
export type ProviderId='groq'|'openai'|'anthropic'|'deepseek';

export type ModelOption={id:string;label:string;note?:string};

export const PROVIDERS:Record<ProviderId,{
 label:string;keyEnv:string;kind:'openai-compatible'|'anthropic';baseURL?:string;note:string;models:ModelOption[];
}>={
 groq:{label:'Groq',keyEnv:'GROQ_API_KEY',kind:'openai-compatible',baseURL:'https://api.groq.com/openai/v1',
  note:'Tem camada gratuita. O lugar barato para medir consumo antes de decidir.',
  // Verified against GET /v1/models on 2026-09-26. The Llama chat models this
  // list used to name no longer exist on Groq; Meta's remaining entries there
  // are prompt guards with a 512-token window, not conversational models.
  models:[{id:'openai/gpt-oss-120b',label:'GPT-OSS 120B',note:'contexto 131k · o mais capaz do catálogo'},
          {id:'qwen/qwen3.8-27b',label:'Qwen3.8 27B',note:'contexto 131k'},
          {id:'openai/gpt-oss-20b',label:'GPT-OSS 20B',note:'contexto 131k · o mais rápido'}]},
 openai:{label:'OpenAI',keyEnv:'OPENAI_API_KEY',kind:'openai-compatible',
  note:'O que o projeto usa hoje.',
  models:[{id:'gpt-5.6',label:'GPT-5.6'},{id:'gpt-4o',label:'GPT-4o'},{id:'gpt-4o-mini',label:'GPT-4o mini',note:'mais barato'}]},
 anthropic:{label:'Anthropic',keyEnv:'ANTHROPIC_API_KEY',kind:'anthropic',
  note:'Preços oficiais por milhão de tokens estão abaixo de cada modelo.',
  models:[{id:'claude-opus-5',label:'Claude Opus 5',note:'$5 entrada / $25 saída'},
          {id:'claude-sonnet-5',label:'Claude Sonnet 5',note:'$2 entrada / $10 saída'},
          {id:'claude-haiku-4-5',label:'Claude Haiku 4.5',note:'$1 entrada / $5 saída'}]},
 deepseek:{label:'DeepSeek',keyEnv:'DEEPSEEK_API_KEY',kind:'openai-compatible',baseURL:'https://api.deepseek.com',
  note:'Compatível com a API da OpenAI.',
  models:[{id:'deepseek-chat',label:'DeepSeek Chat'},{id:'deepseek-reasoner',label:'DeepSeek Reasoner'}]}
};

export const DEFAULT_PROVIDER:ProviderId='openai';
export function defaultModel(provider:ProviderId){return PROVIDERS[provider]?.models[0]?.id||'gpt-5.6'}
export function isProvider(value:unknown):value is ProviderId{return typeof value==='string'&&value in PROVIDERS}

export type Completion={text:string;usage:{inputTokens:number;outputTokens:number};provider:ProviderId;model:string};

function keyFor(provider:ProviderId){
 const key=process.env[PROVIDERS[provider].keyEnv]?.trim();
 if(!key)throw new Error(`missing_key:${PROVIDERS[provider].keyEnv}`);
 return key;
}

// A JSON contract in the system prompt is the only mechanism every provider
// shares. The OpenAI-compatible ones also get response_format, which the
// Responses API required the word "json" in the input for -- that requirement
// is what silently broke every Observer call for weeks.
const JSON_CONTRACT='\n\nOUTPUT CONTRACT: Return valid JSON only. The response must be a single JSON object, with no prose and no markdown fences around it.';

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

// A transient failure inside a turn is retried here rather than thrown at the
// participant. Blocking failures are rethrown immediately -- waiting does not
// fix a bad key, and every retry costs the person another few seconds.
export async function complete(params:{
 provider:ProviderId;model:string;instructions:string;input:string;json?:boolean;maxTokens?:number;attempts?:number;
 onRetry?:(info:{attempt:number;code:string;waitMs:number;message:string})=>void;
}):Promise<Completion>{
 const attempts=Math.max(1,params.attempts??3);
 let last:unknown;
 for(let attempt=1;attempt<=attempts;attempt++){
  try{return await callProvider(params)}
  catch(error){
   last=error;
   const failure=classify(error);
   if(failure.kind==='blocking'||attempt===attempts)throw error;
   // Honour the provider's own retry-after when it gives one; otherwise back
   // off geometrically. Capped so a turn cannot hang past the function budget.
   const waitMs=Math.min(8000,failure.retryAfterMs||Math.round(600*Math.pow(2,attempt-1)));
   params.onRetry?.({attempt,code:failure.code,waitMs,message:failure.message.slice(0,160)});
   await sleep(waitMs);
  }
 }
 throw last;
}

async function callProvider({provider,model,instructions,input,json=true,maxTokens=16000}:{
 provider:ProviderId;model:string;instructions:string;input:string;json?:boolean;maxTokens?:number;
}):Promise<Completion>{
 const config=PROVIDERS[provider];
 if(!config)throw new Error(`unknown_provider:${provider}`);
 const system=json?instructions+JSON_CONTRACT:instructions;

 if(config.kind==='anthropic'){
  const client=new Anthropic({apiKey:keyFor(provider)});
  const response=await client.messages.create({model,max_tokens:maxTokens,system,messages:[{role:'user',content:input}]});
  if(response.stop_reason==='refusal')throw new Error(`model_refusal:${response.stop_details?.category||'unknown'}`);
  const text=response.content.filter(block=>block.type==='text').map(block=>(block as any).text).join('');
  return{text,usage:{inputTokens:response.usage.input_tokens,outputTokens:response.usage.output_tokens},provider,model};
 }

 const client=new OpenAI({apiKey:keyFor(provider),baseURL:config.baseURL});
 const response=await client.chat.completions.create({
  model,max_tokens:maxTokens,
  ...(json?{response_format:{type:'json_object' as const}}:{}),
  messages:[{role:'system',content:system},{role:'user',content:input}]
 });
 const choice=response.choices?.[0];
 if(choice?.finish_reason==='length')throw new Error('model_incomplete:max_tokens');
 return{text:choice?.message?.content||'',
  usage:{inputTokens:response.usage?.prompt_tokens||0,outputTokens:response.usage?.completion_tokens||0},provider,model};
}

// Providers without a JSON mode wrap the object in fences often enough that
// failing the turn over it would be gratuitous.
export function parseJson(text:string){
 const trimmed=String(text||'').trim();
 const unfenced=trimmed.startsWith('```')?trimmed.replace(/^```[a-z]*\s*/i,'').replace(/```\s*$/,'').trim():trimmed;
 try{return JSON.parse(unfenced)}
 catch{
  const start=unfenced.indexOf('{'),end=unfenced.lastIndexOf('}');
  if(start>=0&&end>start){try{return JSON.parse(unfenced.slice(start,end+1))}catch{}}
  throw new Error(`invalid_json_output:${unfenced.slice(0,300)}`);
 }
}
