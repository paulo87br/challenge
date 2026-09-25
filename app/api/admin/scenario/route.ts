import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';

export async function POST(req:Request){
 try{
  const supabase=createSupabaseServerClient();
  if(!supabase)return NextResponse.json({error:'supabase_not_configured'},{status:503});
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'unauthenticated'},{status:401});
  // The policy already refuses a non-instructor; this turns a silent empty
  // update into an honest 403.
  const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
  if(!isInstructor)return NextResponse.json({error:'forbidden'},{status:403});

  const body=await req.json();
  const row={
   key:String(body.key||'atlas'),title:String(body.title||'').trim(),domain:String(body.domain||'').trim(),
   seat_role:String(body.seat_role||'').trim(),mission:String(body.mission||''),
   world_description:String(body.world_description||''),temperature:body.temperature||{},
   duration_minutes:Number(body.duration_minutes)||30,updated_by:user.id,updated_at:new Date().toISOString()
  };
  if(!row.title||!row.seat_role)return NextResponse.json({error:'invalid',detail:'Título e assento são obrigatórios.'},{status:400});
  const{error}=await supabase.from('challenge_scenarios').upsert(row,{onConflict:'key'});
  if(error)throw new Error(error.message);
  return NextResponse.json({saved:true});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('scenario_save_error',message);
  return NextResponse.json({error:'save_failed',detail:message},{status:500});
 }
}
