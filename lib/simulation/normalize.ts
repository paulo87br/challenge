import type{Character}from'./types';

// The Director is a language model: it is loose with characterId, visible and
// delay_minutes. The workspace is strict about all three, so an event one
// missing field away from correct disappears without a trace. Everything the
// model produces passes through here first.

// Nobody types "Júlia" with the accent in a hurry, and the engine must still
// route the handoff. Compare names with diacritics folded away.
function fold(value:string){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase()}

function resolveCharacterId(event:any,characters:Character[]){
 if(event.characterId&&characters.some(character=>character.id===event.characterId))return event.characterId;
 const sender=fold(event.sender);
 if(!sender)return event.characterId;
 const match=characters.find(character=>{
  const name=fold(character.name);
  const first=name.split(' ')[0]||'';
  return Boolean(name)&&(sender.includes(name)||(first.length>2&&sender.includes(first)));
 });
 return match?.id||event.characterId;
}

export function normalizeEvents(events:any[],characters:Character[],addressedCharacterId?:string):any[]{
 return events.map(event=>{
  const characterId=resolveCharacterId(event,characters);
  // An event nobody can see is the same as no event at all: only an explicit
  // false keeps something hidden.
  const visible=event.visible!==false;
  // The clock only moves when the participant acts, so a delayed reply from the
  // character they just addressed would stay invisible until they spoke again,
  // which reads as being ignored.
  const answersParticipant=event.channel==='chat'&&Boolean(characterId)&&characterId===addressedCharacterId;
  const delay=answersParticipant?0:Math.max(0,Number(event.delay_minutes)||0);
  const normalized={...event,characterId,visible,delay_minutes:delay};
  if(event.channel!=='chat')return normalized;
  // An "@Júlia" written in the body is a real handoff, not just formatting.
  const mentioned=[...(normalized.mentionedCharacterIds||[])];
  const body=fold(event.body);
  for(const character of characters){
   const first=fold(String(character.name||'').split(' ')[0]);
   if(first&&body.includes('@'+first))mentioned.push(character.id);
  }
  const unique=[...new Set(mentioned)].filter(Boolean);
  return{...normalized,mentionedCharacterIds:unique,recipientCharacterId:normalized.recipientCharacterId||unique[0]};
 });
}
