'use client';
/**
 * A sessão refeita, como ela aconteceu.
 *
 * A linha do tempo da página ao lado diz o que houve; isto mostra o que a
 * pessoa via. São coisas diferentes: lendo a lista, quem corrige já sabe que a
 * Helena cobrou duas vezes, porque as duas cobranças estão na mesma tela. Quem
 * estava na cadeira não sabia -- tinha uma caixa de entrada, um relógio andando
 * e o que ainda não tinha chegado não existia.
 *
 * O portão é o mesmo do /lab: visibleEvents, com o minuto da reprodução no
 * lugar do minuto do mundo. Se eu filtrasse por minha conta, a reprodução seria
 * uma segunda versão da verdade -- e uma reprodução que diverge do que a pessoa
 * viveu é pior que não ter reprodução.
 */
import{useEffect,useMemo,useRef,useState}from'react';
import{Play,Pause,SkipForward,SkipBack,Rewind}from'lucide-react';
import{visibleEvents,conversationChats,conversationMembers,participantesDoFio}from'@/lib/simulation/view';
import{acervoDoMundo}from'@/lib/simulation/acervo';
import type{WorldState,WorldEvent}from'@/lib/simulation/types';

const ABAS=[{id:'mail',label:'E-mail'},{id:'chat',label:'Conversas'},{id:'files',label:'Arquivos'},{id:'feed',label:'Feed'}];
// Minutos simulados por segundo de relógio real. Quatro passa uma sessão de
// 400 minutos em pouco mais de um minuto e meio, que é o ritmo de quem está
// procurando um momento, não assistindo a um filme.
const VELOCIDADES=[2,4,10,30];

export type SinalNoTempo={competency:string;behavior:string;evidence:string;polarity:string;
 support?:string|null;simulated_minute?:number|null};

