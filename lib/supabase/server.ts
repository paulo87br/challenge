import{createServerClient,type CookieOptions}from'@supabase/ssr';
import{createClient}from'@supabase/supabase-js';
import{cookies}from'next/headers';
import{supabaseEnv}from'./env';

type CookieToSet={name:string;value:string;options:CookieOptions};

export function createSupabaseServerClient(){
 const env=supabaseEnv();
 if(!env)return null;
 const store=cookies();
 return createServerClient(env.url,env.publishableKey,{
  cookies:{
   getAll(){return store.getAll()},
   setAll(cookiesToSet:CookieToSet[]){
    // Server Components get a read-only cookie store. The middleware already
    // refreshed the session, so losing the write here is harmless.
    try{cookiesToSet.forEach(({name,value,options})=>store.set(name,value,options))}catch{}
   }
  }
 });
}

// Bypasses RLS. Only for writes the participant must not be able to forge,
// such as the Observer's evidence. Never expose this to the browser.
export function createSupabaseAdminClient(){
 const env=supabaseEnv();
 const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!env||!serviceRoleKey)return null;
 return createClient(env.url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
}

export async function getCurrentUser(){
 const supabase=createSupabaseServerClient();
 if(!supabase)return null;
 const{data:{user}}=await supabase.auth.getUser();
 return user;
}
