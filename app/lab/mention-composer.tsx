'use client';
import{useState}from'react';import type{KeyboardEvent}from'react';
import type{Character}from'@/lib/simulation/types';

const TRAILING_MENTION=/@([\p{L}]*)$/u;

// Nobody types "Júlia" with the accent in a hurry, and the engine must still
// route the handoff. Compare names with diacritics folded away.
function fold(value:string){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase()}


// Marking someone is a real act in this world: it pulls that person into the
// thread. The participant needs the same affordance the characters already have.
export function mentionedCharacterIds(text:string,characters:Character[]){
 const body=fold(text);
 return characters.filter(character=>{
  const first=fold(String(character.name||'').split(' ')[0]);
  return Boolean(first)&&body.includes('@'+first);
 }).map(character=>character.id);
}

export function MentionComposer({value,onChange,onSubmit,characters,disabled,placeholder,label}:{
 value:string;onChange:(next:string)=>void;onSubmit:()=>void;characters:Character[];
 disabled:boolean;placeholder:string;label:string;
}){
 const[highlighted,setHighlighted]=useState(0);
 const match=TRAILING_MENTION.exec(value);
 const query=match?fold(match[1]):null;
 const suggestions=query===null?[]:characters.filter(character=>
  fold(character.name).includes(query)||fold(character.role).includes(query)).slice(0,5);
 const active=suggestions[Math.min(highlighted,suggestions.length-1)];

 function pick(character:Character){
  onChange(value.replace(TRAILING_MENTION,'@'+String(character.name).split(' ')[0]+' '));
  setHighlighted(0);
 }
 function onKeyDown(event:KeyboardEvent){
  if(suggestions.length){
   if(event.key==='ArrowDown'){event.preventDefault();setHighlighted(current=>(current+1)%suggestions.length);return}
   if(event.key==='ArrowUp'){event.preventDefault();setHighlighted(current=>(current-1+suggestions.length)%suggestions.length);return}
   if((event.key==='Enter'&&!event.ctrlKey)||event.key==='Tab'){if(active){event.preventDefault();pick(active);return}}
   if(event.key==='Escape'){event.preventDefault();onChange(value.replace(TRAILING_MENTION,''));return}
  }
  if(event.key==='Enter'&&event.ctrlKey){event.preventDefault();onSubmit()}
 }

 return <div className="composer mention-composer">
  {suggestions.length>0&&<ul className="mention-list" role="listbox" aria-label="Marcar pessoa">
   {suggestions.map((character,index)=><li key={character.id}>
    <button type="button" className={'mention-option '+(character.id===active?.id?'active':'')}
     onMouseDown={event=>{event.preventDefault();pick(character)}} role="option" aria-selected={character.id===active?.id}>
     <span className="person-avatar">{character.name.split(' ').map(part=>part[0]).slice(0,2).join('')}</span>
     <span><b>{character.name}</b><small>{character.role}</small></span>
    </button></li>)}
  </ul>}
  <input className="input" value={value} onChange={event=>onChange(event.target.value)} onKeyDown={onKeyDown}
   placeholder={placeholder} aria-label={label} autoComplete="off"/>
  <kbd className="shortcut">@ marca alguém · Ctrl + Enter</kbd>
  <button disabled={disabled} onClick={onSubmit} className="btn primary">{disabled?'Pensando…':'Enviar'}</button>
 </div>;
}
