import type{WorldEvent,WorldState}from'./types';

// Three independent gates decide whether the participant ever sees an event.
// They are pure functions so a reply that silently disappears can be pinned to
// the exact gate that swallowed it, in a test, instead of by reading logs.

// An event reaches the participant when it is marked visible and the simulated
// clock has caught up with it.
export function visibleEvents(world:WorldState):WorldEvent[]{
 return world.events.filter(event=>event.visible&&event.at<=world.minute);
}

// A conversation is everyone transitively pulled into the thread: the selected
// character, whoever they addressed, and whoever got mentioned along the way.
export function conversationMembers(chats:WorldEvent[],selectedCharacterId:string):Set<string>{
 const members=new Set<string>([selectedCharacterId]);
 let changed=true;
 while(changed){
  changed=false;
  for(const event of chats){
   const people=[event.characterId,event.recipientCharacterId,...(event.mentionedCharacterIds||[])].filter(Boolean) as string[];
   if(people.some(id=>members.has(id)))for(const id of people)if(!members.has(id)){members.add(id);changed=true}
  }
 }
 return members;
}

export function conversationChats(chats:WorldEvent[],members:Set<string>):WorldEvent[]{
 return chats.filter(event=>event.sender==='Você'
  ?members.has(event.recipientCharacterId||'')
  :members.has(event.characterId||'')||members.has(event.recipientCharacterId||''));
}
