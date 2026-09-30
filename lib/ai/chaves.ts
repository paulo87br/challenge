import{PROVIDERS,type ProviderId}from'./providers';

/**
 * O que o runtime enxerga de cada chave — sem nunca devolver a chave.
 *
 * "Ausente" e "vazia" são coisas diferentes e o painel da Vercel não distingue:
 * ele lista o nome da variável, não se ela tem conteúdo. Uma variável salva em
 * branco aparece lá igual a uma preenchida e falha igual a uma que não existe.
 *
 * O tamanho vai junto porque é o que prova que a chave chegou inteira: uma
 * colagem cortada ou com aspas em volta muda o número sem mudar nada na tela.
 * Tamanho não é segredo; o valor nunca sai daqui.
 */
export type EstadoDaChave={estado:'ok'|'vazia'|'ausente';tamanho:number};

export function estadoDaVariavel(nome:string):EstadoDaChave{
 const bruto=process.env[nome];
 if(bruto===undefined)return{estado:'ausente',tamanho:0};
 const limpo=bruto.trim();
 if(!limpo)return{estado:'vazia',tamanho:bruto.length};
 return{estado:'ok',tamanho:limpo.length};
}

export function estadoDasChaves():Record<string,EstadoDaChave>{
 return Object.fromEntries((Object.keys(PROVIDERS) as ProviderId[])
  .map(id=>[id,estadoDaVariavel(PROVIDERS[id].keyEnv)]));
}
