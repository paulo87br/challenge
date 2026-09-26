import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';

export async function POST(req:Request){
 try{
  const supabase=createSupabaseServerClient();
  if(!supabase)return NextResponse.json({error:'supabase_not_configured'},{status:503});
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'unauthenticated'},{status:401});
  const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
  if(!isInstructor)return NextResponse.json({error:'forbidden'},{status:403});
  const{id}=await req.json();
  if(!id)return NextResponse.json({error:'id_required'},{status:400});
  // Resolved, not deleted: what broke and for how long is part of the record of
  // a class, and the same code reopening later is information.
  const{error}=await supabase.from('challenge_incidents')
   .update({resolved_at:new Date().toISOString(),resolved_by:user.id}).eq('id',id);
  if(error)throw new Error(error.message);
  return NextResponse.json({resolved:true});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  return NextResponse.json({error:'resolve_failed',detail:message},{status:500});
 }
}
