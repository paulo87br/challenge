'use client';
import{useState}from'react';
import{useDialogo}from'@/app/ui/dialogo';
import{CalendarPlus,ChevronDown,Mail,MessageCircle,Newspaper,Phone,Trash2}from'lucide-react';
import type{Character,WorldEvent}from'@/lib/simulation/types';

/**
 * O que o mundo faz por conta própria, e quando.
 *
 * Esta é a diferença entre um mundo e um balcão: sem nada aqui, ninguém procura
 * o participante e a sessão inteira é ele perguntando e alguém respondendo.
 *
 * 'at' é minutos depois do início da sessão. Zero já está na tela quando a
 * pessoa senta; qualquer número maior chega durante a corrida.
 */
const CANAIS=[
 {id:'mail',label:'E-mail',Icon:Mail,dica:'Cai na caixa de entrada. Tem assunto.'},
 {id:'chat',label:'Conversa',Icon:MessageCircle,dica:'Chega como mensagem direta da pessoa.'},
 {id:'call',label:'Ligação',Icon:Phone,dica:'O telefone toca. O texto é o que a tela mostra antes de atender.'},
 {id:'feed',label:'Feed',Icon:Newspaper,dica:'Comunicado interno, visível a todo mundo.'},
];

const vazio=(at:number):WorldEvent=>({id:`evento-${Date.now().toString(36)}`,channel:'mail',sender:'',
 body:'',subject:'',urgency:0.6,visible:true,at});

export function EventEditor({events,characters,onChange}:{
 events:WorldEvent[];characters:Character[];onChange:(next:WorldEvent[])=>void}){
 const[abertoId,setAbertoId]=useState('');
 const{confirmar,elemento:dialogo}=useDialogo();
 const ordenados=[...events].sort((a,b)=>(Number(a.at)||0)-(Number(b.at)||0));
 const patch=(id:string,mudanca:Partial<WorldEvent>)=>
  onChange(events.map(e=>e.id===id?{...e,...mudanca}:e));

 function add(){
  const ultimo=ordenados.length?Number(ordenados[ordenados.length-1].at)||0:0;
  const novo=vazio(ordenados.length?ultimo+6:0);
  onChange([...events,novo]);setAbertoId(novo.id);
 }
 async function remover(e:WorldEvent){
  const ok=await confirmar({titulo:`Remover este acontecimento?`,
   texto:`${rotuloCanal(e.channel)} de ${e.sender||'alguém'}, aos ${Number(e.at)||0} min. O mundo deixa de fazer isso sozinho.`,
   rotuloOk:'Remover',perigo:true});
  if(!ok)return;
  onChange(events.filter(x=>x.id!==e.id));if(abertoId===e.id)setAbertoId('');
 }
 const rotuloCanal=(c:string)=>CANAIS.find(x=>x.id===c)?.label||c;
 // Quem fala define o perímetro de conhecimento daquela fala; sem pessoa, o
 // motor não sabe de quem é a memória.
 const quem=(id?:string)=>characters.find(c=>c.id===id);

 return <section className="panel">
  <div className="studio-head">
   <div><div className="eyebrow">O QUE ACONTECE</div><h2>O mundo procurando a pessoa</h2>
   <p className="muted">Sem nada aqui, ninguém fala com o participante primeiro: a sessão vira ele perguntando e alguém respondendo. Cada acontecimento sai no minuto que você marcar, contado do início da sessão.</p>
   <p className="muted">Escreva como a pessoa escreveria, não como um aviso do sistema. O que estiver aqui é tratado como coisa que já aconteceu no mundo.</p></div>
   <button className="btn" onClick={add}><CalendarPlus size={16}/>Novo acontecimento</button>
  </div>

  {events.length===0&&<p className="muted">Nada agendado. O mundo só vai reagir ao que a pessoa fizer.</p>}

  <div className="persona-list">{ordenados.map(evento=>{
   const aberto=abertoId===evento.id;
   const Icon=CANAIS.find(c=>c.id===evento.channel)?.Icon||Mail;
   const pessoa=quem(evento.characterId);
   return <div className={'persona-item '+(aberto?'open':'')} key={evento.id}>
    <div className="persona-row">
     <button className="persona-toggle" aria-expanded={aberto} onClick={()=>setAbertoId(aberto?'':evento.id)}>
      <ChevronDown size={17} className="persona-chevron"/>
      <span className="evento-min">{Number(evento.at)||0}′</span>
      <span className="persona-id"><b>{evento.subject||evento.body?.slice(0,64)||'Sem texto'}</b>
       <small><Icon size={12} style={{verticalAlign:'-2px',marginRight:5}}/>
        {rotuloCanal(evento.channel)} · {evento.sender||pessoa?.name||'sem remetente'}</small></span>
     </button>
     <span className="persona-actions">
      <button className="btn persona-icon" aria-label="Remover acontecimento" onClick={()=>remover(evento)}><Trash2 size={15}/></button>
     </span>
    </div>

    {aberto&&<div className="persona-body">
     <div className="field-grid">
      <label><span>Sai quantos minutos depois do início</span>
       <input className="input" type="number" min={0} max={600} value={Number(evento.at)||0}
        onChange={e=>patch(evento.id,{at:Math.max(0,Number(e.target.value)||0)})}/>
       <small className="campo-dica">0 já está na tela quando a pessoa senta.</small></label>
      <label><span>Quem</span>
       <select className="input" value={evento.characterId||''}
        onChange={e=>{const c=quem(e.target.value);
         patch(evento.id,{characterId:e.target.value||undefined,sender:evento.sender||(c?`${c.name} · ${c.role}`:'')})}}>
        <option value="">— escolha a pessoa —</option>
        {characters.map(c=><option key={c.id} value={c.id}>{c.name} · {c.role}</option>)}
       </select>
       <small className="campo-dica">Define de quem é a memória e o que essa fala pode saber.</small></label>
      <label><span>Como aparece o remetente</span>
       <input className="input" value={evento.sender||''} placeholder={pessoa?`${pessoa.name} · ${pessoa.role}`:'Nome · papel'}
        onChange={e=>patch(evento.id,{sender:e.target.value})}/></label>
      <label><span>Urgência</span>
       <input className="input" type="number" min={0} max={1} step={0.05} value={Number(evento.urgency)||0.6}
        onChange={e=>patch(evento.id,{urgency:Math.min(1,Math.max(0,Number(e.target.value)||0))})}/>
       <small className="campo-dica">O quanto isto pressiona. Entre 0 e 1.</small></label>
     </div>

     <div className="canal-row">{CANAIS.map(({id,label,Icon:I,dica})=>
      <button key={id} type="button" title={dica}
       className={'provider-chip '+(evento.channel===id?'active':'')}
       onClick={()=>patch(evento.id,{channel:id as WorldEvent['channel']})}>
       <I size={14}/> {label}</button>)}</div>
     <p className="muted campo-dica">{CANAIS.find(c=>c.id===evento.channel)?.dica}</p>

     {(evento.channel==='mail')&&<label><span>Assunto</span>
      <input className="input" value={evento.subject||''} onChange={e=>patch(evento.id,{subject:e.target.value})}/></label>}

     <label><span>{evento.channel==='call'?'O que a tela diz enquanto o telefone toca':'Texto'}</span>
      <textarea className="input evento-corpo" value={evento.body||''}
       placeholder={evento.channel==='call'?'A Helena está te ligando. Ela quer a nota pública fechada agora.':'Escreva como essa pessoa escreveria.'}
       onChange={e=>patch(evento.id,{body:e.target.value})}/></label>
    </div>}
   </div>;
  })}</div>

  {dialogo}
 </section>;
}
