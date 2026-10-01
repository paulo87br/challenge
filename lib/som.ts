/**
 * Os sons do mundo, sintetizados — nenhum arquivo de áudio.
 *
 * Um aviso curto quando algo chega, e um toque de telefone enquanto alguém
 * liga. Sem isto, o mundo tomava iniciativa e o participante só descobria se
 * estivesse olhando para a aba certa.
 *
 * O navegador só deixa tocar depois de um gesto da pessoa, então o contexto é
 * criado na primeira interação — o botão "Entrar no mundo" do briefing serve de
 * destravamento natural. Tudo aqui falha em silêncio: som é cortesia, e uma
 * exceção de áudio não pode derrubar a tela.
 */
let ctx:AudioContext|null=null;
let tocando:{parar:()=>void}|null=null;
let mudo=false;

function contexto():AudioContext|null{
 try{
  if(!ctx){
   const C=(window as any).AudioContext||(window as any).webkitAudioContext;
   if(!C)return null;
   ctx=new C() as AudioContext;
  }
  const atual:AudioContext=ctx;
  if(atual.state==='suspended')atual.resume().catch(()=>{});
  return atual;
 }catch{return null}
}

/** Chamado no primeiro gesto: cria o contexto enquanto o navegador permite. */
export function destravarSom(){contexto()}
export function silenciar(valor:boolean){mudo=valor;if(valor)pararToque()}
export function estaMudo(){return mudo}

function nota(c:AudioContext,freq:number,inicio:number,duracao:number,volume=0.12){
 const osc=c.createOscillator(),ganho=c.createGain();
 osc.type='sine';osc.frequency.value=freq;
 // Envelope curto: um tom quadrado e seco vira um clique desagradável.
 ganho.gain.setValueAtTime(0,inicio);
 ganho.gain.linearRampToValueAtTime(volume,inicio+0.015);
 ganho.gain.exponentialRampToValueAtTime(0.0001,inicio+duracao);
 osc.connect(ganho);ganho.connect(c.destination);
 osc.start(inicio);osc.stop(inicio+duracao+0.02);
}

/** Duas notas ascendentes: algo chegou. */
export function tocarAviso(){
 if(mudo)return;
 const c=contexto();if(!c)return;
 try{const t=c.currentTime;nota(c,660,t,0.12);nota(c,880,t+0.1,0.16)}catch{}
}

/** Toque de telefone, repetindo até alguém atender ou recusar. */
export function iniciarToque(){
 if(mudo||tocando)return;
 const c=contexto();if(!c)return;
 let vivo=true;
 const ciclo=()=>{
  if(!vivo)return;
  try{
   const t=c.currentTime;
   // Dois trinados curtos e um silêncio, que é o desenho de um telefone.
   for(const atraso of [0,0.4]){nota(c,520,t+atraso,0.22,0.09);nota(c,660,t+atraso+0.08,0.22,0.09)}
  }catch{}
 };
 ciclo();
 const id=setInterval(ciclo,2400);
 tocando={parar:()=>{vivo=false;clearInterval(id)}};
}

export function pararToque(){tocando?.parar();tocando=null;}
