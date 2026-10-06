/**
 * O que o mundo pôs diante da pessoa e ela nunca respondeu.
 *
 * Hoje a avaliação só enxerga o que foi feito. Quem escreve muito acumula
 * evidência; quem escolhe não responder não deixa rastro -- e escolher não
 * responder é uma decisão tão observável quanto escrever, às vezes mais. A
 * turma de 05/10 mostrou isso de forma crua: a cobertura por competência
 * acompanhava o volume de digitação quase perfeitamente.
 *
 * Omissão aqui é descritiva, nunca acusatória. Um estímulo sem resposta pode
 * ter sido uma priorização correta, e o debrief é instruído a tratá-lo como
 * informação sobre a sessão, não como falha da pessoa.
 */
type Evento={id?:string;channel?:string;characterId?:string;sender?:string;subject?:string;body?:string;
 at?:number;visible?:boolean;urgency?:number};
type Acao={characterId?:string;channel?:string;at?:number;metadata?:Record<string,unknown>};

export type Estimulo={id:string;canal:string;de:string;characterId:string;assunto:string;trecho:string;
 minuto:number;urgencia:number;respondido:boolean;minutosAteResponder:number|null};

const PRAZO_DE_CORTESIA=0;

/**
 * Um estímulo é algo que um personagem dirigiu ao participante e que ele podia
 * ver. Mensagem que a própria pessoa escreveu não é estímulo, e evento
 * invisível ou agendado para o futuro ainda não chegou.
 */
export function estimulos(eventos:Evento[],ateMinuto:number):Evento[]{
 return (eventos||[]).filter(e=>
  e.visible!==false&&
  e.sender!=='Você'&&
  Boolean(e.characterId)&&
  (e.channel==='mail'||e.channel==='chat'||e.channel==='call')&&
  (Number(e.at)||0)<=ateMinuto);
}

/**
 * Respondeu quem agiu em direção àquela pessoa depois do estímulo. Não exige o
 * mesmo canal: responder por conversa um e-mail é resposta.
 */
export function levantarOmissoes(eventos:Evento[],acoes:Acao[],ateMinuto:number):
 {estimulos:Estimulo[];semResposta:Estimulo[]}{
 const vistos=estimulos(eventos,ateMinuto);
 const lista:Estimulo[]=vistos.map((e,i)=>{
  const minuto=Number(e.at)||0;
  const depois=(acoes||[]).filter(a=>
   a.characterId===e.characterId&&(Number(a.at)||0)>=minuto+PRAZO_DE_CORTESIA);
  const primeira=depois.length?Math.min(...depois.map(a=>Number(a.at)||0)):null;
  return{
   id:String(e.id||`${e.channel}-${minuto}-${i}`),
   canal:String(e.channel||''),
   de:String(e.sender||e.characterId||''),
   characterId:String(e.characterId||''),
   assunto:String(e.subject||''),
   trecho:String(e.body||'').replace(/\s+/g,' ').slice(0,160),
   minuto,
   urgencia:Number(e.urgency)||0,
   respondido:primeira!==null,
   minutosAteResponder:primeira===null?null:primeira-minuto};
 });
 // O mais urgente primeiro: é o que um instrutor quer ver no topo.
 const semResposta=lista.filter(e=>!e.respondido)
  .sort((a,b)=>(b.urgencia-a.urgencia)||(a.minuto-b.minuto));
 return{estimulos:lista,semResposta};
}

/** Quantos estímulos de cada personagem ficaram sem resposta. */
export function quemFicouSemResposta(semResposta:Estimulo[]):Array<{characterId:string;de:string;quantos:number}>{
 const mapa=new Map<string,{characterId:string;de:string;quantos:number}>();
 for(const e of semResposta){
  const atual=mapa.get(e.characterId)||{characterId:e.characterId,de:e.de,quantos:0};
  atual.quantos++;mapa.set(e.characterId,atual);
 }
 return [...mapa.values()].sort((a,b)=>b.quantos-a.quantos);
}
