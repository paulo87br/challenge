import{createServerClient,type CookieOptions}from'@supabase/ssr';
import{NextResponse,type NextRequest}from'next/server';
import{supabaseEnv}from'./env';

type CookieToSet={name:string;value:string;options:CookieOptions};

const PUBLIC_PREFIXES=['/login','/auth'];

export async function updateSession(request:NextRequest){
 const env=supabaseEnv();
 // No Supabase yet: leave the app open so the simulation can be worked on.
 if(!env)return NextResponse.next({request});

 let response=NextResponse.next({request});
 const supabase=createServerClient(env.url,env.publishableKey,{
  cookies:{
   getAll(){return request.cookies.getAll()},
   setAll(cookiesToSet:CookieToSet[]){
    cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));
    response=NextResponse.next({request});
    cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));
   }
  }
 });

 // getUser revalidates the token with Supabase; getSession would trust the cookie.
 const{data:{user}}=await supabase.auth.getUser();
 const path=request.nextUrl.pathname;
 const isPublic=PUBLIC_PREFIXES.some(prefix=>path.startsWith(prefix));

 if(!user&&!isPublic){
  const target=request.nextUrl.clone();
  target.pathname='/login';
  target.searchParams.set('next',path);
  return NextResponse.redirect(target);
 }
 if(user&&path==='/login'){
  const target=request.nextUrl.clone();
  target.pathname='/lab';
  target.search='';
  return NextResponse.redirect(target);
 }
 return response;
}
