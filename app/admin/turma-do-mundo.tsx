'use client';
import{useState}from'react';

/**
 * De qual turma é esta atividade.
 *
 * Um mundo no ar já é, na prática, uma aplicação de um caso: um código, uma
 * data, um grupo. O que faltava era dizer a qual grupo -- sem isso, o relatório
 * somava o teste de quem conduz com a aula, e a mesma turma não conseguia ter
 * uma segunda atividade.
 */
export type TurmaResumo={id:string;nome:string};

export function TurmaDoMundo({scenarioKey,turmaId,turmas,indisponivel}:{
 scenarioKey:string;turmaId:string|null;turmas:TurmaResumo[];indisponivel?:boolean}){
 const[ocupado,setOcupado]=useState(false);
 const[criando,setCriando]=useState(false);
 const[nome,setNome]=useState('');
 const[erro,setErro]=useState('');

 async function chamar(corpo:Record<string,unknown>){
  setOcupado(true);setErro('');
  try{
   const r=await fetch('/api/admin/turmas',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(corpo)});
   const d=await r.json();
   if(!r.ok){setErro(d.detail||d.error||`Falhou (${r.status})`);return null}
   return d;
  }catch(e){setErro(e instanceof Error?e.message:'Falha de rede');return null}
  finally{setOcupado(false)}
 }

 if(indisponivel)return <span className="mundo-turma muted">turma: falta a migração 028</span>;

 if(criando)return <span className="mundo-turma">
  <input className="input turma-nome" value={nome} autoFocus disabled={ocupado}
   placeholder="Nome da turma" aria-label="Nome da nova turma"
   onChange={e=>setNome(e.target.value)}/>
  <button className="btn pequeno" disabled={ocupado||!nome.trim()} onClick={async()=>{
   const d=await chamar({acao:'criar',nome});
   if(d?.turma?.id){await chamar({acao:'atribuir',scenarioKey,turmaId:d.turma.id});location.reload()}
  }}>{ocupado?'…':'Criar'}</button>
  <button className="btn pequeno" disabled={ocupado} onClick={()=>{setCriando(false);setNome('')}}>Cancelar</button>
  {erro&&<small className="runtime-error">{erro}</small>}
 </span>;

 return <span className="mundo-turma">
  <label><span className="eyebrow">TURMA</span>
   <select className="input" value={turmaId||''} disabled={ocupado} aria-label={`Turma de ${scenarioKey}`}
    onChange={async e=>{
     if(e.target.value==='__nova'){setCriando(true);return}
     await chamar({acao:'atribuir',scenarioKey,turmaId:e.target.value||null});
     location.reload();
    }}>
    <option value="">sem turma</option>
    {turmas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
    <option value="__nova">+ nova turma…</option>
   </select></label>
  {erro&&<small className="runtime-error">{erro}</small>}
 </span>;
}
