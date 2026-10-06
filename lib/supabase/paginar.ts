/**
 * Ler uma tabela inteira, e saber quando não deu.
 *
 * O PostgREST devolve no máximo mil linhas por requisição e não avisa que
 * cortou. Uma turma de 26 pessoas produziu 1977 evidências, e todas as telas do
 * instrutor passaram a mostrar contagens truncadas: alguém com 127 sinais
 * aparecia com zero. Não havia erro em lugar nenhum -- os números simplesmente
 * eram outros.
 *
 * A paginação precisa de ordem estável: sem `order`, duas páginas podem repetir
 * ou pular linhas. Quem chama ordena; aqui só se percorre.
 *
 * O resultado diz se terminou. Uma falha no meio devolve o que já veio com
 * `completo:false`, e a tela mostra isso em vez de exibir um número menor como
 * se fosse o número.
 */
export type Paginado<T>={linhas:T[];completo:boolean;erro?:string};

// Teto de segurança: se algo mudar debaixo da paginação, é melhor parar e
// dizer que está incompleto do que varrer para sempre.
const TETO=200000;

export async function todasAsLinhas<T=any>(consulta:()=>any,passo=1000):Promise<Paginado<T>>{
 const linhas:T[]=[];
 for(let inicio=0;;inicio+=passo){
  const{data,error}=await consulta().range(inicio,inicio+passo-1);
  if(error)return{linhas,completo:false,erro:error.message};
  const lote=(data||[])as T[];
  linhas.push(...lote);
  if(lote.length<passo)return{linhas,completo:true};
  if(linhas.length>=TETO)return{linhas,completo:false,erro:'limite_de_leitura'};
 }
}
