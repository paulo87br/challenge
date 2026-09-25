// These names match the shared environment variables already configured on
// Vercel. There is deliberately no NEXT_PUBLIC_ prefix: the only browser-side
// use of Supabase is the login button, and the server hands it the publishable
// key as a prop instead. Renaming shared variables would reach other projects.
export function supabaseEnv(){
 const url=(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
 const publishableKey=(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)?.trim();
 if(!url||!publishableKey)return null;
 return{url,publishableKey};
}

export function isSupabaseConfigured(){return supabaseEnv()!==null}
