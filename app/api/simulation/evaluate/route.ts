import{NextResponse}from'next/server';import{openai,model}from'@/lib/ai/openai';import{EVALUATOR_PROMPT}from'@/lib/ai/prompts';
export async function POST(req:Request){const input=await req.json();const r=await openai.responses.create({model,instructions:EVALUATOR_PROMPT,input:JSON.stringify(input)});return NextResponse.json({output:r.output_text})}
