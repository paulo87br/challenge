'use client';
import{useState}from'react';import{ChevronDown,Newspaper,Trash2}from'lucide-react';
import type{NewsItem}from'@/lib/simulation/types';

const clock=(at:number)=>`${String(Math.floor(at/60)%24).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`;
const toMinutes=(value:string)=>{const[h,m]=value.split(':').map(Number);return(Number(h)||0)*60+(Number(m)||0)};

export function NewsEditor({news,onChange}:{news:NewsItem[];onChange:(next:NewsItem[])=>void}){
 const[openId,setOpenId]=useState('');
 const patch=(index:number,change:Partial<NewsItem>)=>onChange(news.map((item,i)=>i===index?{...item,...change}:item));
 function add(){
  const item:NewsItem={id:`news-${Date.now().toString(36)}`,source:'',at:9*60,tag:'Notícia',headline:'',summary:'',article:''};
  onChange([...news,item]);setOpenId(item.id);
 }
 function remove(item:NewsItem){
  if(!window.confirm(`Remover "${item.headline||'esta notícia'}" do feed?`))return;
  onChange(news.filter(entry=>entry.id!==item.id));if(openId===item.id)setOpenId('');
 }

 return <section className="panel">
  <div className="studio-head">
   <div><div className="eyebrow">IMPRENSA</div><h2>O que o mundo está lendo</h2>
   <p className="muted">A visão periférica do participante: coisas que ele não pediu para saber e que mudam o significado da decisão. O que o Director publicar durante a sessão entra no mesmo feed.</p>
   <p className="muted">Escreva para pesar na decisão sem dizer o que fazer. Uma notícia que dá a resposta tira da pessoa a chance de chegar nela.</p></div>
   <button className="btn" onClick={add}><Newspaper size={16}/>Nova notícia</button>
  </div>

  {news.length===0&&<p className="muted">Sem imprensa. O feed só terá o que o mundo publicar durante a sessão.</p>}

  <div className="persona-list">{news.map((item,index)=>{
   const open=openId===item.id;
   return <div className={'persona-item '+(open?'open':'')} key={item.id}>
    <div className="persona-row">
     <button className="persona-toggle" aria-expanded={open} onClick={()=>setOpenId(open?'':item.id)}>
      <ChevronDown size={17} className="persona-chevron"/>
      <span className="persona-id"><b>{item.headline||'Manchete vazia'}</b>
       <small>{[item.source,item.tag,clock(item.at)].filter(Boolean).join(' · ')}</small></span>
     </button>
     <span className="persona-actions">
      <button className="btn persona-icon" aria-label={`Remover ${item.headline||'notícia'}`} onClick={()=>remove(item)}><Trash2 size={15}/></button>
     </span>
    </div>
    {open&&<div className="persona-body">
     <div className="field-grid">
      <label><span>Veículo</span><input className="input" value={item.source} onChange={e=>patch(index,{source:e.target.value})}/></label>
      <label><span>Editoria</span><input className="input" value={item.tag||''} onChange={e=>patch(index,{tag:e.target.value})}/></label>
      <label><span>Hora da publicação</span><input className="input" type="time" value={clock(item.at)} onChange={e=>patch(index,{at:toMinutes(e.target.value)})}/></label>
     </div>
     <label className="field"><span>Manchete</span><input className="input" value={item.headline} onChange={e=>patch(index,{headline:e.target.value})}/></label>
     <label className="field"><span>Chamada (o que aparece no feed)</span>
      <textarea className="input" style={{height:66}} value={item.summary} onChange={e=>patch(index,{summary:e.target.value})}/></label>
     <label className="field"><span>Reportagem completa</span>
      <textarea className="input" style={{height:190}} value={item.article} onChange={e=>patch(index,{article:e.target.value})}/>
      <small className="muted">Uma linha em branco separa parágrafos.</small></label>
    </div>}
   </div>;
  })}</div>
 </section>;
}
