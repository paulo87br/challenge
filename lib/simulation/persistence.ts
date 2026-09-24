import type{AssistantMessage,EvidenceSignal,UploadedFile,WorldState}from'./types';

// Local persistence is a stand-in for the Supabase session store, not a
// replacement: it is per browser, invisible to the instructor and not
// auditable. It exists so a refresh stops destroying the run while the
// database is still being set up. Swap the two functions for a Supabase
// implementation and the rest of the app does not change.
const KEY='challenge.session.v1';

export type StoredSession={world:WorldState;evidence:EvidenceSignal[];assistant:AssistantMessage[];uploads:UploadedFile[];savedAt:number};

export function loadSession():StoredSession|null{
 try{
  const raw=window.localStorage.getItem(KEY);
  if(!raw)return null;
  const parsed=JSON.parse(raw) as StoredSession;
  // A stored world from an older shape is worse than no world at all.
  if(!parsed?.world?.scenarioId||!Array.isArray(parsed.world.events))return null;
  return{world:parsed.world,evidence:Array.isArray(parsed.evidence)?parsed.evidence:[],assistant:Array.isArray(parsed.assistant)?parsed.assistant:[],uploads:Array.isArray(parsed.uploads)?parsed.uploads:[],savedAt:parsed.savedAt||0};
 }catch{return null}
}

export function saveSession(session:StoredSession){
 // Uploaded documents can be large and localStorage quota is small; the
 // session is worth more than any single attachment, so bodies are trimmed
 // before they can blow the quota and take the whole run with them.
 const uploads=session.uploads.slice(-10).map(file=>({...file,body:file.body.slice(0,60000)}));
 try{window.localStorage.setItem(KEY,JSON.stringify({...session,uploads}))}catch{}
}

export function clearSession(){
 try{window.localStorage.removeItem(KEY)}catch{}
}
