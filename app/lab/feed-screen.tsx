'use client';
import{useState}from'react';import{ArrowLeft,ExternalLink}from'lucide-react';
import type{NewsItem,WorldEvent}from'@/lib/simulation/types';

// The press lives in scenario data, authored in the Studio. Hardcoding it here
// meant every new world inherited the Atlas newspaper.
function timeOf(at:number){return `${String(Math.floor(at/60)%24).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`}

export function FeedScreen({liveFeed,news=[]}:{liveFeed:WorldEvent[];news?:NewsItem[]}){
 const[openId,setOpenId]=useState('');
 // A Director feed event is already an article: its subject is the headline and
 // its body is the piece. Nothing is invented here that the world did not emit.
 const fromWorld:NewsItem[]=liveFeed.map(event=>{
  const body=String(event.body||'');
  return{id:event.id,source:String(event.sender||'Comunicação interna'),at:event.at,tag:'Interno',
   headline:event.subject||body.split(/[.!?]/)[0].slice(0,110)||'Atualização',
   summary:body.length>190?body.slice(0,190)+'…':body,article:body};
 });
 const todas=[...fromWorld,...news].sort((a,b)=>b.at-a.at);
 const open=todas.find(item=>item.id===openId);

 if(open)return <section className="feed">
  <button className="btn" onClick={()=>setOpenId('')}><ArrowLeft size={16}/>Voltar ao feed</button>
  <article className="panel article">
   <div className="article-meta"><span className="tag">{open.tag||'Notícia'}</span><span className="muted">{open.source} · {timeOf(open.at)}</span></div>
   <h1 className="h1">{open.headline}</h1>
   {open.article.split('\n').filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}
  </article>
 </section>;

 return <section className="feed">
  <div className="feed-head"><div><div className="eyebrow">NOVA BANK · INTERNO E IMPRENSA</div><h2>Feed</h2></div><span className="tag">{todas.length} publicações</span></div>
  {todas.length===0&&<div className="panel"><p className="muted">Nada publicado ainda. O feed recebe o que o mundo divulgar durante o Challenge.</p></div>}
  {todas.map(item=><article className="panel feed-card" key={item.id}>
   <div className="article-meta"><span className="tag">{item.tag||'Notícia'}</span><span className="muted">{item.source} · {timeOf(item.at)}</span></div>
   <h3 className="feed-headline">{item.headline}</h3>
   <p>{item.summary}</p>
   <button className="btn read-more" onClick={()=>setOpenId(item.id)}>Ler reportagem completa<ExternalLink size={15}/></button>
  </article>)}
 </section>;
}
