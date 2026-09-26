import{createSupabaseAdminClient}from'@/lib/supabase/server';
import{classify,type Failure}from'@/lib/ai/errors';

// Charged up front and settled afterwards. Slightly above the measured mean
// (~6,000 on gpt-oss-120b) so a heavier-than-average turn does not overdraw the
// bucket and make the next person's wait a lie.
export const ESTIMATED_TOKENS_PER_TURN=6500;

export type Claim={granted:boolean;ticketId:string|null;position:number;waitMs:number;available:number};

export async function claimTurn(sessionId:string|null,provider:string,estimated=ESTIMATED_TOKENS_PER_TURN):Promise<Claim>{
 const admin=createSupabaseAdminClient();
 // Without the service role there is no shared bucket to consult, and refusing
 // to run would be worse than running unthrottled.
 if(!admin)return{granted:true,ticketId:null,position:0,waitMs:0,available:0};
 const{data,error}=await admin.rpc('challenge_claim_turn',{p_session:sessionId,p_provider:provider,p_tokens:estimated});
 if(error||!data?.length)return{granted:true,ticketId:null,position:0,waitMs:0,available:0};
 const row=data[0] as any;
 return{granted:Boolean(row.granted),ticketId:row.ticket_id??null,
  position:Number(row.queue_position)||0,waitMs:Number(row.wait_ms)||0,available:Number(row.tokens_available)||0};
}

export async function settleTurn(ticketId:string|null,provider:string,estimated:number,actual:number){
 const admin=createSupabaseAdminClient();
 if(!admin||!ticketId)return;
 await admin.rpc('challenge_settle_turn',{p_ticket:ticketId,p_provider:provider,p_estimated:estimated,p_actual:actual});
}

// One row per distinct failure rather than one per occurrence: a broken key
// produces a failure on every turn of every student, and thirty copies of the
// same incident is noise, not information.
export async function recordIncident(params:{
 sessionId:string|null;provider:string;model:string;failure:Failure;kind:'blocking'|'retries_exhausted';attempts:number;
}){
 const admin=createSupabaseAdminClient();
 if(!admin)return;
 const{data:existing}=await admin.from('challenge_incidents')
  .select('id,occurrences').eq('provider',params.provider).eq('model',params.model)
  .eq('code',params.failure.code).is('resolved_at',null).limit(1).maybeSingle();
 if(existing){
  await admin.from('challenge_incidents')
   .update({occurrences:(existing.occurrences||1)+1,last_seen_at:new Date().toISOString(),session_id:params.sessionId})
   .eq('id',existing.id);
  return;
 }
 await admin.from('challenge_incidents').insert({
  session_id:params.sessionId,provider:params.provider,model:params.model,kind:params.kind,
  code:params.failure.code,message:params.failure.message.slice(0,600),attempts:params.attempts});
}

export{classify};
