import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';import{defaultModel,isProvider}from'@/lib/ai/providers';

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
   key:String(body.key||'').trim()||'atlas',title:String(body.title||'').trim(),domain:String(body.domain||'').trim(),
   seat_role:String(body.seat_role||'').trim(),mission:String(body.mission||''),
   world_description:String(body.world_description||''),temperature:body.temperature||{},
   duration_minutes:Number(body.duration_minutes)||30,
   // Modelo vazio era gravado vazio e virava o primeiro da lista só na hora de
   // rodar -- uma escolha que ninguém fez, invisível até a conta chegar.
   provider:String(body.provider||'openai'),
   model:String(body.model||'').trim()||defaultModel(isProvider(body.provider)?body.provider:'openai'),
   characters:Array.isArray(body.characters)?body.characters:[],
   artifacts:Array.isArray(body.artifacts)?body.artifacts:[],
   knowledge:body.knowledge&&typeof body.knowledge==='object'?body.knowledge:{},
   competencies:Array.isArray(body.competencies)?body.competencies.filter((c:any)=>c?.code&&c?.name):[],
   news:Array.isArray(body.news)?body.news.filter((n:any)=>n?.id):[],
   // Só o que tem canal e texto: um acontecimento vazio salvo é um silêncio que
   // o instrutor acha que agendou.
   events:Array.isArray(body.events)
    ?body.events.filter((e:any)=>e?.id&&e?.channel&&String(e?.body||'').trim())
      .map((e:any)=>({...e,at:Math.max(0,Number(e.at)||0),urgency:Math.min(1,Math.max(0,Number(e.urgency)||0.6)),visible:e.visible!==false}))
    :[],
   // Voice always runs on OpenAI and reads OPENAI_API_KEY, which has nothing to
   // do with which provider drives the turns. Coupling them forced anyone who
   // wanted a call to move their whole engine off Groq.
   calls_enabled:Boolean(body.calls_enabled),
   call_minutes_per_call:Math.min(60,Math.max(1,Number(body.call_minutes_per_call)||5)),
   call_minutes_per_session:Math.min(240,Math.max(1,Number(body.call_minutes_per_session)||15)),
   call_voice:['marin','cedar'].includes(String(body.call_voice))?String(body.call_voice):'marin',
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
  const{provider,model,characters,artifacts,knowledge,competencies,news,calls_enabled,call_minutes_per_call,call_minutes_per_session,call_voice,...base}=row;
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
