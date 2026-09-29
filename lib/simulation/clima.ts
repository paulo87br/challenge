import type{Temperature}from'./types';

/**
 * O clima que a tela mostra, a partir dos diais que o Studio ajusta.
 *
 * O número era 72° escrito no código, com a frase "as coisas estão esquentando"
 * embaixo, em qualquer mundo. Os seis diais existiam, o instrutor os regulava, e
 * nada na tela do participante mudava.
 */
const FAIXAS:Array<{ate:number;frase:string}>=[
 {ate:34,frase:'está calmo por enquanto'},
 {ate:54,frase:'dá para respirar'},
 {ate:69,frase:'as coisas estão esquentando'},
 {ate:84,frase:'a pressão está alta'},
 {ate:100,frase:'está pegando fogo'},
];

export function climaDoMundo(temperatura?:Partial<Temperature>|null){
 const valores=Object.values(temperatura||{}).map(Number).filter(n=>Number.isFinite(n));
 // Sem diais, 50 é o meio honesto: não sugere calma nem urgência.
 const media=valores.length?valores.reduce((a,b)=>a+b,0)/valores.length:0.5;
 const grau=Math.round(Math.min(1,Math.max(0,media))*100);
 return{grau,frase:(FAIXAS.find(f=>grau<=f.ate)||FAIXAS[FAIXAS.length-1]).frase};
}
