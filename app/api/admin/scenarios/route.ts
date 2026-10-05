import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';

const CAMPOS='key,title,domain,seat_role,mission,world_description,temperature,duration_minutes,provider,model,characters,artifacts,knowledge,competencies,news,calls_enabled,call_minutes_per_call,call_minutes_per_session,call_voice';
// Os acontecimentos agendados (019) e a organização (022) nasceram depois desta
// lista e ficaram de fora dela. A cópia saía sem nada do que faz o mundo
// procurar a pessoa: nem a ligação da CEO no minuto 18, nem o estagiário no 26.
// Um mundo mudo, idêntico por fora. join_code fica de fora de propósito: a
// cópia precisa do código dela, e a coluna já tem default que o gera.
const CAMPOS_NOVOS=`${CAMPOS},events,organization`;

// O ambiente pode estar sem as migrações mais novas. Pedir e cair para a lista
// antiga é melhor que falhar -- mas o que se copia é dito, não suposto.
async function origem(supabase:any,sourceKey:string){
 const completo=await supabase.from('challenge_scenarios').select(CAMPOS_NOVOS).eq('key',sourceKey).maybeSingle();
 if(!completo.error)return{linha:completo.data,integral:true};
 const basico=await supabase.from('challenge_scenarios').select(CAMPOS).eq('key',sourceKey).maybeSingle();
 return{linha:basico.data,integral:false};
}

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
 const BASE='key,title,domain,seat_role,is_template,active,created_from,created_at,updated_at';
 const tentar=(campos:string)=>supabase.from('challenge_scenarios').select(campos)
  .order('is_template').order('created_at',{ascending:false});
 // Mesma degradação em degraus da tela do Studio: uma migração atrás não pode
 // virar 500.
 let r=await tentar(`${BASE},join_code,live_since,auto_off_at,idle_hours`);
 if(r.error)r=await tentar(`${BASE},join_code`);
 if(r.error)r=await tentar(BASE);
 if(r.error)return NextResponse.json({error:'list_failed',detail:r.error.message},{status:500});
 return NextResponse.json({scenarios:r.data||[]});
}

export async function POST(req:Request){
 const{supabase,user,erro}=await instrutor() as any;
 if(erro)return erro;
 try{
  const{action,sourceKey,title}=await req.json();
  const{linha:source,integral}=await origem(supabase,sourceKey);
  // Sem exceção por ação: antes 'activate' passava por aqui com a chave
  // inexistente e devolvia 200 sem ter feito nada, que é o tipo de silêncio que
  // este projeto já pagou caro três vezes.
  if(!source)return NextResponse.json({error:'source_not_found'},{status:404});

  if(action==='save_template'){
   const nome=String(title||'').trim()||`${source.title} (template)`;
   const{key,...resto}=source;
   const nova=await chaveLivre(supabase,nome);
   const{error}=await supabase.from('challenge_scenarios')
    .insert({...resto,key:nova,title:nome,is_template:true,active:false,created_from:sourceKey,updated_by:user.id});
   if(error)throw new Error(error.message);
   return NextResponse.json({saved:true,key:nova,title:nome,integral});
  }

  if(action==='create_from'){
   const nome=String(title||'').trim()||`${source.title} (cópia)`;
   const{key,...resto}=source;
   const nova=await chaveLivre(supabase,nome);
   const{error}=await supabase.from('challenge_scenarios')
    .insert({...resto,key:nova,title:nome,is_template:false,active:false,created_from:sourceKey,updated_by:user.id});
   if(error)throw new Error(error.message);
   return NextResponse.json({created:true,key:nova,title:nome,integral});
  }

  // Desde a 016 mais de um mundo pode estar no ar: colocar um não tira o outro.
  // Quantos ficam no ar é decisão de quem conduz, não do schema — duas turmas em
  // cenários diferentes na mesma semana era o caso que não cabia antes.
  if(action==='activate'){
   // live_since é a partir de quando a ociosidade conta. Um mundo que sobe e
   // não recebe ninguém precisa de um marco, senão não há de onde medir.
   const{error}=await supabase.from('challenge_scenarios')
    .update({active:true,live_since:new Date().toISOString(),auto_off_at:null})
    .eq('key',sourceKey).eq('is_template',false);
   if(error)throw new Error(error.message);
   return NextResponse.json({activated:sourceKey});
  }

  if(action==='janela'){
   const horas=Math.min(720,Math.max(1,Number(title)||24));
   const{error}=await supabase.from('challenge_scenarios').update({idle_hours:horas}).eq('key',sourceKey);
   if(error)throw new Error(error.message);
   return NextResponse.json({idle_hours:horas});
  }

  if(action==='deactivate'){
   // Sessões em andamento guardam o scenario_key: tirar do ar fecha a porta
   // para quem ainda não entrou, sem interromper quem está dentro.
   // auto_off_at zerado: saiu do ar porque alguém mandou, não por ociosidade,
   // e a tela precisa saber a diferença.
   const{error}=await supabase.from('challenge_scenarios').update({active:false,auto_off_at:null}).eq('key',sourceKey);
   if(error)throw new Error(error.message);
   return NextResponse.json({deactivated:sourceKey});
  }

  if(action==='delete'){
   if(source.active)return NextResponse.json({error:'cannot_delete_active',
    detail:'Tire este mundo do ar antes de apagá-lo.'},{status:409});
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
