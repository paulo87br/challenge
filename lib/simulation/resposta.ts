/**
 * O turno alcançou a pessoa?
 *
 * Isto existia dentro da rota, olhando só o canal 'chat'. Como a resposta a um
 * e-mail chega em 'mail', todo reply_email era carimbado como "o participante
 * vê silêncio" -- 254 vezes numa única turma, enquanto a resposta estava lá, na
 * caixa de entrada. O diagnóstico que existe para flagrar silêncio passou a
 * produzi-lo no relatório.
 *
 * Um personagem respondeu quando produziu, agora e de forma visível, qualquer
 * evento endereçado de volta. O canal em que ele responde é escolha do mundo:
 * responder por chat a um e-mail é uma reação legítima, não uma falha.
 */
type Evento={channel?:string;characterId?:string;visible?:boolean;delay_minutes?:unknown;
 mentionedCharacterIds?:string[]};

const agoraEVisivel=(e:Evento)=>e.visible!==false&&(Number(e.delay_minutes)||0)===0;

export function respostaDoPersonagem(events:Evento[],endereçado:string|undefined):
 {respondeu:boolean;canal:string|null}{
 if(!endereçado)return{respondeu:true,canal:null};
 const dele=(events||[]).filter(e=>e.characterId===endereçado&&agoraEVisivel(e));
 return{respondeu:dele.length>0,canal:dele[0]?.channel||null};
}

/**
 * Quem foi marcado no turno, em qualquer canal. Marcar alguém num e-mail conta
 * tanto quanto marcar numa conversa.
 */
export function mencoesDoTurno(events:Evento[]):string[]{
 return [...new Set((events||[]).flatMap(e=>e.mentionedCharacterIds||[]))].filter(Boolean);
}

/**
 * Quantos dos marcados realmente apareceram. Também não é assunto de um canal
 * só: o handoff pode chegar por e-mail.
 */
export function cascata(events:Evento[],mencionados:string[]):string[]{
 return mencionados.filter(id=>(events||[]).some(e=>e.characterId===id&&agoraEVisivel(e)));
}
