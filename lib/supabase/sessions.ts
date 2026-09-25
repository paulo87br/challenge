import{createSupabaseAdminClient,createSupabaseServerClient}from'./server';
import type{Debrief,EvidenceSignal,WorldState}from'@/lib/simulation/types';

export type SessionRow={id:string;world_state:WorldState|Record<string,never>;debrief:Debrief|null;status:string};

// Returns null whenever Supabase is not configured or nobody is signed in, so
// every caller degrades into the local-only mode the app already supports.
export async function ensureSession(scenarioKey='atlas'):Promise<SessionRow|null>{
 const supabase=createSupabaseServerClient();
 if(!supabase)return null;
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 const{data:existing}=await supabase.from('sessions')
  .select('id,world_state,debrief,status').eq('user_id',user.id).eq('status','active')
  .order('started_at',{ascending:false}).limit(1).maybeSingle();
 if(existing)return existing as SessionRow;
 const{data:created,error}=await supabase.from('sessions')
  .insert({user_id:user.id,scenario_key:scenarioKey}).select('id,world_state,debrief,status').single();
 if(error)throw new Error(error.message);
 return created as SessionRow;
}

export async function saveSessionState(sessionId:string,patch:{world?:WorldState;debrief?:Debrief|null;status?:string}){
 const supabase=createSupabaseServerClient();
 if(!supabase)return false;
 const update:Record<string,unknown>={updated_at:new Date().toISOString()};
 if(patch.world)update.world_state=patch.world;
 if(patch.debrief!==undefined)update.debrief=patch.debrief;
 if(patch.status){update.status=patch.status;if(patch.status==='completed')update.completed_at=new Date().toISOString()}
 const{error}=await supabase.from('sessions').update(update).eq('id',sessionId);
 if(error)throw new Error(error.message);
 return true;
}

// Evidence is written with the service role on purpose: the policies give the
// participant no insert on it, so the assessment record cannot be forged from
// the browser even by someone who reads the bundle.
export async function recordTurnRows(sessionId:string,action:any,signals:EvidenceSignal[],simulatedMinute?:number){
 const admin=createSupabaseAdminClient();
 if(!admin||!sessionId)return 'unavailable' as const;
 const telemetry=admin.from('telemetry').insert({
  session_id:sessionId,action:String(action?.action||'unknown'),channel:String(action?.channel||'unknown'),
  character_id:action?.characterId??null,body:action?.text??null,metadata:action?.metadata??{},simulated_minute:simulatedMinute??null});
 const evidence=signals.length?admin.from('evidence').insert(signals.map(signal=>({
  session_id:sessionId,competency:signal.competency,behavior:signal.behavior,evidence:signal.evidence,
  strength:Number(signal.strength)||0,confidence:Number(signal.confidence)||0,polarity:signal.polarity,
  corroboration_required:Boolean(signal.corroboration_required)}))):Promise.resolve({error:null});
 const[t,e]=await Promise.all([telemetry,evidence]);
 if((t as any).error||(e as any).error)return 'failed' as const;
 return 'saved' as const;
}
