'use client';
import{useState}from'react';import type{KeyboardEvent}from'react';import{Sparkles}from'lucide-react';
import type{AssistantMessage}from'@/lib/simulation/types';

export function AssistantScreen({messages,busy,onSend}:{messages:AssistantMessage[];busy:boolean;onSend:(text:string)=>void}){
 const[text,setText]=useState('');
 function submit(){const question=text.trim();if(!question||busy)return;setText('');onSend(question)}
 function onKeyDown(event:KeyboardEvent){if(event.key==='Enter'&&event.ctrlKey){event.preventDefault();submit()}}
 return <section className="panel chat assistant-shell">
  <div className="conversation-head"><div className="eyebrow">ARA · ASSISTENTE DE IA</div><h2>O que você quer descobrir?</h2><span className="muted">A Ara só conhece o que está disponível para você neste mundo.</span></div>
  <div className="chat-history">
   {messages.length===0&&<div className="assistant-empty"><Sparkles size={22}/><p>Pergunte sobre o Projeto Atlas, peça para comparar documentos ou para organizar o que você já sabe.</p></div>}
   {messages.map(message=><div className={'bubble '+(message.role==='you'?'mine':'')} key={message.id}><b>{message.role==='you'?'Você':'Ara'}</b><br/>{message.text}</div>)}
   {busy&&<div className="bubble"><b>Ara</b><br/><span className="muted">Pensando…</span></div>}
  </div>
  <div className="composer">
   <input className="input" value={text} onChange={event=>setText(event.target.value)} onKeyDown={onKeyDown} placeholder="Pergunte para a Ara…" aria-label="Pergunte para a Ara"/>
   <kbd className="shortcut">Ctrl + Enter</kbd>
   <button disabled={busy} onClick={submit} className="btn primary">Perguntar</button>
  </div>
 </section>;
}
