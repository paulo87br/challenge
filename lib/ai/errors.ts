// Two kinds of failure, and they need opposite treatment. A rate limit or a
// hiccup clears on its own, so the turn should wait and try again. A bad key or
// a model that does not exist will still be broken in an hour, so retrying just
// burns the participant's time -- that has to reach the instructor instead.
export type Failure={
 kind:'transient'|'blocking';
 code:string;
 message:string;
 retryAfterMs:number;
};

const BLOCKING:Array<[RegExp,string]>=[
 [/missing_key:(\w+)/i,'chave_ausente'],
 [/invalid[_ ]api[_ ]key|incorrect api key|unauthorized|401/i,'chave_invalida'],
 [/insufficient[_ ]quota|billing|payment|credit balance/i,'sem_credito'],
 [/model.*(not found|does not exist|decommissioned|no longer)/i,'modelo_inexistente'],
 [/does not exist or you do not have access/i,'modelo_inexistente'],
 [/permission|forbidden|403/i,'sem_permissao'],
 [/model_refusal/i,'recusa_do_modelo']
];
const TRANSIENT:Array<[RegExp,string]>=[
 [/rate limit|429|too many requests/i,'rate_limit'],
 [/timeout|timed out|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|socket hang up/i,'rede'],
 [/\b5\d\d\b|internal server error|bad gateway|service unavailable|overloaded/i,'servidor_do_provedor'],
 [/empty_model_output|invalid_json_output|model_incomplete/i,'saida_invalida']
];

// Providers put the wait in different places and different units. Reading it
// wrong means retrying too early and burning another attempt on the same 429.
export function retryAfterFrom(text:string){
 // "2m30s" first: a minutes-only pattern would read it as two minutes flat.
 const both=/([0-9.]+)\s*m\s*([0-9.]+)\s*s/i.exec(text);
 if(both)return clamp((parseFloat(both[1])*60+parseFloat(both[2]))*1000);
 const minutes=/(?:retry[- ]?after|try again in|wait)[^0-9]{0,12}([0-9.]+)\s*m(?:in)?\b/i.exec(text);
 if(minutes)return clamp(parseFloat(minutes[1])*60000);
 const seconds=/(?:retry[- ]?after|try again in|wait)[^0-9]{0,12}([0-9.]+)\s*s(?:ec)?/i.exec(text)
   ||/\bin ([0-9.]+)\s*s\b/i.exec(text)
   ||/retry[- ]?after[^0-9]{0,12}([0-9.]+)/i.exec(text);
 if(seconds)return clamp(parseFloat(seconds[1])*1000);
 return 0;
}
const clamp=(ms:number)=>Math.min(300000,Math.max(0,Math.round(ms)));

export function classify(error:unknown):Failure{
 const message=error instanceof Error?error.message:String(error);
 for(const[pattern,code]of BLOCKING)if(pattern.test(message))return{kind:'blocking',code,message,retryAfterMs:0};
 for(const[pattern,code]of TRANSIENT)if(pattern.test(message))
  return{kind:'transient',code,message,retryAfterMs:retryAfterFrom(message)};
 // Unknown failures are treated as transient once. If they keep happening the
 // retry budget runs out and it surfaces as an incident anyway.
 return{kind:'transient',code:'desconhecido',message,retryAfterMs:retryAfterFrom(message)};
}

export const FAILURE_LABELS:Record<string,string>={
 chave_ausente:'Chave de API não configurada',
 chave_invalida:'Chave de API inválida',
 sem_credito:'Sem crédito ou cota no provedor',
 modelo_inexistente:'O modelo escolhido não existe nesse provedor',
 sem_permissao:'Sem permissão para esse modelo',
 recusa_do_modelo:'O modelo recusou a requisição',
 rate_limit:'Limite de taxa do provedor',
 rede:'Falha de rede',
 servidor_do_provedor:'Erro no provedor',
 saida_invalida:'O modelo devolveu algo que não era JSON válido',
 desconhecido:'Falha não classificada'
};
