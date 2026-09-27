'use client';
/**
 * Substitui window.confirm e window.prompt.
 *
 * As caixas nativas eram sete no projeto e tinham três problemas: são feias,
 * não dá para escrever o que a ação realmente faz, e travam a aba inteira. A
 * API aqui devolve Promise de propósito — o ponto de chamada continua lendo
 * como um `if(await confirmar(...))`, então trocar uma por outra não vira uma
 * refatoração de fluxo.
 */
import{useCallback,useEffect,useRef,useState}from'react';
import type{ReactNode}from'react';
import{X}from'lucide-react';

export function Modal({aberto,titulo,descricao,onFechar,children,rodape,largura=540}:{
 aberto:boolean;titulo:string;descricao?:string;onFechar:()=>void;
 children?:ReactNode;rodape?:ReactNode;largura?:number}){
 const caixa=useRef<HTMLDivElement>(null);
 const anterior=useRef<HTMLElement|null>(null);
 // Guardado em ref porque quem chama passa uma arrow nova a cada render: como
 // dependência do efeito, ela reabriria o foco a cada tecla digitada.
 const fechar=useRef(onFechar);fechar.current=onFechar;

 useEffect(()=>{
  if(!aberto)return;
  anterior.current=document.activeElement as HTMLElement;
  document.body.classList.add('modal-aberto');
  const focaveis=()=>Array.from(caixa.current?.querySelectorAll<HTMLElement>(
   'input,textarea,select,button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])')||[]);
  focaveis()[0]?.focus();
  function tecla(evento:KeyboardEvent){
   if(evento.key==='Escape'){evento.preventDefault();fechar.current();return}
   if(evento.key!=='Tab')return;
   // Sem isso o Tab sai do modal e vai passear pela página atrás do véu, que é
   // justamente a parte que não deveria estar alcançável.
   const lista=focaveis();if(!lista.length)return;
   const primeiro=lista[0],ultimo=lista[lista.length-1];
   if(evento.shiftKey&&document.activeElement===primeiro){evento.preventDefault();ultimo.focus()}
   else if(!evento.shiftKey&&document.activeElement===ultimo){evento.preventDefault();primeiro.focus()}
  }
  document.addEventListener('keydown',tecla);
  return()=>{
   document.removeEventListener('keydown',tecla);
   document.body.classList.remove('modal-aberto');
   anterior.current?.focus();
  };
 },[aberto]);

 if(!aberto)return null;
 return <div className="veu" onMouseDown={evento=>{if(evento.target===evento.currentTarget)onFechar()}}>
  <div className="modal" ref={caixa} role="dialog" aria-modal="true" aria-label={titulo} style={{maxWidth:largura}}>
   <header className="modal-head">
    <div><h2>{titulo}</h2>{descricao&&<p className="muted">{descricao}</p>}</div>
    <button type="button" className="btn persona-icon" onClick={onFechar} aria-label="Fechar"><X size={16}/></button>
   </header>
   {children&&<div className="modal-body">{children}</div>}
   {rodape&&<footer className="modal-foot">{rodape}</footer>}
  </div>
 </div>;
}

type Pedido=
 |{tipo:'confirmar';titulo:string;texto?:string;rotuloOk?:string;perigo?:boolean}
 |{tipo:'perguntar';titulo:string;texto?:string;rotulo?:string;valor?:string;rotuloOk?:string};

export function useDialogo(){
 const[pedido,setPedido]=useState<Pedido|null>(null);
 const[valor,setValor]=useState('');
 const responder=useRef<((resposta:any)=>void)|null>(null);

 const abrir=useCallback((novo:Pedido)=>{
  setPedido(novo);setValor(novo.tipo==='perguntar'?(novo.valor||''):'');
  return new Promise<any>(resolve=>{responder.current=resolve});
 },[]);

 const encerrar=useCallback((resposta:any)=>{
  const resolve=responder.current;responder.current=null;
  setPedido(null);resolve?.(resposta);
 },[]);

 const confirmar=useCallback((p:{titulo:string;texto?:string;rotuloOk?:string;perigo?:boolean})=>
  abrir({...p,tipo:'confirmar'}) as Promise<boolean>,[abrir]);
 const perguntar=useCallback((p:{titulo:string;texto?:string;rotulo?:string;valor?:string;rotuloOk?:string})=>
  abrir({...p,tipo:'perguntar'}) as Promise<string|null>,[abrir]);

 const cancelado=pedido?.tipo==='perguntar'?null:false;
 const podeConfirmar=pedido?.tipo!=='perguntar'||valor.trim().length>0;

 const elemento=<Modal aberto={Boolean(pedido)} titulo={pedido?.titulo||''} descricao={pedido?.texto}
  onFechar={()=>encerrar(cancelado)} largura={460}
  rodape={<>
   <button type="button" className="btn" onClick={()=>encerrar(cancelado)}>Cancelar</button>
   <button type="button" className={'btn '+((pedido as any)?.perigo?'perigo':'primary')} disabled={!podeConfirmar}
    onClick={()=>encerrar(pedido?.tipo==='perguntar'?valor.trim():true)}>
    {pedido?.rotuloOk||(pedido?.tipo==='perguntar'?'Salvar':'Confirmar')}</button>
  </>}>
  {pedido?.tipo==='perguntar'&&<label className="campo">
   <span>{pedido.rotulo||'Nome'}</span>
   <input className="input" value={valor} autoFocus onChange={evento=>setValor(evento.target.value)}
    onKeyDown={evento=>{if(evento.key==='Enter'&&valor.trim()){evento.preventDefault();encerrar(valor.trim())}}}/>
  </label>}
 </Modal>;

 return{confirmar,perguntar,elemento};
}
