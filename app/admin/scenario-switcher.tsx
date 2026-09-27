'use client';
import{useMemo,useState}from'react';import{useRouter}from'next/navigation';
import{BookmarkPlus,Copy,Pencil,Play,PowerOff,Search,Trash2}from'lucide-react';
import{Modal,useDialogo}from'@/app/ui/dialogo';
import{CodigoDoMundo}from'./codigo-do-mundo';

export type ScenarioRow={key:string;title:string;domain:string;seat_role:string;
 is_template:boolean;active:boolean;created_from:string|null;updated_at:string|null;join_code?:string|null};

// Templates tendem a crescer — é a natureza deles, cada aula boa vira um. A
// lista mostra os três mais recentes e o resto fica a um clique, em vez de
// empurrar o resto da tela para baixo a cada semestre.
const VISIVEIS=3;

export function ScenarioSwitcher({scenarios,currentKey,faltaMigracao}:{
 scenarios:ScenarioRow[];currentKey:string;faltaMigracao?:boolean}){
 const router=useRouter();
 const{confirmar,perguntar,elemento:dialogo}=useDialogo();
 const[busy,setBusy]=useState('');
 const[error,setError]=useState('');
 const[listaAberta,setListaAberta]=useState(false);
 const[busca,setBusca]=useState('');

 const mundos=scenarios.filter(s=>!s.is_template);
 const templates=scenarios.filter(s=>s.is_template);
 const noAr=mundos.filter(s=>s.active);
 const recentes=templates.slice(0,VISIVEIS);
 const filtrados=useMemo(()=>{
  const termo=busca.trim().toLowerCase();
  if(!termo)return templates;
  return templates.filter(t=>[t.title,t.domain,t.seat_role].filter(Boolean)
   .some(campo=>campo.toLowerCase().includes(termo)));
 },[templates,busca]);

 async function agir(action:string,sourceKey:string,title?:string){
  setBusy(action+sourceKey);setError('');
  try{
   const r=await fetch('/api/admin/scenarios',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action,sourceKey,title})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.detail||data.error||`HTTP ${r.status}`);
   router.refresh();
  }catch(problema){setError(problema instanceof Error?problema.message:'Falha na operação.')}
  finally{setBusy('')}
 }

 async function salvarTemplate(){
  const atual=scenarios.find(s=>s.key===currentKey);
  const nome=await perguntar({titulo:'Salvar como template',
   texto:'Um template guarda este mundo como ponto de partida. Nada do que está no ar muda.',
   rotulo:'Nome do template',valor:`${atual?.title||'Cenário'} (template)`,rotuloOk:'Salvar template'});
  if(nome)agir('save_template',currentKey,nome);
 }
 async function criarDe(key:string,titulo:string){
  const nome=await perguntar({titulo:'Criar cenário a partir do template',
   texto:'Sai uma cópia independente: editar a cópia não mexe no template.',
   rotulo:'Nome do novo cenário',valor:titulo.replace(/\s*\(template\)\s*$/,''),rotuloOk:'Criar cenário'});
  if(nome){setListaAberta(false);agir('create_from',key,nome)}
 }
 async function apagar(item:ScenarioRow){
  const ok=await confirmar({titulo:`Apagar "${item.title}"?`,
   texto:item.is_template?'O template desaparece. Cenários já criados a partir dele continuam existindo.'
    :'Isso não pode ser desfeito.',rotuloOk:'Apagar',perigo:true});
  if(ok)agir('delete',item.key);
 }

 function linhaTemplate(template:ScenarioRow){
  return <div className="switcher-row" key={template.key}>
   <span className="switcher-name"><b>{template.title}</b>
    <small>{[template.domain,template.seat_role].filter(Boolean).join(' · ')}</small></span>
   <span className="switcher-actions">
    <button className="btn primary" disabled={Boolean(busy)} onClick={()=>criarDe(template.key,template.title)}>
     <Copy size={15}/>Criar cenário</button>
    <button className="btn persona-icon" aria-label={`Apagar ${template.title}`} disabled={Boolean(busy)}
     onClick={()=>apagar(template)}><Trash2 size={15}/></button>
   </span>
  </div>;
 }

 return <section className="panel switcher">
  <div className="studio-head">
   <div><div className="eyebrow">CENÁRIOS</div><h2>Quais mundos estão no ar</h2>
   <p className="muted">Mais de um mundo pode ficar no ar ao mesmo tempo, cada um com seu código.
    Quem entra pelo código cai no mundo certo. Sessões em andamento mantêm o mundo em que começaram —
    tirar um do ar fecha a porta para quem ainda não entrou, sem interromper quem está dentro.</p></div>
   <button className="btn" onClick={salvarTemplate} disabled={Boolean(busy)}>
    <BookmarkPlus size={16}/>Salvar como template</button>
  </div>
  {error&&<div className="runtime-error">{error}</div>}
  {faltaMigracao&&<div className="runtime-error">Os códigos de acesso ainda não existem no banco.
   Rode a migração <b>016_muitos_mundos_no_ar.sql</b> — até lá ninguém entra por código ou QR.</div>}
  {mundos.length>0&&noAr.length===0&&<div className="runtime-error">Nenhum mundo está no ar.
   Quem abrir o Challenge agora não tem onde entrar.</div>}

  <div className="switcher-list">{mundos.map(scenario=><div
   className={'switcher-row mundo-linha '+(scenario.active?'active':'')} key={scenario.key}>
   <span className="switcher-name"><b>{scenario.title}</b>
    <small>{[scenario.domain,scenario.seat_role].filter(Boolean).join(' · ')}
     {scenario.created_from?` · a partir de ${scenario.created_from}`:''}</small></span>
   {scenario.active&&<CodigoDoMundo codigo={scenario.join_code||null} titulo={scenario.title}/>}
   <span className="switcher-actions">
    {scenario.key!==currentKey&&<a className="btn" href={`/admin?cenario=${encodeURIComponent(scenario.key)}`}>
     <Pencil size={15}/>Editar</a>}
    {scenario.active
     ?<button className="btn" disabled={Boolean(busy)} onClick={()=>agir('deactivate',scenario.key)}>
       <PowerOff size={15}/>Tirar do ar</button>
     :<button className="btn primary" disabled={Boolean(busy)} onClick={()=>agir('activate',scenario.key)}>
       <Play size={15}/>Pôr no ar</button>}
    <button className="btn persona-icon" aria-label={`Apagar ${scenario.title}`}
     disabled={Boolean(busy)||scenario.active} onClick={()=>apagar(scenario)}><Trash2 size={15}/></button>
   </span>
  </div>)}</div>

  <div className="switcher-sub">
   <div><h3 className="switcher-heading">Templates</h3>
    <p className="muted">Um template é um ponto de partida, não um mundo em que alguém está.</p></div>
   {templates.length>VISIVEIS&&<button className="btn" onClick={()=>setListaAberta(true)}>
    Ver todos os {templates.length}</button>}
  </div>
  {templates.length===0&&<p className="muted">Nenhum template ainda. Salve o cenário atual para reaproveitá-lo depois.</p>}
  <div className="switcher-list">{recentes.map(linhaTemplate)}</div>

  <Modal aberto={listaAberta} titulo="Templates" largura={680}
   descricao={`${templates.length} guardados. Criar a partir de um faz uma cópia independente.`}
   onFechar={()=>setListaAberta(false)}>
   <label className="campo busca-campo">
    <span className="sr-only">Buscar template</span>
    <Search size={15}/>
    <input className="input" value={busca} placeholder="Buscar por nome, domínio ou cadeira"
     onChange={evento=>setBusca(evento.target.value)}/>
   </label>
   {filtrados.length===0
    ?<p className="muted">Nenhum template corresponde a “{busca}”.</p>
    :<div className="switcher-list">{filtrados.map(linhaTemplate)}</div>}
  </Modal>

  {dialogo}
 </section>;
}
