import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';

const CAMPOS='key,title,domain,seat_role,mission,world_description,temperature,duration_minutes,provider,model,characters,artifacts,knowledge,competencies,news,calls_enabled,call_minutes_per_call,call_minutes_per_session,call_voice';

async function instrutor(){
 const supabase=createSupabaseServerClient();
 if(!supabase)return{erro:NextResponse.json({error:'supabase_not_configured'},{status:503})};
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return{erro:NextResponse.json({error:'unauthenticated'},{status:401})};
 const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
 if(!isInstructor)return{erro:NextResponse.json({error:'forbidden'},{status:403})};
 return{supabase,user};
}

// Derived from the title so the instructor never has to think about keys, and
// suffixed when taken so saving a second template with the same name does not
// silently overwrite the first.
async function chaveLivre(supabase:any,base:string){
 const raiz=base.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'cenario';
 const{data}=await supabase.from('challenge_scenarios').select('key').like('key',`${raiz}%`);
 const usadas=new Set((data||[]).map((row:any)=>row.key));
 if(!usadas.has(raiz))return raiz;
 for(let n=2;n<200;n++)if(!usadas.has(`${raiz}-${n}`))return `${raiz}-${n}`;
 return `${raiz}-${Date.now().toString(36)}`;
}

export async function GET(){
 const{supabase,erro}=await instrutor() as any;
 if(erro)return erro;
 const{data,error}=await supabase.from('challenge_scenarios')
  .select('key,title,domain,seat_role,is_template,active,created_from,created_at,updated_at')
  .order('is_template').order('created_at',{ascending:false});
 if(error)return NextResponse.json({error:'list_failed',detail:error.message},{status:500});
 return NextResponse.json({scenarios:data||[]});
}

export async function POST(req:Request){
 const{supabase,user,erro}=await instrutor() as any;
 if(erro)return erro;
 try{
  const{action,sourceKey,title}=await req.json();
  const{data:source}=await supabase.from('challenge_scenarios').select(CAMPOS).eq('key',sourceKey).maybeSingle();
  if(!source&&action!=='activate')return NextResponse.json({error:'source_not_found'},{status:404});

  if(action==='save_template'){
   const nome=String(title||'').trim()||`${source.title} (template)`;
   const{key,...resto}=source;
   const nova=await chaveLivre(supabase,nome);
   const{error}=await supabase.from('challenge_scenarios')
    .insert({...resto,key:nova,title:nome,is_template:true,active:false,created_from:sourceKey,updated_by:user.id});
   if(error)throw new Error(error.message);
   return NextResponse.json({saved:true,key:nova,title:nome});
  }

  if(action==='create_from'){
   const nome=String(title||'').trim()||`${source.title} (cópia)`;
   const{key,...resto}=source;
   const nova=await chaveLivre(supabase,nome);
   const{error}=await supabase.from('challenge_scenarios')
    .insert({...resto,key:nova,title:nome,is_template:false,active:false,created_from:sourceKey,updated_by:user.id});
   if(error)throw new Error(error.message);
   return NextResponse.json({created:true,key:nova,title:nome});
  }

  if(action==='activate'){
   // Deactivate first: the unique index allows exactly one live scenario, and
   // doing it in the other order fails on the constraint.
   await supabase.from('challenge_scenarios').update({active:false}).eq('active',true).eq('is_template',false);
   const{error}=await supabase.from('challenge_scenarios').update({active:true}).eq('key',sourceKey).eq('is_template',false);
   if(error)throw new Error(error.message);
   return NextResponse.json({activated:sourceKey});
  }

  if(action==='delete'){
   if(source.active)return NextResponse.json({error:'cannot_delete_active',
    detail:'Ative outro cenário antes de apagar este.'},{status:409});
   // Sessions keep their scenario_key, so an old run would lose the world it
   // was played in. Refuse rather than orphan somebody's history.
   const{count}=await supabase.from('challenge_sessions').select('id',{count:'exact',head:true}).eq('scenario_key',sourceKey);
   if(count)return NextResponse.json({error:'scenario_in_use',
    detail:`${count} sessão(ões) foram jogadas neste cenário. Apagá-lo deixaria essas sessões sem o mundo em que aconteceram.`},{status:409});
   const{error}=await supabase.from('challenge_scenarios').delete().eq('key',sourceKey);
   if(error)throw new Error(error.message);
   return NextResponse.json({deleted:sourceKey});
  }

  return NextResponse.json({error:'unknown_action'},{status:400});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  return NextResponse.json({error:'scenario_action_failed',detail:message},{status:500});
 }
}
