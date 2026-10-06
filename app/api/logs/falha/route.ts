import{NextResponse}from'next/server';
import{createSupabaseServerClient}from'@/lib/supabase/server';

/**
 * O que quebrou na tela da pessoa, fora de um turno.
 *
 * O log do cliente só chegava ao servidor pendurado num turno. Um debrief que
 * falha não produz turno nenhum, então a falha que impediu três pessoas de
 * entregar a prova não existiu para quem conduzia a aula.
 *
 * Escreve com a sessão de quem reporta: a política exige user_id = auth.uid(),
 * de modo que ninguém registra falha em nome de outro.
 */
const ETAPAS=['debrief','sessao','turno','entrada','chamada','desconhecido'];

export async function POST(req:Request){
 try{
  const supabase=createSupabaseServerClient();
  if(!supabase)return NextResponse.json({registrado:false});
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({registrado:false});
  const corpo=await req.json().catch(()=>({}));
  const stage=ETAPAS.includes(String(corpo?.stage))?String(corpo.stage):'desconhecido';
  const message=String(corpo?.message||'').slice(0,500);
  if(!message)return NextResponse.json({registrado:false});
  const{error}=await supabase.from('challenge_client_failures').insert({
   session_id:corpo?.sessionId||null,user_id:user.id,stage,message,
   detail:corpo?.detail&&typeof corpo.detail==='object'?corpo.detail:{},
   user_agent:String(req.headers.get('user-agent')||'').slice(0,300)});
  // Antes da 026 a tabela não existe. Falhar ao registrar uma falha não pode
  // virar uma segunda falha na cara de quem já está travado.
  if(error)return NextResponse.json({registrado:false,detail:error.message});
  return NextResponse.json({registrado:true});
 }catch{return NextResponse.json({registrado:false})}
}
