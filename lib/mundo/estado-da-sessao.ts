/**
 * Como uma sessão se chama na tela.
 *
 * Isto existia duas vezes, escrito de dois jeitos. O Studio sabia distinguir
 * pausada de abandonada; a tela de Sessões comparava com 'completed' e chamava
 * todo o resto de "em andamento" -- de modo que uma sessão abandonada, uma
 * pausada e uma encerrada sem debrief apareciam todas como se alguém ainda
 * estivesse lá dentro. O estado já estava no dado; só a leitura é que mentia.
 *
 * O caso desconhecido não vira "em andamento". Um status que ninguém mapeou
 * aparece como ele é: foi justamente o contrário disso que escondeu o problema
 * por tanto tempo.
 */
export type LeituraDaSessao={rotulo:string;tom:'ok'|'attention'|''};

export function estadoDaSessao(status:string|null|undefined,temDebrief:boolean):LeituraDaSessao{
 // O debrief é o fim do Challenge. Se ele existe, a pessoa chegou ao fim --
 // não importa o que tenha acontecido com a sessão depois.
 if(temDebrief)return{rotulo:'encerrada',tom:'ok'};
 switch(status){
  case'active':return{rotulo:'em andamento',tom:'attention'};
  case'paused':return{rotulo:'pausada',tom:''};
  case'abandoned':return{rotulo:'abandonada',tom:''};
  case'completed':return{rotulo:'encerrada sem debrief',tom:'ok'};
  default:return{rotulo:String(status||'sem estado'),tom:''};
 }
}
