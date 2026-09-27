import type{Character}from'@/lib/simulation/types';

// The ten voices the Realtime API accepts. OpenAI does not label them by
// gender, so the grouping below is by how they are commonly perceived -- it is
// a starting point the instructor should confirm by listening, not a fact.
export const REALTIME_VOICES=['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'] as const;
export type VoiceRegister='feminina'|'masculina'|'neutra';

export const VOICE_POOLS:Record<VoiceRegister,string[]>={
 // marin and cedar first in each: OpenAI recommends them for quality, so the
 // first persona of each register gets the best voice available.
 feminina:['marin','coral','shimmer','sage','alloy'],
 masculina:['cedar','ash','echo','ballad','verse'],
 neutra:['alloy','sage','marin','cedar','ballad']
};

export const VOICE_LABELS:Record<string,string>={
 marin:'Marin — recomendada, percebida como feminina',
 coral:'Coral — percebida como feminina',
 shimmer:'Shimmer — percebida como feminina',
 sage:'Sage — percebida como feminina, mais grave',
 alloy:'Alloy — percebida como neutra',
 cedar:'Cedar — recomendada, percebida como masculina',
 ash:'Ash — percebida como masculina',
 echo:'Echo — percebida como masculina',
 ballad:'Ballad — percebida como masculina, mais suave',
 verse:'Verse — percebida como masculina'
};

// Rotation, not exclusivity: with more people than voices in a register the
// pool wraps, which is fine -- two colleagues can sound alike. What must not
// happen is everyone sounding identical, or a man answering in a woman's voice.
export function resolveVoice(character:Character,cast:Character[],fallback='marin'):string{
 const explicit=String((character as any).voice||'').trim();
 if(explicit&&(REALTIME_VOICES as readonly string[]).includes(explicit))return explicit;
 const register=((character as any).voiceRegister||'neutra') as VoiceRegister;
 const pool=VOICE_POOLS[register]||VOICE_POOLS.neutra;
 const sameRegister=cast.filter(person=>(((person as any).voiceRegister||'neutra') as VoiceRegister)===register);
 const index=Math.max(0,sameRegister.findIndex(person=>person.id===character.id));
 return pool[index%pool.length]||fallback;
}
