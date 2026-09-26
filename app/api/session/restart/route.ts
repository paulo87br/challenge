import{NextResponse}from'next/server';import{defaultScenario}from'@/lib/simulation/scenario';import{restartSession}from'@/lib/supabase/sessions';

export async function POST(){
 try{
  const bundle=await restartSession();
  if(!bundle)return NextResponse.json({configured:false});
  const{provider,model,artifacts,competencies,news,calls_enabled,duration_minutes}=bundle.scenario;
  return NextResponse.json({configured:true,session:bundle.session,
   engine:{provider,model},artifacts:artifacts||[],competencies:(competencies?.length?competencies:defaultScenario.competencies)||[],news:(news?.length?news:defaultScenario.news)||[],callsEnabled:Boolean(calls_enabled),durationMinutes:duration_minutes});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('session_restart_error',message);
  return NextResponse.json({error:'restart_failed',detail:message},{status:500});
 }
}