export function Reproducao({mundo,pessoa,sinais=[],regua=[]}:{
 mundo:WorldState;pessoa:string;sinais?:SinalNoTempo[];regua?:{code:string;name:string}[]}){
 const eventos=useMemo(()=>[...(mundo.events||[])].sort((a,b)=>a.at-b.at),[mundo.events]);
 const inicio=eventos.length?Math.min(...eventos.map(e=>e.at)):(mundo.startMinute??mundo.minute);
 const fim=Math.max(mundo.minute||0,...eventos.map(e=>e.at),inicio);
 const[minuto,setMinuto]=useState(inicio);
 const[tocando,setTocando]=useState(false);
 const[velocidade,setVelocidade]=useState(4);
 const[aba,setAba]=useState('mail');
 const[pessoaAberta,setPessoaAberta]=useState('');
 const[mailAberto,setMailAberto]=useState('');
 const[arquivoAberto,setArquivoAberto]=useState('');

 useEffect(()=>{
  if(!tocando)return;
  const id=setInterval(()=>setMinuto(m=>{
   const proximo=m+velocidade;
   if(proximo>=fim){setTocando(false);return fim}
   return proximo;
  }),1000);
  return()=>clearInterval(id);
 },[tocando,velocidade,fim]);

 // O mesmo portão que o participante atravessou.
 const visiveis=useMemo(()=>visibleEvents({...mundo,minute:minuto}as WorldState),[mundo,minuto]);
 const mails=visiveis.filter(e=>e.channel==='mail');
 const recebidos=mails.filter(e=>e.sender!=='Você');
 const chats=visiveis.filter(e=>e.channel==='chat'||e.channel==='call');
 const feed=visiveis.filter(e=>e.channel==='feed');
 const acervo=useMemo(()=>acervoDoMundo({...mundo,minute:minuto}as WorldState),[mundo,minuto]);
 const arquivos=[...acervo,...visiveis.filter(e=>e.channel==='files')
  .map(e=>({id:e.id,name:e.subject||'Documento',at:e.at,sender:e.sender,body:e.body}))]
  .sort((a,b)=>b.at-a.at);

 const comQuem=[...new Set(chats.flatMap(e=>[e.characterId,e.recipientCharacterId].filter(Boolean) as string[]))];
 const alvo=pessoaAberta||comQuem[0]||'';
 const doFio=conversationChats(chats,conversationMembers(chats,alvo));
 const noFio=participantesDoFio(chats,alvo);
 const nomeDe=(id?:string)=>mundo.characters?.find(c=>c.id===id)?.name||id||'';
 const mailSelecionado=mails.find(m=>m.id===mailAberto)||recebidos[recebidos.length-1];
 const arquivoSelecionado=arquivos.find(a=>a.id===arquivoAberto)||arquivos[0];
 const relogio=`${String(Math.floor(minuto/60)%24).padStart(2,'0')}:${String(minuto%60).padStart(2,'0')}`;
 const decorrido=minuto-inicio;

 // Pular para o próximo instante em que algo de fato chega: arrastar minuto a
 // minuto por uma sessão de sete horas é tempo de quem corrige, não da máquina.
 const proximoEvento=eventos.find(e=>e.at>minuto)?.at;
 const eventoAnterior=[...eventos].reverse().find(e=>e.at<minuto)?.at;
 const chegandoAgora=eventos.filter(e=>e.at===minuto&&e.visible);

 return <section className="panel reproducao">
  <div className="reproducao-topo">
   <div>
    <div className="eyebrow">REPRODUÇÃO</div>
    <h2>A sessão de {pessoa}, como ela via</h2>
    <p className="muted">Só o que já tinha chegado até este ponto. O que viria depois ainda não existe aqui.</p>
   </div>
   <div className="reproducao-relogio">
    <span className="tag">DIA {mundo.day} · {relogio}</span>
    <small className="muted">{decorrido} min de mundo</small>
   </div>
  </div>

  <div className="reproducao-controles">
   <button className="btn" onClick={()=>{setTocando(false);setMinuto(inicio)}} aria-label="Voltar ao início"><Rewind size={16}/></button>
   <button className="btn" disabled={eventoAnterior===undefined}
    onClick={()=>{setTocando(false);if(eventoAnterior!==undefined)setMinuto(eventoAnterior)}}
    aria-label="Acontecimento anterior"><SkipBack size={16}/></button>
   <button className="btn primary" onClick={()=>setTocando(t=>!t)}
    aria-label={tocando?'Pausar':'Reproduzir'}>{tocando?<Pause size={16}/>:<Play size={16}/>}{tocando?'Pausar':'Reproduzir'}</button>
   <button className="btn" disabled={proximoEvento===undefined}
    onClick={()=>{setTocando(false);if(proximoEvento!==undefined)setMinuto(proximoEvento)}}
    aria-label="Próximo acontecimento"><SkipForward size={16}/></button>
   <label className="reproducao-velocidade">velocidade
    <select className="input" value={velocidade} onChange={e=>setVelocidade(Number(e.target.value))}
     aria-label="Minutos de mundo por segundo">
     {VELOCIDADES.map(v=><option key={v} value={v}>{v}×</option>)}</select></label>
  </div>

  <div className="reproducao-barra">
   <input type="range" min={inicio} max={fim} value={minuto} aria-label="Momento da sessão"
    onChange={e=>{setTocando(false);setMinuto(Number(e.target.value))}}/>
   <div className="reproducao-marcas" aria-hidden>
    {eventos.filter(e=>e.visible).map(e=><span key={e.id}
     className={'reproducao-marca '+(e.sender==='Você'?'minha':'')+(e.at<=minuto?' passou':'')}
     style={{left:`${fim>inicio?100*(e.at-inicio)/(fim-inicio):0}%`}}/>)}
   </div>
  </div>

  {chegandoAgora.length>0&&<div className="reproducao-chegando">
   {chegandoAgora.map(e=><span key={e.id} className="tag hot">
    {e.sender==='Você'?'você escreveu':`chegou: ${String(e.sender).split('·')[0].trim()}`}</span>)}
  </div>}

  {/* O que o Observer registrou até aqui. Fica ao lado, não dentro da tela da
      pessoa: ela nunca viu isto, e misturar as duas coisas faria a reprodução
      mentir sobre o que ela sabia no momento. */}
  {sinais.length>0&&(()=>{
   const ateAqui=sinais.filter(s=>typeof s.simulated_minute==='number'&&(s.simulated_minute as number)<=minuto);
   const ultimos=ateAqui.slice(-3).reverse();
   const nomeComp=(c:string)=>regua.find(r=>r.code===c)?.name||c;
   return <div className="reproducao-observador">
    <div className="reproducao-observador-topo">
     <span className="eyebrow">O QUE O OBSERVER JÁ TINHA REGISTRADO</span>
     <span className="tag">{ateAqui.length} de {sinais.length}</span>
    </div>
    {ultimos.length===0
     ?<small className="muted">Nenhum sinal até este ponto.</small>
     :<ul className="reproducao-sinais">{ultimos.map((s,i)=><li key={i}>
        <b className={s.polarity==='risk'?'sinal-risco':''}>{nomeComp(s.competency)}</b>
        <span className="muted"> — {s.evidence}</span>
        {s.support==='sem_apoio'&&<i className="tag"> sem lastro</i>}</li>)}</ul>}
   </div>;
  })()}

  {sinais.length===0&&<div className="reproducao-observador">
   <small className="muted">Esta sessão é anterior ao registro do minuto de cada sinal, então a evidência não acompanha a reprodução. As sessões a partir de agora acompanham.</small>
  </div>}

  <nav className="reproducao-abas">
   {ABAS.map(a=>{
    const quantos=a.id==='mail'?mails.length:a.id==='chat'?chats.length:a.id==='files'?arquivos.length:feed.length;
    return <button key={a.id} className={aba===a.id?'active':''} onClick={()=>setAba(a.id)}>
     {a.label}{quantos>0&&<b className="nav-badge">{quantos}</b>}</button>;
   })}
  </nav>

  <div className="reproducao-tela">
   {aba==='mail'&&(mails.length===0
    ?<p className="muted">Nenhum e-mail até aqui.</p>
    :<div className="reproducao-duas">
      <div className="reproducao-lista">
       {[...mails].reverse().map(m=><button key={m.id} className={'mail-row '+(mailSelecionado?.id===m.id?'selected':'')}
        onClick={()=>setMailAberto(m.id)}>
        <div className="mail-row-top"><b>{m.sender==='Você'?'Para: '+nomeDe(m.recipientCharacterId):String(m.sender).split('·')[0].trim()}</b>
         <small>{String(Math.floor(m.at/60)%24).padStart(2,'0')}:{String(m.at%60).padStart(2,'0')}</small></div>
        <strong>{m.subject||'(sem assunto)'}</strong>
        <span>{String(m.body).slice(0,60)}…</span></button>)}
      </div>
      <div className="reproducao-leitura">
       {mailSelecionado&&<><h3>{mailSelecionado.subject||'(sem assunto)'}</h3>
        <div className="muted"><b>{mailSelecionado.sender}</b></div>
        <p className="mail-body">{mailSelecionado.body}</p></>}
      </div>
     </div>)}

   {aba==='chat'&&(chats.length===0
    ?<p className="muted">Nenhuma conversa até aqui.</p>
    :<div className="reproducao-duas">
      <div className="reproducao-lista">
       {comQuem.map(id=><button key={id} className={'chat-person '+(alvo===id?'selected':'')}
        onClick={()=>setPessoaAberta(id)}>
        <b>{nomeDe(id)}</b><small>{mundo.characters?.find(c=>c.id===id)?.role||''}</small></button>)}
      </div>
      <div className="reproducao-leitura">
       <div className="conversation-people">{noFio.map(id=><span key={id} className="conversation-person">{nomeDe(id).split(' ')[0]}</span>)}</div>
       <div className="chat-history">
        {doFio.map(m=><div className={'bubble '+(m.sender==='Você'?'mine':'')} key={m.id}>
         <b>{m.sender}</b>{m.channel==='call'&&<span className="tag"> ligação</span>}<br/>{m.body}</div>)}
       </div>
      </div>
     </div>)}

   {aba==='files'&&(arquivos.length===0
    ?<p className="muted">Nenhum documento disponível até aqui.</p>
    :<div className="reproducao-duas">
      <div className="reproducao-lista">
       {arquivos.map(a=><button key={a.id} className={'mail-row '+(arquivoSelecionado?.id===a.id?'selected':'')}
        onClick={()=>setArquivoAberto(a.id)}><strong>{a.name}</strong><span>{a.sender}</span></button>)}
      </div>
      <div className="reproducao-leitura">
       {arquivoSelecionado&&<><h3>{arquivoSelecionado.name}</h3><p className="file-body">{arquivoSelecionado.body}</p></>}
      </div>
     </div>)}

   {aba==='feed'&&(feed.length===0
    ?<p className="muted">Nada publicado até aqui.</p>
    :<div className="reproducao-feed">
      {[...feed].reverse().map(e=><div className="panel feed-card" key={e.id}>
       <b>{e.sender}</b><p>{e.body}</p></div>)}
     </div>)}
  </div>
 </section>;
}
