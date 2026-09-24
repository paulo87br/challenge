import type{EngineLog,ObserverResult,TurnDiagnostic}from'@/lib/simulation/types';

// Local turn history. The schema deliberately mirrors what will live in
// Supabase so replication is a straight column-for-column mapping: one row per
// turn, with its engine logs, the events it produced and the evidence the
// Observer extracted. It is best effort -- a serverless filesystem is read-only
// and a failure here must never cost the participant their turn.

type Db={exec(sql:string):void;prepare(sql:string):{run(...args:unknown[]):unknown}};

let db:Db|null=null;
let unavailable=false;

const SCHEMA=`
create table if not exists turns(
  request_id text primary key,
  created_at text not null,
  duration_ms integer,
  severity text,
  headline text,
  summary text,
  model text,
  action_channel text,
  action_name text,
  character_id text,
  action_text text
);
create table if not exists engine_logs(
  id integer primary key autoincrement,
  request_id text not null,
  at integer,
  stage text,
  status text,
  message text,
  meta text
);
create table if not exists turn_events(
  id integer primary key autoincrement,
  request_id text not null,
  channel text,
  sender text,
  character_id text,
  recipient_character_id text,
  visible integer,
  delay_minutes integer,
  subject text,
  body text
);
create table if not exists turn_evidence(
  id integer primary key autoincrement,
  request_id text not null,
  competency text,
  behavior text,
  evidence text,
  strength real,
  confidence real,
  polarity text,
  corroboration_required integer
);
create index if not exists engine_logs_by_turn on engine_logs(request_id);
create index if not exists turn_events_by_turn on turn_events(request_id);
create index if not exists turn_evidence_by_turn on turn_evidence(request_id);
`;

async function open():Promise<Db|null>{
 if(db)return db;
 if(unavailable)return null;
 try{
  const{DatabaseSync}=await import('node:sqlite');
  const{mkdirSync}=await import('node:fs');
  const path=process.env.CHALLENGE_DB_PATH?.trim()||'.data/challenge.db';
  const dir=path.slice(0,path.lastIndexOf('/'));
  if(dir)mkdirSync(dir,{recursive:true});
  const opened=new DatabaseSync(path) as unknown as Db;
  opened.exec(SCHEMA);
  db=opened;
  return db;
 }catch{
  unavailable=true;
  return null;
 }
}

export type TurnRecord={
 requestId:string;
 durationMs:number;
 model:string;
 action:{channel?:string;action?:string;characterId?:string;text?:string};
 diagnostic:TurnDiagnostic;
 logs:EngineLog[];
 events:Array<Record<string,unknown>>;
 observer:ObserverResult|null;
};

export async function recordTurn(turn:TurnRecord):Promise<'saved'|'unavailable'|'failed'>{
 const database=await open();
 if(!database)return 'unavailable';
 try{
  database.prepare(`insert or replace into turns(request_id,created_at,duration_ms,severity,headline,summary,model,action_channel,action_name,character_id,action_text)
   values(?,?,?,?,?,?,?,?,?,?,?)`).run(
   turn.requestId,new Date().toISOString(),turn.durationMs,
   turn.diagnostic?.severity??null,turn.diagnostic?.headline??null,turn.diagnostic?.summary??null,
   turn.model,turn.action?.channel??null,turn.action?.action??null,turn.action?.characterId??null,turn.action?.text??null);

  const logStatement=database.prepare('insert into engine_logs(request_id,at,stage,status,message,meta) values(?,?,?,?,?,?)');
  for(const entry of turn.logs||[])logStatement.run(turn.requestId,entry.at,entry.stage,entry.status,entry.message,entry.meta?JSON.stringify(entry.meta):null);

  const eventStatement=database.prepare('insert into turn_events(request_id,channel,sender,character_id,recipient_character_id,visible,delay_minutes,subject,body) values(?,?,?,?,?,?,?,?,?)');
  for(const event of turn.events||[])eventStatement.run(turn.requestId,
   String(event.channel??''),String(event.sender??''),
   event.characterId?String(event.characterId):null,event.recipientCharacterId?String(event.recipientCharacterId):null,
   event.visible===false?0:1,Number(event.delay_minutes)||0,
   event.subject?String(event.subject):null,String(event.body??''));

  const evidenceStatement=database.prepare('insert into turn_evidence(request_id,competency,behavior,evidence,strength,confidence,polarity,corroboration_required) values(?,?,?,?,?,?,?,?)');
  for(const signal of turn.observer?.signals||[])evidenceStatement.run(turn.requestId,
   signal.competency,signal.behavior,signal.evidence,
   Number(signal.strength)||0,Number(signal.confidence)||0,signal.polarity,signal.corroboration_required?1:0);

  return 'saved';
 }catch{
  return 'failed';
 }
}
