'use client';
/**
 * Desenhado no cliente para a tela não esperar ida e volta ao servidor.
 *
 * O QR ausente é sobrevivível: o código de quatro caracteres está sempre ao
 * lado dele em corpo grande, e digitar quatro caracteres é o caminho que
 * funciona em qualquer celular.
 */
import{useEffect,useRef}from'react';
import QRCode from'qrcode';

export function Qr({url,size=148}:{url:string;size?:number}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;
  if(!canvas)return;
  QRCode.toCanvas(canvas,url,{width:size,margin:1,
   color:{dark:'#211a38',light:'#fffdf8'},errorCorrectionLevel:'M'})
   .then(()=>{
    // A biblioteca escreve style="width:NNNpx;height:NNNpx" inline depois de
    // desenhar, e estilo inline vence a folha. O atributo width/height continua
    // alto, que é o que dá nitidez; só a medida em CSS passa a obedecer ao pai.
    canvas.style.width='100%';canvas.style.height='auto';canvas.style.display='block';
   })
   .catch(()=>{});
 },[url,size]);
 return <canvas ref={ref} width={size} height={size} aria-label={`QR code para ${url}`}/>;
}
