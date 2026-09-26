import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';

export async function POST(req:Request){
 try{
  const supabase=createSupabaseServerClient();
  if(!supabase)return NextResponse.json({error:'supabase_not_configured'},{status:503});
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'unauthenticated'},{status:401});
  const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
  if(!isInstructor)return NextResponse.json({error:'forbidden'},{status:403});
  const{limits}=await req.json();
  if(!Array.isArray(limits))return NextResponse.json({error:'limits_required'},{status:400});
  const rows=limits.filter((row:any)=>row?.provider).map((row:any)=>({
   provider:String(row.provider),
   // A zero token allowance would stop every turn forever, which is never what
   // somebody means by editing this.
   tokens_per_minute:Math.max(1,Number(row.tokens_per_minute)||1),
   requests_per_minute:Math.max(1,Number(row.requests_per_minute)||1),
   max_concurrent:Math.max(0,Number(row.max_concurrent)||0),
   updated_at:new Date().toISOString()}));
  const{error}=await supabase.from('challenge_rate_limits').upsert(rows,{onConflict:'provider'});
  if(error)throw new Error(error.message);
  return NextResponse.json({saved:rows.length});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  return NextResponse.json({error:'save_failed',detail:message},{status:500});
 }
}
