import{CALL_PROMPT}from'@/lib/ai/prompts';
import type{Character}from'@/lib/simulation/types';

// Verified against the Realtime WebRTC guide rather than written from memory:
// the secret is minted at /v1/realtime/client_secrets and the browser posts its
// SDP offer to /v1/realtime/calls with that secret as a bearer token.
export const REALTIME_MINT_URL='https://api.openai.com/v1/realtime/client_secrets';
export const REALTIME_CALL_URL='https://api.openai.com/v1/realtime/calls';
export const REALTIME_MODEL=process.env.OPENAI_REALTIME_MODEL?.trim()||'gpt-realtime-2.1';

// Voice is OpenAI-only: Groq has Whisper and Orpheus, but Orpheus speaks
// English and Arabic, so a Portuguese pipeline there is not possible either.
export function callKey(){
 const key=process.env.OPENAI_API_KEY?.trim();
 if(!key)throw new Error('missing_key:OPENAI_API_KEY');
 return key;
}

// The same knowledge perimeter the chat enforces. Without this a character who
// cannot discuss something in writing discusses it happily on the phone, and
// the world stops being one world.
export type HistoricoDaLigacao={canal:string;de:string;texto:string}[];

export function callInstructions(character:Character,world:{title?:string;seatRole?:string;facts?:Record<string,unknown>;
 historico?:HistoricoDaLigacao;emVolta?:HistoricoDaLigacao;imprensa?:string[]}){
 const catalog=(world.facts as any)?.knowledgeCatalog||{};
 const known=(character.state?.knownFacts||[]).map(fact=>{
  const meaning=catalog[fact];
  return meaning?`- ${fact}: ${meaning}`:`- ${fact}`;
 }).join('\n')||'- (esta pessoa não recebeu fatos específicos)';
 const traits=Object.entries(character.traits||{}).map(([key,value])=>`${key} ${Math.round(Number(value)*100)}%`).join(', ');
 return [CALL_PROMPT,
  `\nVOCÊ É: ${character.name}, ${character.role}${character.seniority?` (${character.seniority})`:''}.`,
  `Humor agora: ${character.state?.mood||'neutro'}. Confiança em quem ligou: ${Math.round((character.state?.trustInParticipant??.5)*100)}%. Pressão: ${Math.round((character.state?.pressure??.4)*100)}%.`,
  traits?`Traços: ${traits}.`:'',
  character.goals?.length?`Seus objetivos: ${character.goals.join('; ')}.`:'',
  character.concerns?.length?`Suas preocupações: ${character.concerns.join('; ')}.`:'',
  `\nQUEM LIGOU: ocupa o assento de ${world.seatRole||'um papel interno'} nesta organização. Contexto: ${world.title||'o projeto em curso'}.`,
  `\nO QUE VOCÊ SABE (seu perímetro; nada além disto):\n${known}`,
  // Sem isto a ligação começava do zero: a pessoa tinha trocado e-mails a manhã
  // inteira com este personagem e ele atendia sem lembrar de nada. Os canais
  // eram mundos separados.
  world.historico?.length
   ?`\nO QUE VOCÊS JÁ TRATARAM (por escrito, antes desta ligação — você lembra disto):\n`+
    world.historico.slice(-14).map(l=>`[${l.canal}] ${l.de}: ${l.texto}`).join('\n')
   :'\nVocês ainda não trocaram nenhuma mensagem antes desta ligação.',
  world.emVolta?.length
   ?`\nO QUE ACONTECEU EM VOLTA (outras pessoas, no mesmo caso — você sabe disto só se couber no seu perímetro):\n`+
    world.emVolta.slice(-8).map(l=>`[${l.canal}] ${l.de}: ${l.texto}`).join('\n')
   :'',
  world.imprensa?.length
   ?`\nO QUE SAIU NA IMPRENSA (repercussão deste mesmo caso, não um caso novo):\n`+
    world.imprensa.map(t=>`- ${t}`).join('\n')
   :'',
  `\nNunca trate uma manchete como um incidente separado, e nunca invente fato que não esteja acima.`,
  `\nComece atendendo o telefone como esta pessoa atenderia, em uma frase curta. Se já falaram por escrito, atenda como quem está continuando um assunto, não como quem nunca ouviu falar.`
 ].filter(Boolean).join('\n');
}

export type MintedCall={value:string;expiresAt:number|null};

export async function mintCallSecret(params:{instructions:string;voice:string;sessionHint:string}):Promise<MintedCall>{
 const response=await fetch(REALTIME_MINT_URL,{method:'POST',
  headers:{Authorization:`Bearer ${callKey()}`,'content-type':'application/json',
   // Ties abuse reports back to a session without sending us any personal data.
   'OpenAI-Safety-Identifier':params.sessionHint},
  body:JSON.stringify({session:{
   type:'realtime',model:REALTIME_MODEL,instructions:params.instructions,
   audio:{
    input:{
     // Without this the participant's own words never come back as text, and a
     // call would produce no evidence at all.
     transcription:{model:'gpt-4o-transcribe',language:'pt'},
     turn_detection:{type:'semantic_vad',interrupt_response:true}
    },
    output:{voice:params.voice}
   }
  }})});
 const text=await response.text();
 if(!response.ok)throw new Error(`realtime_mint_failed:${response.status}:${text.slice(0,300)}`);
 let parsed:any; try{parsed=JSON.parse(text)}catch{throw new Error(`realtime_mint_unparseable:${text.slice(0,200)}`)}
 const value=parsed?.value||parsed?.client_secret?.value;
 if(!value)throw new Error(`realtime_mint_no_secret:${text.slice(0,200)}`);
 const expires=parsed?.expires_at||parsed?.client_secret?.expires_at;
 return{value,expiresAt:expires?Number(expires)*1000:null};
}
