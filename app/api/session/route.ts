import{NextResponse}from'next/server';import{ensureSession}from'@/lib/supabase/sessions';

export async function POST(){
 try{
  const bundle=await ensureSession();
  if(!bundle)return NextResponse.json({configured:false});
  // The workspace needs the engine choice and the artifact list to drive a turn;
  // it never needs the rest of the authored scenario.
  const{provider,model,artifacts,duration_minutes}=bundle.scenario;
  return NextResponse.json({configured:true,session:bundle.session,
   engine:{provider,model},artifacts:artifacts||[],durationMinutes:duration_minutes});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('session_error',message);
  return NextResponse.json({configured:false,error:message},{status:500});
 }
}
