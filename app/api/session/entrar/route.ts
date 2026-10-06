import{NextResponse}from'next/server';import{defaultScenario}from'@/lib/simulation/scenario';
import{entrarNoMundo}from'@/lib/supabase/sessions';

export async function POST(req:Request){
 try{
  const{codigo}=await req.json();
  const r=await entrarNoMundo(String(codigo||''));
  if(!r)return NextResponse.json({configured:false},{status:503});
  if('erro'in r)return NextResponse.json({erro:r.erro},{status:404});
  const{provider,model,artifacts,competencies,news,calls_enabled,duration_minutes}=r.scenario;
  return NextResponse.json({entrou:true,session:r.session,
   mundo:{key:r.scenario.key,title:r.scenario.title},
   engine:{provider,model},artifacts:artifacts||[],
   competencies:(competencies?.length?competencies:defaultScenario.competencies)||[],
   news:(news?.length?news:defaultScenario.news)||[],
   callsEnabled:Boolean(calls_enabled),durationMinutes:duration_minutes,evidenceCount:r.evidenceCount??0});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('entrar_error',message);
  return NextResponse.json({erro:'falha',detail:message},{status:500});
 }
}
