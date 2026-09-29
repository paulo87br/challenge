import type{WorldState}from'./types';

export type DocumentoDoMundo={id:string;name:string;at:number;sender:string;body:string};

/**
 * Os documentos que o participante já tem em mãos.
 *
 * Eles moram em dois lugares diferentes conforme a origem do mundo: o cenário
 * autorado no Studio guarda documents_available e documentContents no topo do
 * knowledge, e o mundo compilado os guarda aninhados dentro de knowledgeCatalog.
 * Ler só um dos dois faz o acervo sumir em metade dos mundos -- foi assim que o
 * Projeto Atlas ficou com um único documento.
 *
 * Artefatos entram em documentContents porque o motor precisa do texto para
 * entregá-los quando alguém pede, mas não entram no acervo: quem os guarda é uma
 * pessoa, e se pede a ela.
 */
export function acervoDoMundo(world:WorldState):DocumentoDoMundo[]{
 const fatos=(world.facts||{}) as Record<string,any>;
 const catalogo=(fatos.knowledgeCatalog||{}) as Record<string,any>;
 const conteudos:Record<string,string>={...(catalogo.documentContents||{}),...(fatos.documentContents||{})};
 const listados=fatos.documents_available??catalogo.documents_available;
 const nomes:string[]=Array.isArray(listados)&&listados.length?listados:Object.keys(conteudos);
 const quando=(world.startMinute??world.minute)-1;
 return nomes
  .filter((nome,i)=>typeof nome==='string'&&conteudos[nome]&&nomes.indexOf(nome)===i)
  .map((nome,i)=>({
   id:`doc-${i}-${nome.toLocaleLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,32)}`,
   name:nome,at:quando,sender:'Acervo do mundo',body:conteudos[nome]}));
}
