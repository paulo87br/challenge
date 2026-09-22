import OpenAI from 'openai';

let client:OpenAI|null=null;

// The client is created on first use, not at module load. A module-level
// `new OpenAI(...)` throws whenever OPENAI_API_KEY is absent, which breaks
// `next build` while it collects page data for these routes.
export function getOpenAI(){
 if(client)return client;
 const apiKey=process.env.OPENAI_API_KEY?.trim();
 if(!apiKey)throw new Error('Missing OPENAI_API_KEY');
 client=new OpenAI({apiKey});
 return client;
}

export function getModel(){return process.env.OPENAI_MODEL?.trim()||'gpt-5.6';}
