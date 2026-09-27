/**
 * O código de um mundo é lido de um projetor e digitado num celular, então o
 * alfabeto deixa fora todo glifo que se confunde à distância: O/0 e I/1. Mesmo
 * alfabeto e mesmo tamanho do Pulso — para a turma é o mesmo gesto, e quem já
 * usou um não precisa reaprender o outro.
 *
 * Quem gera é o banco (migração 016), porque só ele sabe quais códigos já estão
 * em uso. Aqui ficam só as funções que o navegador e o servidor precisam para
 * ler o que a pessoa digitou.
 */
export const ALFABETO='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TAMANHO=4;

/**
 * Filtra em vez de rejeitar: quem digita recebe o código de um projetor ou de
 * uma mensagem, e erra do jeito previsível — minúscula, espaço no meio, e
 * sobretudo o link inteiro colado, que é o que acontece quando o código chegou
 * junto com o endereço. Filtrar caractere a caractere não resolve esse caso:
 * as letras de "https" entram na frente e o código sai errado. Então primeiro
 * se toma o último trecho do caminho, e só depois se filtra.
 */
export function normalizaCodigo(cru:string):string{
 const texto=String(cru||'').split(/[?#]/)[0];
 const trecho=texto.split('/').filter(Boolean).pop()||'';
 return trecho.toUpperCase().split('').filter(c=>ALFABETO.includes(c)).join('').slice(0,TAMANHO);
}

export function codigoValido(cru:string):boolean{
 return normalizaCodigo(cru).length===TAMANHO;
}
