import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';

export async function GET(request:Request){
 const{searchParams,origin}=new URL(request.url);
 const code=searchParams.get('code');
 const next=searchParams.get('next')||'/lab';
 const supabase=createSupabaseServerClient();
 if(code&&supabase){
  const{error}=await supabase.auth.exchangeCodeForSession(code);
  if(!error){
   let target=next.startsWith('/')?next:'/lab';
   // Only override the default landing: a link that explicitly asked for a
   // page still goes there.
   if(target==='/lab'){
    const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
    if(isInstructor)target='/admin';
   }
   return NextResponse.redirect(`${origin}${target}`);
  }
  console.error('auth_callback_error',error.message);
 }
 return NextResponse.redirect(`${origin}/login?error=callback`);
}
