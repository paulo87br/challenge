import OpenAI from 'openai';

export const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});

const configuredModel=process.env.OPENAI_MODEL?.trim();
export const model=configuredModel||'gpt-5.6';
