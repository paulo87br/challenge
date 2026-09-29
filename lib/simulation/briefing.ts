import type{WorldState}from'./types';
import{acervoDoMundo}from'./acervo';

/**
 * O documento que abre o Challenge.
 *
 * Um cenário com gente própria começa com a caixa de entrada vazia -- de
 * propósito, para não herdar a conversa de outro mundo. Só que o participante
 * ficava sem nada: a descrição do mundo estava autorada e não aparecia em lugar
 * nenhum, e a missão era uma linha no topo da tela.
 *
 * Nada aqui é inventado. Tudo sai do que já foi escrito no Studio: a descrição
 * do mundo, a cadeira, a missão e o elenco. Um cenário bem escrito produz um
 * briefing bom sem ninguém escrever duas vezes.
 */
export const BRIEFING_ID='briefing';

function maiuscula(texto:string){
 const t=texto.trim();
 return t?t[0].toLocaleUpperCase('pt-BR')+t.slice(1):'';
}

export function briefingDoMundo(world:WorldState){
 const fatos=world.facts as Record<string,unknown>;
 const descricao=String(fatos?.worldDescription||'').trim();
 const missao=String(fatos?.mission||'').trim();
 const pessoas=world.characters.map(p=>`• ${p.name} — ${p.role}`).join('\n');
 // A mesma resolução que alimenta os Arquivos: o briefing não pode prometer um
 // documento que a tela não mostra, nem esconder um que ela mostra.
 const documentos=acervoDoMundo(world).map(d=>`• ${d.name}`).join('\n');

 const corpo=[
  descricao&&`O QUE ACONTECEU\n\n${descricao}`,
  `SUA CADEIRA\n\n${world.seat.role}. As decisões desta cadeira são suas; ninguém vai tomá-las por você, e ninguém vai dizer que você acertou no meio do caminho.`,
  missao&&`O QUE SE ESPERA DE VOCÊ\n\n${maiuscula(missao)}`,
  pessoas&&`QUEM ESTÁ EM VOLTA\n\n${pessoas}\n\nCada um tem seus próprios interesses e sua própria versão dos fatos. Nem tudo que te contarem foi apurado.`,
  documentos&&`O QUE VOCÊ JÁ TEM EM MÃOS\n\n${documentos}`,
  `COMO FUNCIONA\n\nVocê age por e-mail e por conversa, e por ligação quando o mundo permitir. Pode pedir documentos às pessoas, marcar alguém com @ numa conversa, anexar o que quiser aos Arquivos e acompanhar o Feed.\n\nO relógio corre enquanto você trabalha. Quando decidir encerrar, vá em Encerrar para receber sua leitura da sessão.`,
 ].filter(Boolean).join('\n\n');

 return{id:BRIEFING_ID,name:`Briefing — ${world.title}`,at:world.startMinute??world.minute,
  sender:'Abertura do Challenge',body:corpo};
}
