import{createServerClient,type CookieOptions}from'@supabase/ssr';
import{NextResponse,type NextRequest}from'next/server';
import{supabaseEnv}from'./env';

type CookieToSet={name:string;value:string;options:CookieOptions};

const PUBLIC_PREFIXES=['/login','/auth'];
// The Studio authors the world and the panel holds other people's evidence.
// Being signed in is not enough for either; both are instructor ground.
const INSTRUCTOR_PREFIXES=['/admin','/painel'];

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
 if(user&&INSTRUCTOR_PREFIXES.some(prefix=>path.startsWith(prefix))){
  const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
  if(!isInstructor){
   // Sent back to their own workspace rather than shown a refusal: a
   // participant has no reason to learn that these routes exist.
   const target=request.nextUrl.clone();
   target.pathname='/lab';
   target.search='';
   return NextResponse.redirect(target);
  }
 }
 if(user&&path==='/login'){
  // An instructor signing in is going to work on the world, not to play in it.
  const{data:isInstructor}=await supabase.rpc('is_challenge_instructor');
  const target=request.nextUrl.clone();
  target.pathname=isInstructor?'/admin':'/lab';
  target.search='';
  return NextResponse.redirect(target);
 }
 return response;
}
