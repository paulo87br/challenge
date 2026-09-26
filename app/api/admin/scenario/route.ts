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
   duration_minutes:Number(body.duration_minutes)||30,
   provider:String(body.provider||'openai'),model:String(body.model||''),
   characters:Array.isArray(body.characters)?body.characters:[],
   artifacts:Array.isArray(body.artifacts)?body.artifacts:[],
   knowledge:body.knowledge&&typeof body.knowledge==='object'?body.knowledge:{},
   competencies:Array.isArray(body.competencies)?body.competencies.filter((c:any)=>c?.code&&c?.name):[],
   updated_by:user.id,updated_at:new Date().toISOString()
  };
  if(!row.title||!row.seat_role)return NextResponse.json({error:'invalid',detail:'Título e assento são obrigatórios.'},{status:400});
  const{error}=await supabase.from('challenge_scenarios').upsert(row,{onConflict:'key'});
  if(!error)return NextResponse.json({saved:true});

  // Migrations 004 and 005 add the engine choice and the cast. Until they run,
  // saving the fields that do exist beats refusing the whole form -- and the
  // instructor is told exactly what was dropped rather than left guessing.
  const missing=/column .* does not exist|could not find the '.*' column/i.test(error.message);
  if(!missing)throw new Error(error.message);
  const{provider,model,characters,artifacts,knowledge,competencies,...base}=row;
  const retry=await supabase.from('challenge_scenarios').upsert(base,{onConflict:'key'});
  if(retry.error)throw new Error(retry.error.message);
  return NextResponse.json({saved:true,partial:true,
   detail:'Motor, personas e competências não foram salvos: rode as migrações pendentes no Supabase.'});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('scenario_save_error',message);
  return NextResponse.json({error:'save_failed',detail:message},{status:500});
 }
}
