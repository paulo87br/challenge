import{createClient}from'@supabase/supabase-js';

function env(name:'SUPABASE_URL'|'SUPABASE_PUBLISHABLE_KEY'){
 const value=process.env[name]?.trim();
 if(!value)throw new Error(`Missing ${name}`);
 return value;
}

export function createSupabaseServerClient(){
 return createClient(env('SUPABASE_URL'),env('SUPABASE_PUBLISHABLE_KEY'),{
  auth:{persistSession:false,autoRefreshToken:false}
 });
}
