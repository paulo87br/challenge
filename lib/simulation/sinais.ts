/**
 * O que acontece com a evidência entre o Observer e o banco.
 *
 * Uma turma real produziu 1993 sinais em 448 ações -- 4,4 por ação -- com 85%
 * positivos e a confiança colada em 0,85 ± 0,07. Um instrumento que quase nunca
 * discorda de si mesmo não distingue quem apurou de quem conversou: ele conta
 * digitação. Estas funções atacam três causas disso, todas determinísticas e
 * todas reversíveis, porque nenhuma inventa dado: elas recusam, fundem ou
 * marcam para corroboração.
 */
import type{EvidenceSignal,Competency}from'./types';

const PALAVRAS_VAZIAS=new Set(['a','o','as','os','de','da','do','das','dos','e','ou','que','para','por','com','sem',
 'um','uma','no','na','nos','nas','ao','aos','à','às','se','em','é','foi','ser','sobre','como','mais','já','ele','ela']);

export function termos(texto:string):Set<string>{
 return new Set(String(texto||'').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/[^a-z0-9\s]/g,' ').split(/\s+/)
  .filter(p=>p.length>2&&!PALAVRAS_VAZIAS.has(p)));
}

/** Jaccard entre dois textos: 1 é a mesma frase, 0 é nada em comum. */
export function parecenca(a:string,b:string):number{
 const x=termos(a),y=termos(b);
 if(!x.size||!y.size)return 0;
 let juntos=0;for(const t of x)if(y.has(t))juntos++;
 return juntos/(x.size+y.size-juntos);
}

/**
 * Quanto do menor cabe dentro do maior.
 *
 * Para "esta evidência toca o que a pessoa escreveu?", Jaccard é a medida
 * errada: comparando dez palavras com duas mil, a união domina e o resultado
 * tende a zero mesmo quando a evidência cita a frase inteira. Medi contra o
 * corpo real da turma e 89% dos sinais apareceram como sem lastro -- o número
 * era do meu cálculo, não do Observer.
 */
export function contencao(a:string,b:string):number{
 const x=termos(a),y=termos(b);
 if(!x.size||!y.size)return 0;
 let juntos=0;for(const t of x)if(y.has(t))juntos++;
 return juntos/Math.min(x.size,y.size);
}

const texto=(s:EvidenceSignal)=>`${s.behavior} ${s.evidence}`;
const peso=(s:EvidenceSignal)=>(Number(s.strength)||0)+(Number(s.confidence)||0);

/**
 * Funde sinais que dizem a mesma coisa sobre a mesma competência.
 *
 * Mesma ação: o Observer frequentemente devolve dois ou três sinais que são a
 * mesma observação em palavras diferentes. Mesma ideia: ao longo da sessão, a
 * pessoa que escreve muito repete a mesma conduta e cada repetição virava um
 * sinal novo, inflando quem digita.
 *
 * Fundir não é apagar: o sinal que fica é o mais forte, e o número de vezes que
 * a conduta reapareceu é informação -- devolvida em `repetido`, não descartada.
 */
export type SinalFundido=EvidenceSignal&{repetido?:number};

export function deduplicar(novos:EvidenceSignal[],anteriores:EvidenceSignal[]=[],limiar=0.6):
 {sinais:SinalFundido[];fundidos:number}{
 const mantidos:SinalFundido[]=[];
 let fundidos=0;
 for(const sinal of novos||[]){
  // Contra o que já está na sessão: repetir a mesma ideia não produz sinal novo.
  const jaDito=(anteriores||[]).some(a=>a.competency===sinal.competency&&parecenca(texto(a),texto(sinal))>=limiar);
  if(jaDito){fundidos++;continue}
  const irmao=mantidos.find(m=>m.competency===sinal.competency&&parecenca(texto(m),texto(sinal))>=limiar);
  if(irmao){
   fundidos++;
   irmao.repetido=(irmao.repetido||1)+1;
   // Fica o mais sustentado dos dois, não o primeiro a chegar.
   if(peso(sinal)>peso(irmao))Object.assign(irmao,sinal,{repetido:irmao.repetido});
   continue;
  }
  mantidos.push({...sinal});
 }
 return{sinais:mantidos,fundidos};
}

/**
 * Sinal cuja evidência não aponta para nada concreto não vale o que diz valer.
 *
 * A confiança saía praticamente constante, então ela não informava. Em vez de
 * reescalar -- que seria inventar números --, o que se faz aqui é recusar a
 * palavra do Observer quando ela não vem acompanhada: evidência curta demais,
 * ou que não toca o que a pessoa de fato escreveu, vira "pede corroboração" e
 * tem a confiança limitada ao que uma leitura não corroborada merece.
 */
