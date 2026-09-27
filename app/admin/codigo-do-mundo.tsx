'use client';
/**
 * O código de um mundo, e o cartão que se mostra para a turma.
 *
 * Na linha fica só o código, porque a lista de cenários já era longa demais. O
 * QR grande e o link vivem no cartão, que é o que se projeta — e que também
 * serve para colar o link num grupo de mensagens antes da aula.
 */
import{useEffect,useState}from'react';
import{Check,Copy,QrCode}from'lucide-react';
import{Modal}from'@/app/ui/dialogo';
import{Qr}from'@/app/ui/qr';

export function CodigoDoMundo({codigo,titulo}:{codigo:string|null;titulo:string}){
 const[aberto,setAberto]=useState(false);
 const[copiado,setCopiado]=useState('');
 const[origem,setOrigem]=useState('');
 // window não existe no servidor, e o endereço muda entre a prévia e a
 // produção: ler do navegador é o que garante um link que realmente abre.
 useEffect(()=>{setOrigem(window.location.origin)},[]);
 useEffect(()=>{if(!copiado)return;const id=setTimeout(()=>setCopiado(''),1800);return()=>clearTimeout(id)},[copiado]);

 if(!codigo)return <span className="diagnostic-pill attention">sem código</span>;
 const link=origem?`${origem}/e/${codigo}`:`/e/${codigo}`;

 async function copiar(texto:string,qual:string){
  try{await navigator.clipboard.writeText(texto);setCopiado(qual)}
  catch{setCopiado('')}
 }

 return <>
  <button type="button" className="codigo-chip" onClick={()=>setAberto(true)}
   aria-label={`Código e QR de ${titulo}`}>
   <QrCode size={15}/><b>{codigo}</b>
  </button>

  <Modal aberto={aberto} titulo={titulo} largura={520}
   descricao="Quem lê o código ou o QR entra direto neste mundo."
   onFechar={()=>setAberto(false)}>
   <div className="cartao-acesso">
    <div className="cartao-qr">{origem&&<Qr url={link} size={320}/>}</div>
    <div className="cartao-codigo">
     <small>código</small>
     <b>{codigo}</b>
    </div>
   </div>
   <div className="cartao-link">
    <code>{link}</code>
    <button type="button" className="btn" onClick={()=>copiar(link,'link')}>
     {copiado==='link'?<><Check size={15}/>Copiado</>:<><Copy size={15}/>Copiar link</>}</button>
   </div>
  </Modal>
 </>;
}
