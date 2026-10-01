import{ASSENTO,type Character}from'./types';

export type NoDoOrganograma={
 id:string;nome:string;papel:string;euMesmo?:boolean;
 respondeA?:string;filhos:NoDoOrganograma[]};
export type BlocoDeOrganizacao={org:string;deCasa:boolean;raizes:NoDoOrganograma[]};

/**
 * Monta o organograma a partir do que foi autorado.
 *
 * O gráfico antigo era uma fila: a pessoa de maior influência em cima e todo o
 * resto numa linha embaixo dela. No caso jurídico isso pendurava o sócio e o
 * estagiário de um escritório contratado debaixo da CEO da transportadora --
 * exatamente a fronteira que o caso existe para discutir.
 *
 * Sem reportsTo autorado, cai no comportamento antigo: quem tem mais influência
 * dentro de cada organização fica no topo e os demais logo abaixo. É um palpite,
 * mas é um palpite declarado, e some assim que alguém escrever a hierarquia.
 */
export function organograma(characters:Character[],seatRole:string,organizacao?:string):BlocoDeOrganizacao[]{
 const pessoas=characters.filter(c=>c?.id);
 // A casa é o que o cenário declarou. Sem declaração, cai na convenção antiga
 // -- quem não tem organização é de dentro -- e, faltando as duas coisas, na
 // primeira que aparecer, que é um palpite mas não mente sobre fronteira
 // nenhuma porque aí só existe uma.
 const declarada=String(organizacao||'').trim();
 const nomeOrg=(c:Character)=>String(c.org||declarada||'').trim();
 const orgs=[...new Set(pessoas.map(nomeOrg))];
 const daCasa=declarada&&orgs.includes(declarada)?declarada
  :(orgs.find(o=>pessoas.some(c=>nomeOrg(c)===o&&!c.org))??orgs[0]??'');
 const ordenadas=[daCasa,...orgs.filter(o=>o!==daCasa)];

 return ordenadas.filter(o=>o!==undefined).map(org=>{
  const doGrupo=pessoas.filter(c=>nomeOrg(c)===org);
  const porId=new Map(doGrupo.map(c=>[c.id,c]));
  const nome=(id?:string)=>id===ASSENTO?'você':porId.get(String(id))?.name;

  // Um ciclo autorado por engano não pode travar a tela: quem fecha o laço
  // vira raiz, e o desenho continua legível.
  const temCiclo=(c:Character)=>{
   const vistos=new Set<string>([c.id]);
   let atual=c.reportsTo;
   while(atual&&atual!==ASSENTO){
    if(vistos.has(atual))return true;
    vistos.add(atual);atual=porId.get(atual)?.reportsTo;
   }
   return false;
  };
  const pai=(c:Character)=>{
   const alvo=c.reportsTo;
   if(!alvo||temCiclo(c))return undefined;
   if(alvo===ASSENTO)return ASSENTO;
   return porId.has(alvo)?alvo:undefined;
  };

  const no=(c:Character):NoDoOrganograma=>({id:c.id,nome:c.name,papel:c.role,
   respondeA:nome(pai(c)),
   filhos:doGrupo.filter(f=>pai(f)===c.id).map(no)});

  const deCasa=org===daCasa;
  const semPai=doGrupo.filter(c=>!pai(c));
  const souOParticipante:NoDoOrganograma={id:ASSENTO,nome:'Você',papel:seatRole,euMesmo:true,
   filhos:doGrupo.filter(c=>pai(c)===ASSENTO).map(no)};

  // Sem hierarquia autorada, o antigo palpite por influência -- mas só dentro
  // de cada organização, nunca atravessando a fronteira entre elas.
  const ninguemAutorou=doGrupo.every(c=>!c.reportsTo);
  if(ninguemAutorou&&doGrupo.length>1){
   const topo=doGrupo.reduce((a,b)=>(Number(b.influence)||0)>(Number(a.influence)||0)?b:a);
   const raiz:NoDoOrganograma={id:topo.id,nome:topo.name,papel:topo.role,
    filhos:doGrupo.filter(c=>c.id!==topo.id).map(c=>({id:c.id,nome:c.name,papel:c.role,filhos:[]}))};
   if(deCasa)raiz.filhos=[{...souOParticipante,respondeA:raiz.nome},...raiz.filhos];
   return{org,deCasa,raizes:[raiz]};
  }

  const raizes=semPai.map(no);
  if(deCasa){
   // O assento entra sob o topo da casa: é de lá que ele responde.
   // O card do participante era o único sem dizer a quem responde, o que numa
   // tela cuja pergunta é "quem responde a quem" é a omissão mais visível.
   if(raizes.length===1)raizes[0].filhos=[{...souOParticipante,respondeA:raizes[0].nome},...raizes[0].filhos];
   else raizes.push(souOParticipante);
  }
  return{org,deCasa,raizes};
 });
}