/**
 * Lastro: a evidência aponta mesmo para o que a pessoa fez?
 *
 * Medido contra a turma real, o Observer se comporta em três faixas distintas.
 * Acima de 0,5 ele cita a pessoa -- "Antes de tudo, irei entender a situação com
 * o time" é a frase dela. Entre 0,15 e 0,5 ele parafraseia e às vezes troca de
 * assunto: alguém escreveu "assim que tivermos um posicionamento entraremos em
 * contato" e o sinal registrou "Agradeço pelo retorno e pela transparência",
 * que ninguém escreveu. Abaixo disso não há relação. E de um "Ok" saíram três
 * sinais de comunicação.
 *
 * Classificar, não descartar. Primeiro porque jogar fora metade da evidência é
 * uma afirmação forte demais para um limiar numérico sustentar sozinho.
 * Segundo, e mais importante: um sinal legítimo sobre o que a pessoa NÃO fez
 * não tem como citar o que ela escreveu, e seria o primeiro a cair. O que os
 * relatórios usam é o lastro; o que o Studio mostra é quanto o Observer
 * inventa, que é uma medida da qualidade do motor e não da pessoa.
 */
export type Lastro='citado'|'parafraseado'|'sem_apoio'|'nao_medido';
export const LASTRO_FORTE=0.5;
export const LASTRO_MINIMO=0.15;
export const TETO_PARAFRASE=0.6;
export const TETO_SEM_APOIO=0.4;
const TERMOS_MINIMOS_DA_ACAO=3;

export type SinalComLastro=SinalFundido&{lastro:Lastro};

export function calibrar(sinais:SinalFundido[],textoDaAcao:string):
 {sinais:SinalComLastro[];citados:number;parafraseados:number;semApoio:number}{
 // "Ok", "Obrigado": a pessoa agiu, e isso está na telemetria. O que não existe
 // é leitura de competência extraída de duas palavras de cortesia.
 const acaoRasa=Boolean(textoDaAcao)&&termos(textoDaAcao).size<TERMOS_MINIMOS_DA_ACAO;
 let citados=0,parafraseados=0,semApoio=0;
 const semApoioCom=(s:SinalFundido):SinalComLastro=>{
  semApoio++;
  return{...s,lastro:'sem_apoio',corroboration_required:true,
   confidence:Math.min(Number(s.confidence)||0,TETO_SEM_APOIO)};
 };
 const saida=(sinais||[]).map(s=>{
  const ev=String(s.evidence||'');
  // Sem texto de ação não dá para medir, e não medido não é reprovado: é o
  // caso de uma ligação ou de um turno sem texto, onde o silêncio do número
  // não autoriza conclusão nenhuma.
  if(!textoDaAcao)return{...s,lastro:'nao_medido' as Lastro};
  // Ação sem substância, ou evidência que é quase nada: não há o que sustentar.
  if(acaoRasa||termos(ev).size<3)return semApoioCom(s);
  const lastro=contencao(ev,textoDaAcao);
  if(lastro>=LASTRO_FORTE){citados++;return{...s,lastro:'citado' as Lastro}}
  if(lastro>=LASTRO_MINIMO){parafraseados++;
   return{...s,lastro:'parafraseado' as Lastro,corroboration_required:true,
    confidence:Math.min(Number(s.confidence)||0,TETO_PARAFRASE)};}
  return semApoioCom(s);
 });
 return{sinais:saida,citados,parafraseados,semApoio};
}

/**
 * Sinal cuja competência não está na régua do cenário não entra.
 *
 * O Observer já é instruído a copiar o código; quando ele erra, o sinal ficava
 * no banco apontando para uma competência que a tela não conhece -- invisível
 * no relatório e contado no total, que é a pior combinação.
 */
export function somenteDaRegua(sinais:SinalFundido[],framework:Competency[]):
 {sinais:SinalFundido[];foraDaRegua:string[]}{
 const codigos=new Set((framework||[]).map(c=>String(c.code)));
 if(!codigos.size)return{sinais,foraDaRegua:[]};
 const fora:string[]=[];
 const dentro=sinais.filter(s=>{
  if(codigos.has(String(s.competency)))return true;
  fora.push(String(s.competency));return false;
 });
 return{sinais:dentro,foraDaRegua:fora};
}
