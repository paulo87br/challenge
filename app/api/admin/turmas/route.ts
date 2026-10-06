import{NextResponse}from'next/server';
import{createSupabaseServerClient}from'@/lib/supabase/server';

/**
 * Turmas: criar, renomear, arquivar, e dizer de qual turma é um mundo.
 *
 * A autoridade é a mesma das outras telas do instrutor -- a política da 028 --
 * e a rota confere antes para devolver 403 legível em vez de um sucesso que
 * mexeu em zero linhas.
 */
async function instrutor(){
 const supabase=createSupabaseServerClient();
 if(!supabase)return{erro:NextResponse.json({error:'supabase_not_configured'},{status:503})};
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return{erro:NextResponse.json({error:'unauthenticated'},{status:401})};
 const{data:ok}=await supabase.rpc('is_challenge_instructor');
 if(!ok)return{erro:NextResponse.json({error:'forbidden'},{status:403})};
 return{supabase,user};
}

export async function POST(req:Request){
 const{supabase,user,erro}=await instrutor() as any;
 if(erro)return erro;
 try{
  const{acao,nome,id,scenarioKey,turmaId,arquivada}=await req.json();

  if(acao==='criar'){
   const limpo=String(nome||'').trim();
   if(!limpo)return NextResponse.json({error:'nome_vazio'},{status:400});
   const{data,error}=await supabase.from('challenge_turmas')
    .insert({nome:limpo,created_by:user.id}).select('id,nome').single();
   if(error)throw new Error(error.message);
   return NextResponse.json({criada:true,turma:data});
  }

  if(acao==='renomear'){
   const limpo=String(nome||'').trim();
   if(!id||!limpo)return NextResponse.json({error:'dados_incompletos'},{status:400});
   const{data,error}=await supabase.from('challenge_turmas').update({nome:limpo}).eq('id',id).select('id');
   if(error)throw new Error(error.message);
   return NextResponse.json({renomeada:(data||[]).length>0});
  }

  if(acao==='arquivar'){
   if(!id)return NextResponse.json({error:'dados_incompletos'},{status:400});
   const{data,error}=await supabase.from('challenge_turmas')
    .update({arquivada:arquivada!==false}).eq('id',id).select('id');
   if(error)throw new Error(error.message);
   return NextResponse.json({arquivada:(data||[]).length>0});
  }

  // Ligar um mundo a uma turma, ou soltá-lo passando turmaId nulo.
  if(acao==='atribuir'){
   if(!scenarioKey)return NextResponse.json({error:'dados_incompletos'},{status:400});
   const{data,error}=await supabase.from('challenge_scenarios')
    .update({turma_id:turmaId||null,updated_by:user.id}).eq('key',scenarioKey).select('key');
   if(error)throw new Error(error.message);
   return NextResponse.json({atribuido:(data||[]).length>0});
  }

  return NextResponse.json({error:'acao_desconhecida'},{status:400});
 }catch(error){
  const detalhe=error instanceof Error?error.message:String(error);
  // Antes da 028 a tabela e a coluna não existem; dizer isso é mais útil que 500.
  if(/challenge_turmas|turma_id/.test(detalhe))
   return NextResponse.json({error:'falta_migracao',detail:'Aplique a migração 028 para usar turmas.'},{status:409});
  return NextResponse.json({error:'falhou',detail:detalhe},{status:500});
 }
}
