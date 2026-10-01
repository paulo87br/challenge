import type{AssistantMessage,Debrief,EvidenceSignal,UploadedFile,WorldState}from'./types';

// Local persistence is a stand-in for the Supabase session store, not a
// replacement: it is per browser, invisible to the instructor and not
// auditable. It exists so a refresh stops destroying the run while the
// database is still being set up. Swap the two functions for a Supabase
// implementation and the rest of the app does not change.
const KEY='challenge.session.v1';

export type StoredSession={world:WorldState;evidence:EvidenceSignal[];assistant:AssistantMessage[];uploads:UploadedFile[];debrief:Debrief|null;elapsedMs:number;paused:boolean;savedAt:number;
 // De qual sessão é o que está guardado aqui. Sem isso, entrar em outro mundo
 // faz o navegador servir a corrida anterior por cima da sessão nova: o
 // conteúdo de um mundo rodando contra a sessão de outro, sem aviso.
 sessionId?:string;
 // Quais e-mails já foram abertos. Fica no navegador porque é leitura, não ação.
 seenMails?:Record<string,boolean>};

export function loadSession():StoredSession|null{
 try{
  const raw=window.localStorage.getItem(KEY);
  if(!raw)return null;
  const parsed=JSON.parse(raw) as StoredSession;
  // A stored world from an older shape is worse than no world at all.
  if(!parsed?.world?.scenarioId||!Array.isArray(parsed.world.events))return null;
  return{sessionId:parsed.sessionId||'',seenMails:parsed.seenMails||{},world:parsed.world,evidence:Array.isArray(parsed.evidence)?parsed.evidence:[],assistant:Array.isArray(parsed.assistant)?parsed.assistant:[],uploads:Array.isArray(parsed.uploads)?parsed.uploads:[],debrief:parsed.debrief||null,elapsedMs:Number(parsed.elapsedMs)||0,paused:Boolean(parsed.paused),savedAt:parsed.savedAt||0};
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
