import{NextResponse}from'next/server';import{ensureSession}from'@/lib/supabase/sessions';

export async function POST(){
 try{
  const session=await ensureSession();
  if(!session)return NextResponse.json({configured:false});
  return NextResponse.json({configured:true,session});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('session_error',message);
  return NextResponse.json({configured:false,error:message},{status:500});
 }
}
