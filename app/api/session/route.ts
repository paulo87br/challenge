import{NextResponse}from'next/server';import{defaultScenario}from'@/lib/simulation/scenario';
import{ensureSession,pedeEscolha}from'@/lib/supabase/sessions';

export async function POST(){
 try{
  const entrada=await ensureSession();
  if(!entrada)return NextResponse.json({configured:false});
  // Mais de um mundo no ar e nenhuma sessão em andamento: não há o que deduzir,
  // e o /lab pergunta em vez de escolher pela pessoa.
  if(pedeEscolha(entrada))return NextResponse.json({configured:true,escolha:entrada.escolha,faltaMigracao:Boolean(entrada.faltaMigracao)});
  const bundle=entrada;
  // The workspace needs the engine choice and the artifact list to drive a turn;
  // it never needs the rest of the authored scenario.
  const{provider,model,artifacts,competencies,news,calls_enabled,duration_minutes}=bundle.scenario;
  return NextResponse.json({configured:true,session:bundle.session,
   mundo:{key:bundle.scenario.key,title:bundle.scenario.title},
   engine:{provider,model},artifacts:artifacts||[],competencies:(competencies?.length?competencies:defaultScenario.competencies)||[],news:(news?.length?news:defaultScenario.news)||[],callsEnabled:Boolean(calls_enabled),durationMinutes:duration_minutes,evidenceCount:bundle.evidenceCount??0});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('session_error',message);
  return NextResponse.json({configured:false,error:message},{status:500});
 }
}
