// Supabase is optional while the database is still being set up. Every caller
// gets null instead of a throw, so the simulation keeps running unauthenticated
// until the environment is filled in.
export function supabaseEnv(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
 const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
 if(!url||!publishableKey)return null;
 return{url,publishableKey};
}

export function isSupabaseConfigured(){return supabaseEnv()!==null}
