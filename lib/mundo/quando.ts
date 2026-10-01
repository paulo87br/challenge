/**
 * Hora na hora da turma.
 *
 * A Vercel roda em UTC, então toda data formatada sem fuso aparecia três horas
 * adiantada: a sessão de 03:19 da madrugada era anunciada como 06:19. Para quem
 * lê o painel para saber quando a pessoa agiu, isso não é um detalhe de
 * formatação -- é a informação errada.
 *
 * O fuso é fixo e não vem do navegador de propósito: a mesma linha tem de ler
 * igual no servidor e no cliente, senão o React acusa a hidratação; e a aula é
 * em Piracicaba independentemente de onde o instrutor abra a tela.
 */
export const FUSO='America/Sao_Paulo';

export function quando(valor:string|number|Date|null|undefined):string{
 if(valor===null||valor===undefined||valor==='')return '—';
 const data=valor instanceof Date?valor:new Date(valor);
 if(Number.isNaN(data.getTime()))return '—';
 return data.toLocaleString('pt-BR',{timeZone:FUSO});
}

export function quandoCurto(valor:string|number|Date|null|undefined):string{
 if(valor===null||valor===undefined||valor==='')return '—';
 const data=valor instanceof Date?valor:new Date(valor);
 if(Number.isNaN(data.getTime()))return '—';
 return data.toLocaleString('pt-BR',{timeZone:FUSO,day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
