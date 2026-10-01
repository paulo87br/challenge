import type{Character}from'./types';

function fold(value:string){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
}

// Marcar alguém é um ato real neste mundo: puxa a pessoa para o fio. O
// participante precisa do mesmo recurso que os personagens já têm.
export function mentionedCharacterIds(text:string,characters:Character[]){
 const body=fold(text);
 return characters.filter(character=>{
  const first=fold(String(character.name||'').split(' ')[0]);
  return Boolean(first)&&body.includes('@'+first);
 }).map(character=>character.id);
}

/**
 * Nomes citados que não são de ninguém do elenco.
 *
 * Numa corrida real o participante citou uma "Maria" que não existe neste mundo
 * e nada aconteceu: a marcação não casava com ninguém e sumia em silêncio. O
 * motor precisa saber que alguém foi chamado para que os personagens possam
 * reagir -- dizendo que não conhecem, perguntando quem é, ou puxando o assunto.
 */
export function mencoesDesconhecidas(text:string,characters:Character[]){
 const conhecidos=new Set(characters.map(c=>fold(String(c.name||'').split(' ')[0])));
 const achados=new Set<string>();
 // Exige espaço ou início antes do @, senão um e-mail no texto vira marcação.
 for(const bruto of String(text||'').match(/(?:^|\s)@[\p{L}][\p{L}'-]*/gu)||[]){
  const nome=bruto.trim().slice(1);
  if(nome&&!conhecidos.has(fold(nome)))achados.add(nome);
 }
 return [...achados];
}
