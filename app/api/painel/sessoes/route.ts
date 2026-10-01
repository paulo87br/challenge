import{NextResponse}from'next/server';
import{createSupabaseServerClient}from'@/lib/supabase/server';

/**
 * O que o instrutor pode fazer com uma sessão depois que ela existe.
 *
 * Roda com a sessão do próprio instrutor, não com a chave de serviço: quem
 * autoriza é a política de RLS da 024, no banco. A rota confere antes para
 * devolver um 403 legível em vez de um sucesso que não mexeu em nada.
 *
 * Toda ação devolve quantas linhas mudaram de fato contra quantas foram
 * pedidas. Encerrar uma sessão já encerrada não é erro, é um não-evento -- mas
 * a tela precisa poder dizer isso em vez de fingir que fez.
 */
const ACOES=['encerrar','reabrir','excluir']as const;
type Acao=typeof ACOES[number];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request:Request){
 const supabase=createSupabaseServerClient();
 if(!supabase)return NextResponse.json({error:'sem_supabase'},{status:503});
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:'sem_sessao'},{status:401});
 const{data:instrutor}=await supabase.rpc('is_challenge_instructor');
 if(!instrutor)return NextResponse.json({error:'nao_e_instrutor'},{status:403});

 const corpo=await request.json().catch(()=>null);
 const acao=String(corpo?.acao||'')as Acao;
 if(!ACOES.includes(acao))return NextResponse.json({error:'acao_desconhecida'},{status:400});
 const ids:string[]=Array.isArray(corpo?.ids)?corpo.ids.filter((id:unknown)=>typeof id==='string'&&UUID.test(id)):[];
 if(!ids.length)return NextResponse.json({error:'sem_sessoes'},{status:400});
 // Um lote grande demais é engano, não intenção: a turma inteira cabe bem
 // abaixo disso e o painel só lista cem.
 if(ids.length>200)return NextResponse.json({error:'lote_grande_demais'},{status:400});

 const pedidas=ids.length;

 // Ler antes de escrever, para poder separar duas coisas que a contagem de
 // linhas afetadas confunde: o que não se aplicava (encerrar o que já estava
 // encerrado) e o que o banco recusou. Sem essa separação, uma política de RLS
 // faltando devolve zero linhas sem erro nenhum e a tela anuncia um
 // não-evento tranquilizador -- foi o que este teste pegou.
 const{data:atuais,error:erroLeitura}=await supabase.from('challenge_sessions')
  .select('id,status,debrief').in('id',ids);
 if(erroLeitura)return NextResponse.json({error:erroLeitura.message},{status:400});
 const correndo=(linha:any)=>linha.status==='active'||linha.status==='paused';
 const elegiveis=(atuais||[]).filter(linha=>
  acao==='excluir'?true
  :acao==='encerrar'?correndo(linha)
  // Reabrir com debrief entregue seria descartar a leitura, não reabrir.
  :!linha.debrief&&linha.status!=='active').map(linha=>String(linha.id));

 const responder=(afetadas:number)=>NextResponse.json({acao,pedidas,elegiveis:elegiveis.length,afetadas});
 if(!elegiveis.length)return responder(0);

 if(acao==='excluir'){
  const{data,error}=await supabase.from('challenge_sessions').delete().in('id',elegiveis).select('id');
  if(error)return NextResponse.json({error:error.message},{status:400});
  return responder(data?.length||0);
 }
 if(acao==='encerrar'){
  // 'completed' sem debrief é o que de fato aconteceu: a sessão acabou e
  // ninguém gerou leitura nenhuma dela.
  const{data,error}=await supabase.from('challenge_sessions')
   .update({status:'completed',completed_at:new Date().toISOString()})
   .in('id',elegiveis).select('id');
  if(error)return NextResponse.json({error:error.message},{status:400});
  return responder(data?.length||0);
 }
 const{data,error}=await supabase.from('challenge_sessions')
  .update({status:'active',completed_at:null})
  .in('id',elegiveis).select('id');
 if(error)return NextResponse.json({error:error.message},{status:400});
 return responder(data?.length||0);
}
