'use client';
import{createBrowserClient}from'@supabase/ssr';

// The config arrives as props from a server component, which is why no
// NEXT_PUBLIC_ variable is needed. The publishable key is public by design.
export function createSupabaseBrowserClient(url:string,publishableKey:string){
 if(!url||!publishableKey)return null;
 return createBrowserClient(url,publishableKey);
}
