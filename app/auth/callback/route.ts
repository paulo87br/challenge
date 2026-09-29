import{NextResponse}from'next/server';import{createSupabaseServerClient}from'@/lib/supabase/server';

/**
 * A volta do provedor. Três coisas podem chegar aqui: um código para trocar por
 * sessão, um erro que o Supabase anexa à URL, ou nada.
 *
 * Antes os três caminhos terminavam no mesmo `?error=callback`, e o motivo real
 * ficava só no log do servidor — que é o lugar onde nem quem está tentando
 * entrar nem quem conduz a aula vai olhar.
 */
export async function GET(request:Request){
 const{searchParams,origin}=new URL(request.url);
 const code=searchParams.get('code');
 const next=searchParams.get('next')||'/lab';

 const falha=(motivo:string,detalhe?:string)=>{
  console.error('auth_callback_error',JSON.stringify({motivo,detalhe:detalhe||null}));
  const volta=new URL('/login',origin);
  volta.searchParams.set('erro',motivo);
  if(detalhe)volta.searchParams.set('detalhe',detalhe.slice(0,220));
  if(next.startsWith('/'))volta.searchParams.set('next',next);
  return NextResponse.redirect(volta);
 };

 // O Supabase anexa o erro à query quando a autenticação foi recusada do lado
 // dele: conta que o projeto não aceita criar, endereço fora da lista, estado
 // vencido. Ler isso é a diferença entre um motivo e um "tente de novo".
 const erroProvedor=searchParams.get('error_code')||searchParams.get('error');
 if(erroProvedor)return falha(erroProvedor,searchParams.get('error_description')||undefined);

 const supabase=createSupabaseServerClient();
 if(!supabase)return falha('sem_supabase','Supabase não está configurado neste ambiente.');
 if(!code)return falha('sem_codigo');

 const{error}=await supabase.auth.exchangeCodeForSession(code);
 if(error)return falha((error as any).code||'troca_falhou',error.message);

 let target=next.startsWith('/')?next:'/lab';
 // Only override the default landing: a link that explicitly asked for a
 // page still goes there.
 if(target==='/lab'){
  const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
  if(isInstructor)target='/admin';
 }
 return NextResponse.redirect(`${origin}${target}`);
}
