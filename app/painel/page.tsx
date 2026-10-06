import{UsuarioSessao}from'@/app/ui/usuario-sessao';import{NavInstrutor}from'@/app/ui/nav-instrutor';import{nomeDoUsuario}from'@/lib/mundo/usuario';
import{createSupabaseAdminClient,createSupabaseServerClient}from'@/lib/supabase/server';
import{expirarOciosos}from'@/lib/supabase/sessions';import{quando}from'@/lib/mundo/quando';import{todasAsLinhas}from'@/lib/supabase/paginar';import{ListaDeSessoes}from'./lista-de-sessoes';
import{NoAccess}from'./no-access';

export const dynamic='force-dynamic';
export const metadata={title:'Painel · Challenge'};

export default async function Painel(){
 const supabase=createSupabaseServerClient();
 if(!supabase)return <NoAccess reason="Supabase não está configurado neste ambiente."/>;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return <NoAccess reason="Entre com a sua conta para continuar."/>;
 const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
 if(!isInstructor)return <NoAccess reason="Sua conta não está na lista de instrutores deste Challenge."/>;

 // O instrutor olhando a lista é um dos dois momentos em que a expiração
 // precisa valer: o outro é alguém tentando entrar. Varrer antes de ler evita
 // mostrar como aberta uma sessão que o próprio servidor já considera vencida.
 await expirarOciosos();
 // Emails live in auth.users, which RLS never exposes. Only an instructor
 // reaches this line, and only the addresses of people in these sessions.
 const admin=createSupabaseAdminClient();
 // As quatro buscas não dependem umas das outras. Em série eram quatro idas e
 // voltas ao Supabase somadas: a tela levava quase três segundos para voltar
 // depois de encerrar uma sessão, e nesse tempo ela parecia não ter feito nada.
 // Evidência e telemetria vão paginadas: o PostgREST corta em mil linhas sem
 // avisar, e uma única turma já passou disso -- as contagens desta tela
 // apareciam menores do que são, sem erro em lugar nenhum.
 const[{data:sessions},ev,tl,contas]=await Promise.all([
  supabase.from('challenge_sessions')
   .select('id,user_id,scenario_key,status,started_at,updated_at,world_state,debrief')
   .order('updated_at',{ascending:false}).limit(100),
  todasAsLinhas<any>(()=>supabase.from('challenge_evidence').select('session_id,competency,polarity').order('id')),
  todasAsLinhas<any>(()=>supabase.from('challenge_telemetry').select('session_id').order('id')),
  admin?admin.auth.admin.listUsers({perPage:200}):Promise.resolve({data:null})]);
 const evidence=ev.linhas,telemetry=tl.linhas,parcial=!ev.completo||!tl.completo;
 const emails=new Map<string,string>();
 for(const person of(contas as any)?.data?.users||[])emails.set(person.id,person.email||person.id);
 const countBy=(rows:any[]|null,id:string)=>(rows||[]).filter(row=>row.session_id===id).length;

 return <main className="painel painel-largo">
  <header className="painel-head">
   <div><div className="eyebrow">CHALLENGE · INSTRUTOR</div><h1 className="h1">Sessões</h1>
   <p className="muted">Cada linha é o Challenge de uma pessoa. A evidência é observação, não nota: leia junto com o que a pessoa realmente fez.</p></div>
   <div className="painel-head-acoes"><NavInstrutor atual="/painel"/>
    <span className="tag">{sessions?.length||0} sessões</span>
    <UsuarioSessao nome={nomeDoUsuario(user)} email={String(user.email||'')} compacto/></div>
  </header>
  {parcial&&<div className="panel barra-recado erro"><span>A leitura do banco não veio inteira: as contagens abaixo estão por baixo. Recarregue a página.</span></div>}
  {!sessions?.length&&<div className="panel"><p className="muted">Nenhuma sessão registrada ainda.</p></div>}
  {!!sessions?.length&&<ListaDeSessoes linhas={(sessions||[]).map(session=>{
   const world=session.world_state as any;
   return{
    id:session.id,
    pessoa:emails.get(session.user_id)||session.user_id,
    mundo:world?.title||session.scenario_key,
    // A data é formatada aqui: no cliente, o fuso do navegador produziria um
    // texto diferente do servidor e o React reclamaria da hidratação. O fuso é
    // dito, não herdado: a Vercel roda em UTC, então a mesma linha que aqui
    // marcava 03:19 aparecia como 06:19 em produção -- três horas de mentira
    // para quem lê a que horas a pessoa agiu.
    atualizado:quando(session.updated_at),
    acoes:countBy(telemetry,session.id),
    evidencias:countBy(evidence,session.id),
    riscos:(evidence||[]).filter(row=>row.session_id===session.id&&row.polarity==='risk').length,
    status:String(session.status||''),
    temDebrief:Boolean(session.debrief)};
  })}/>}
 </main>;
}
