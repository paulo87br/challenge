'use client';
import{useState}from'react';
import{useDialogo}from'@/app/ui/dialogo';import{ChevronDown,Newspaper,Trash2}from'lucide-react';
import type{NewsItem}from'@/lib/simulation/types';

// 'at' é minutos depois do início da sessão, não hora do dia: o mesmo cenário
// rodando de manhã ou à noite entrega a imprensa nos mesmos pontos da corrida.
const quando=(at:number)=>at<=0?'na abertura':`${at} min depois do início`;

export function NewsEditor({news,onChange}:{news:NewsItem[];onChange:(next:NewsItem[])=>void}){
 const[openId,setOpenId]=useState('');
 const{confirmar,elemento:dialogo}=useDialogo();
 const patch=(index:number,change:Partial<NewsItem>)=>onChange(news.map((item,i)=>i===index?{...item,...change}:item));
 function add(){
  const item:NewsItem={id:`news-${Date.now().toString(36)}`,source:'',at:0,tag:'Notícia',headline:'',summary:'',article:''};
  onChange([...news,item]);setOpenId(item.id);
 }
 async function remove(item:NewsItem){
  const ok=await confirmar({titulo:`Remover "${item.headline||'esta notícia'}"?`,
   texto:'Sai do feed do cenário e deixa de ser publicada durante as sessões.',
   rotuloOk:'Remover',perigo:true});
  if(!ok)return;
  onChange(news.filter(entry=>entry.id!==item.id));if(openId===item.id)setOpenId('');
 }

 return <section className="panel">
  <div className="studio-head">
   <div><div className="eyebrow">IMPRENSA</div><h2>O que o mundo está lendo</h2>
   <p className="muted">A visão periférica do participante: coisas que ele não pediu para saber e que mudam o significado da decisão. Cada notícia sai no minuto que você marcar, contado do início da sessão. O que o Director publicar durante a corrida entra no mesmo feed.</p>
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
       <small>{[item.source,item.tag,quando(Number(item.at)||0)].filter(Boolean).join(' · ')}</small></span>
     </button>
     <span className="persona-actions">
      <button className="btn persona-icon" aria-label={`Remover ${item.headline||'notícia'}`} onClick={()=>remove(item)}><Trash2 size={15}/></button>
     </span>
    </div>
    {open&&<div className="persona-body">
     <div className="field-grid">
      <label><span>Veículo</span><input className="input" value={item.source} onChange={e=>patch(index,{source:e.target.value})}/></label>
      <label><span>Editoria</span><input className="input" value={item.tag||''} onChange={e=>patch(index,{tag:e.target.value})}/></label>
      <label><span>Sai quantos minutos depois do início</span>
       <input className="input" type="number" min={0} max={600} step={1} value={Number(item.at)||0}
        onChange={e=>patch(index,{at:Math.max(0,Number(e.target.value)||0)})}/>
       <small className="campo-dica">0 publica junto com a abertura. Depois disso, a notícia aparece quando o relógio do mundo chegar lá.</small></label>
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
  {dialogo}
 </section>;
}
