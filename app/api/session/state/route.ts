import{NextResponse}from'next/server';import{saveSessionState}from'@/lib/supabase/sessions';

export async function POST(req:Request){
 try{
  const{sessionId,world,debrief,status}=await req.json();
  if(!sessionId)return NextResponse.json({error:'session_required'},{status:400});
  const saved=await saveSessionState(sessionId,{world,debrief,status});
  return NextResponse.json({saved});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('session_state_error',message);
  return NextResponse.json({error:'save_failed',detail:message},{status:500});
 }
}
