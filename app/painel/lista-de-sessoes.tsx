'use client';
import{useState,useTransition}from'react';import{useRouter}from'next/navigation';import Link from'next/link';
import{Trash2,CheckCircle2,RotateCcw,X}from'lucide-react';
import{estadoDaSessao}from'@/lib/mundo/estado-da-sessao';

export type LinhaDeSessao={
 id:string;pessoa:string;mundo:string;atualizado:string;
 acoes:number;evidencias:number;riscos:number;status:string;temDebrief:boolean};

type Acao='encerrar'|'reabrir'|'excluir';
const correndo=(l:LinhaDeSessao)=>l.status==='active'||l.status==='paused';
// Reabrir é devolver alguém à mesa. Com o debrief entregue não há mesa para
// onde voltar: a leitura é o fim, e reabrir ali seria descartá-la.
const reabrivel=(l:LinhaDeSessao)=>!l.temDebrief&&!correndo(l);

export function ListaDeSessoes({linhas}:{linhas:LinhaDeSessao[]}){
 const router=useRouter();
 const[marcadas,setMarcadas]=useState<string[]>([]);
 const[confirmando,setConfirmando]=useState<string[]|null>(null);
 const[ocupado,setOcupado]=useState(false);
 // A lista é um componente de servidor e redesenhá-la custa quase três
 // segundos. Sem saber que a volta está a caminho, a tela ficava idêntica
 // depois do clique e a pessoa clicava de novo. A transição é o que torna
 // essa espera visível.
 const[recarregando,iniciarRecarga]=useTransition();
 const[recado,setRecado]=useState<{tom:'ok'|'erro';texto:string}|null>(null);

 const visiveis=linhas.map(l=>l.id);
 const selecionadas=marcadas.filter(id=>visiveis.includes(id));
 const todas=selecionadas.length>0&&selecionadas.length===visiveis.length;
 const alternar=(id:string)=>setMarcadas(atual=>atual.includes(id)?atual.filter(x=>x!==id):[...atual,id]);

 async function aplicar(acao:Acao,ids:string[]){
  setOcupado(true);setRecado(null);
  try{
   const resposta=await fetch('/api/painel/sessoes',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({acao,ids})});
   const dado=await resposta.json().catch(()=>({}));
   if(!resposta.ok){setRecado({tom:'erro',texto:resposta.status===401
    ?'Sua sessão de instrutor expirou. Recarregue a página e entre de novo.'
    :dado.error||`Falhou (${resposta.status})`});return}
   // Um 200 que não traz os números não é um 200 do Challenge -- é uma página
   // de login ou de erro de algum intermediário. Contar em cima disso produz
   // "undefined sessões excluídas", que é pior que dizer que não deu.
   if(typeof dado?.afetadas!=='number'){
    setRecado({tom:'erro',texto:'A resposta não veio do Challenge. Recarregue a página e tente de novo.'});return}
   // Três números, porque são três coisas diferentes: o que foi pedido, o que
   // se aplicava e o que o banco deixou acontecer. Quando os dois últimos não
   // batem, foi recusa -- e recusa não pode ser contada como "sem efeito".
   const{afetadas,pedidas,elegiveis}=dado as{afetadas:number;pedidas:number;elegiveis:number};
   const verbo=acao==='excluir'?'excluída':acao==='encerrar'?'encerrada':'reaberta';
   const feito=afetadas===1?`1 sessão ${verbo}`:`${afetadas} sessões ${verbo}s`;
   if(afetadas<elegiveis){
    setRecado({tom:'erro',texto:`O banco recusou: ${feito} de ${elegiveis} que se aplicavam. `+
     'Se a migração 024 ainda não foi aplicada, é isso — sem ela o instrutor não tem permissão de alterar ou excluir sessão de outra pessoa.'});
   }else{
    const naoSeAplicava=pedidas-elegiveis;
    const um=naoSeAplicava===1;
    const motivo=acao==='encerrar'?(um?'já não estava correndo':'já não estavam correndo')
     :acao==='reabrir'?(um?'tem debrief entregue ou já está correndo':'têm debrief entregue ou já estão correndo')
     :(um?'não se aplicava':'não se aplicavam');
    const ficaram=naoSeAplicava===1?'1 ficou de fora':`${naoSeAplicava} ficaram de fora`;
    setRecado({tom:'ok',texto:naoSeAplicava?`${feito}. ${ficaram}: ${motivo}.`:feito});
   }
   setMarcadas(atual=>atual.filter(id=>!ids.includes(id)));
   setConfirmando(null);
   iniciarRecarga(()=>router.refresh());
  }catch(erro){setRecado({tom:'erro',texto:erro instanceof Error?erro.message:'Falha de rede'})}
  finally{setOcupado(false)}
 }

 const travado=ocupado||recarregando;
 const podeEncerrar=linhas.filter(l=>selecionadas.includes(l.id)&&correndo(l)).length;
 const podeReabrir=linhas.filter(l=>selecionadas.includes(l.id)&&reabrivel(l)).length;

 return <>
  {/* Nada de caixa do navegador: a confirmação acontece dentro da página, onde
      a pessoa ainda vê o que selecionou. */}
  {confirmando&&<div className="panel barra-confirma">
   <div><b>Excluir {confirmando.length===1?'esta sessão':`${confirmando.length} sessões`}?</b>
    <p className="muted">Vai junto tudo que ela registrou: ações, evidências, turnos e chamadas. Não há como desfazer.</p></div>
   <div className="barra-botoes">
    <button className="btn" onClick={()=>setConfirmando(null)} disabled={travado}>Cancelar</button>
    <button className="btn perigo" onClick={()=>aplicar('excluir',confirmando)} disabled={travado}>
     <Trash2 size={15}/>{travado?'Excluindo…':'Excluir mesmo'}</button>
   </div></div>}

  {recado&&<div className={'panel barra-recado '+recado.tom}>
   <span>{recado.texto}{recarregando&&' · atualizando a lista…'}</span>
   <button className="btn" onClick={()=>setRecado(null)} aria-label="Dispensar aviso"><X size={15}/></button></div>}

  <div className="barra-selecao">
   <label className="selecionar-todas">
    <input type="checkbox" checked={todas}
     onChange={()=>setMarcadas(todas?[]:visiveis)} aria-label="Selecionar todas as sessões"/>
    {selecionadas.length?`${selecionadas.length} selecionada${selecionadas.length===1?'':'s'}`:'Selecionar todas'}</label>
   {selecionadas.length>0&&<div className="barra-botoes">
    <button className="btn" disabled={travado||!podeEncerrar} onClick={()=>aplicar('encerrar',selecionadas)}
     title={podeEncerrar?'':'Nenhuma das selecionadas está correndo'}><CheckCircle2 size={15}/>Encerrar{podeEncerrar?` (${podeEncerrar})`:''}</button>
    <button className="btn" disabled={travado||!podeReabrir} onClick={()=>aplicar('reabrir',selecionadas)}
     title={podeReabrir?'':'Nenhuma das selecionadas pode voltar a correr'}><RotateCcw size={15}/>Reabrir{podeReabrir?` (${podeReabrir})`:''}</button>
    <button className="btn perigo" disabled={travado} onClick={()=>setConfirmando(selecionadas)}><Trash2 size={15}/>Excluir</button>
   </div>}
  </div>

  <div className="painel-list">
   {linhas.map(linha=>{
    const leitura=estadoDaSessao(linha.status,linha.temDebrief);
    return <div className={'panel painel-row '+(selecionadas.includes(linha.id)?'marcada':'')} key={linha.id}>
     <input type="checkbox" className="painel-marca" checked={selecionadas.includes(linha.id)}
      onChange={()=>alternar(linha.id)} aria-label={`Selecionar a sessão de ${linha.pessoa}`}/>
     <Link href={`/painel/${linha.id}`} className="painel-row-main">
      <b>{linha.pessoa}</b>
      <span className="muted">{linha.mundo} · atualizado {linha.atualizado}</span>
     </Link>
     <div className="painel-stats">
      <span className="tag">{linha.acoes} {linha.acoes===1?'ação':'ações'}</span>
      <span className="tag">{linha.evidencias} {linha.evidencias===1?'evidência':'evidências'}</span>
      {linha.riscos>0&&<span className="tag hot">{linha.riscos} de risco</span>}
      <span className={('diagnostic-pill '+leitura.tom).trim()}>{leitura.rotulo}</span>
      {linha.temDebrief&&<span className="tag">debrief</span>}
     </div>
     <div className="painel-acoes">
      {correndo(linha)&&<button className="btn pequeno" disabled={travado}
       onClick={()=>aplicar('encerrar',[linha.id])}><CheckCircle2 size={14}/>Encerrar</button>}
      {reabrivel(linha)&&<button className="btn pequeno" disabled={travado}
       onClick={()=>aplicar('reabrir',[linha.id])}><RotateCcw size={14}/>Reabrir</button>}
      <button className="btn pequeno perigo" disabled={travado} aria-label={`Excluir a sessão de ${linha.pessoa}`}
       onClick={()=>setConfirmando([linha.id])}><Trash2 size={14}/></button>
     </div>
    </div>;
   })}
  </div>
 </>;
}
