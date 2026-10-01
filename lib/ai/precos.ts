/**
 * O que cada coisa custa, para o Studio poder somar.
 *
 * Duas regras aqui, e as duas existem porque um número inventado é pior que
 * nenhum: só entra modelo cujo preço eu sei, e cada valor diz de onde veio.
 * Modelo sem preço aparece na tela com os tokens e sem cifra, em vez de ser
 * estimado por semelhança.
 *
 * Preços mudam. Quando a conta não bater com a fatura, é aqui que se corrige.
 */
export type PrecoDeModelo={entrada:number;saida:number;fonte:string};

/** Dólares por 1 milhão de tokens. */
export const PRECOS:Record<string,PrecoDeModelo>={
 'gpt-4o-mini':{entrada:0.15,saida:0.60,fonte:'tabela da OpenAI'},
 'gpt-4o':{entrada:2.50,saida:10.00,fonte:'tabela da OpenAI'},
};

/**
 * Voz, em dólares por minuto.
 *
 * Este não vem de tabela: vem de medição. Uma sessão real de 01/10/2026 custou
 * US$ 1,06 com 9,5 minutos de ligação e 14 turnos de texto; descontado o texto,
 * sobra US$ 1,03 de voz. É o número mais confiável que temos porque é o que a
 * fatura cobrou, e é o que domina o custo de uma turma.
 */
export const VOZ_POR_MINUTO=0.11;
export const VOZ_FONTE='medido em sessão real de 01/10/2026';

export function custoDeTokens(model:string|null|undefined,entrada:number,saida:number){
 const preco=PRECOS[String(model||'').trim()];
 if(!preco)return null;
 return (entrada*preco.entrada+saida*preco.saida)/1_000_000;
}

export function custoDeVoz(segundos:number){return (segundos/60)*VOZ_POR_MINUTO}
