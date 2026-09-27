'use client';
import{useState}from'react';import{ArrowLeft,ExternalLink}from'lucide-react';
import type{NewsItem,WorldEvent}from'@/lib/simulation/types';

// The press lives in scenario data, authored in the Studio. Hardcoding it here
// meant every new world inherited the Atlas newspaper.
function timeOf(at:number){return `${String(Math.floor(at/60)%24).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`}

export function FeedScreen({liveFeed,news=[],minute,startMinute,title}:{
 liveFeed:WorldEvent[];news?:NewsItem[];minute:number;startMinute:number;title:string}){
 const[openId,setOpenId]=useState('');
 // A Director feed event is already an article: its subject is the headline and
 // its body is the piece. Nothing is invented here that the world did not emit.
 const fromWorld:NewsItem[]=liveFeed.map(event=>{
  const body=String(event.body||'');
  return{id:event.id,source:String(event.sender||'Comunicação interna'),at:event.at,tag:'Interno',
   headline:event.subject||body.split(/[.!?]/)[0].slice(0,110)||'Atualização',
   summary:body.length>190?body.slice(0,190)+'…':body,article:body};
 });
 // A imprensa autorada chega conforme o cenário anda, como o que o Director
 // publica. Entrar inteira no primeiro segundo entregava de uma vez o contexto
 // que deveria pressionar aos poucos -- e o 'at' de cada notícia, que existia,
 // só servia para carimbar horário.
 const decorrido=Math.max(0,minute-startMinute);
 const publicadas:NewsItem[]=news
  .filter(item=>(Number(item.at)||0)<=decorrido)
  .map(item=>({...item,at:startMinute+(Number(item.at)||0)}));
 const todas=[...fromWorld,...publicadas].sort((a,b)=>b.at-a.at);
 const open=todas.find(item=>item.id===openId);
 const aguardando=news.length-publicadas.length;

 if(open)return <section className="feed">
  <button className="btn" onClick={()=>setOpenId('')}><ArrowLeft size={16}/>Voltar ao feed</button>
  <article className="panel article">
   <div className="article-meta"><span className="tag">{open.tag||'Notícia'}</span><span className="muted">{open.source} · {timeOf(open.at)}</span></div>
   <h1 className="h1">{open.headline}</h1>
   {open.article.split('\n').filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}
  </article>
 </section>;

 return <section className="feed">
  <div className="feed-head"><div><div className="eyebrow">{(title||'O MUNDO').toLocaleUpperCase()} · INTERNO E IMPRENSA</div><h2>Feed</h2></div><span className="tag">{todas.length} publicações</span></div>
  {todas.length===0&&<div className="panel"><p className="muted">Nada publicado ainda. O feed recebe o que o mundo divulgar durante o Challenge.</p></div>}
  {todas.map(item=><article className="panel feed-card" key={item.id}>
   <div className="article-meta"><span className="tag">{item.tag||'Notícia'}</span><span className="muted">{item.source} · {timeOf(item.at)}</span></div>
   <h3 className="feed-headline">{item.headline}</h3>
   <p>{item.summary}</p>
   <button className="btn read-more" onClick={()=>setOpenId(item.id)}>Ler reportagem completa<ExternalLink size={15}/></button>
  </article>)}
  {aguardando>0&&<p className="muted feed-aguardando">
   {aguardando===1?'Mais uma publicação deve sair':`Mais ${aguardando} publicações devem sair`} conforme o caso avança.</p>}
 </section>;
}
