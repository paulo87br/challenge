import type{WorldEvent,WorldState}from'./types';

// Three independent gates decide whether the participant ever sees an event.
// They are pure functions so a reply that silently disappears can be pinned to
// the exact gate that swallowed it, in a test, instead of by reading logs.

// An event reaches the participant when it is marked visible and the simulated
// clock has caught up with it.
export function visibleEvents(world:WorldState):WorldEvent[]{
 return world.events.filter(event=>event.visible&&event.at<=world.minute);
}

/**
 * A conversa de uma pessoa é a conversa dela, e só.
 *
 * Isto era um fecho transitivo: marcar alguém ligava duas pessoas, a mensagem
 * seguinte puxava uma terceira pelo laço, e em poucos turnos todo o elenco
 * estava num fio só. Numa corrida real o resultado foi Lucas, Renato e Marta
 * conversando juntos sobre assuntos que não tinham em comum.
 *
 * Marcar alguém continua valendo: a mensagem aparece no fio de quem foi marcado
 * também, porque ele foi mesmo chamado ali. O que não acontece mais é os fios se
 * fundirem por causa disso.
 */
export function quemAparece(event:WorldEvent):string[]{
 return [event.characterId,event.recipientCharacterId,...(event.mentionedCharacterIds||[])]
  .filter(Boolean) as string[];
}

export function conversationMembers(_chats:WorldEvent[],selectedCharacterId:string):Set<string>{
 return new Set<string>([selectedCharacterId].filter(Boolean));
}

export function conversationChats(chats:WorldEvent[],members:Set<string>):WorldEvent[]{
 return chats.filter(event=>quemAparece(event).some(id=>members.has(id)));
}

/** Quem efetivamente apareceu neste fio, para a tela poder mostrar. */
export function participantesDoFio(chats:WorldEvent[],selectedCharacterId:string):string[]{
 const vistos=new Set<string>();
 for(const e of conversationChats(chats,new Set([selectedCharacterId])))
  for(const id of quemAparece(e))vistos.add(id);
 return [...vistos];
}
