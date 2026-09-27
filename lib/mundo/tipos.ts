/**
 * Fica fora de lib/supabase/sessions porque componentes de cliente precisam do
 * tipo, e aquele módulo carrega o cliente de servidor junto.
 */
export type MundoNoAr={key:string;title:string;domain:string;seat_role:string;mission:string;join_code:string|null};
