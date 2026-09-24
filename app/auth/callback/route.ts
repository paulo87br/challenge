import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';

export async function GET(request:Request){
 const{searchParams,origin}=new URL(request.url);
 const code=searchParams.get('code');
 const next=searchParams.get('next')||'/lab';
 const supabase=createSupabaseServerClient();
 if(code&&supabase){
  const{error}=await supabase.auth.exchangeCodeForSession(code);
  if(!error)return NextResponse.redirect(`${origin}${next.startsWith('/')?next:'/lab'}`);
  console.error('auth_callback_error',error.message);
 }
 return NextResponse.redirect(`${origin}/login?error=callback`);
}
