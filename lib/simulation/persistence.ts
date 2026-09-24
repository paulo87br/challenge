import type{EvidenceSignal,WorldState}from'./types';

// Local persistence is a stand-in for the Supabase session store, not a
// replacement: it is per browser, invisible to the instructor and not
// auditable. It exists so a refresh stops destroying the run while the
// database is still being set up. Swap the two functions for a Supabase
// implementation and the rest of the app does not change.
const KEY='challenge.session.v1';

export type StoredSession={world:WorldState;evidence:EvidenceSignal[];savedAt:number};

export function loadSession():StoredSession|null{
 try{
  const raw=window.localStorage.getItem(KEY);
  if(!raw)return null;
  const parsed=JSON.parse(raw) as StoredSession;
  // A stored world from an older shape is worse than no world at all.
  if(!parsed?.world?.scenarioId||!Array.isArray(parsed.world.events))return null;
  return{world:parsed.world,evidence:Array.isArray(parsed.evidence)?parsed.evidence:[],savedAt:parsed.savedAt||0};
 }catch{return null}
}

export function saveSession(session:StoredSession){
 try{window.localStorage.setItem(KEY,JSON.stringify(session))}catch{}
}

export function clearSession(){
 try{window.localStorage.removeItem(KEY)}catch{}
}
