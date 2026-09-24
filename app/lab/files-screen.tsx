'use client';
import{useRef,useState}from'react';import{FileText,Upload}from'lucide-react';
import type{UploadedFile}from'@/lib/simulation/types';

export type FileItem={id:string;name:string;at:number;sender:string;body:string;uploaded?:boolean};

const READABLE=/\.(txt|md|markdown|csv|tsv|json|log|ya?ml|html?)$/i;
const MAX_BYTES=400*1024;

function timeOf(at:number){return `${String(Math.floor(at/60)%24).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`}

export function FilesScreen({files,selectedId,seen,onSelect,onUpload,minute}:{
 files:FileItem[];selectedId:string;seen:Record<string,boolean>;
 onSelect:(id:string)=>void;onUpload:(file:UploadedFile)=>void;minute:number;
}){
 const input=useRef<HTMLInputElement>(null);
 const[error,setError]=useState('');
 const opened=files.find(file=>file.id===selectedId)||files[0];

 async function handleFiles(list:FileList|null){
  if(!list?.length)return;
  setError('');
  for(const file of Array.from(list)){
   if(file.size>MAX_BYTES){setError(`"${file.name}" tem mais de 400 KB e não foi anexado.`);continue}
   // Only text-shaped documents can be read into the world; anything else is
   // registered so the participant can refer to it, without pretending the
   // simulation can see inside it.
   const readable=READABLE.test(file.name)||file.type.startsWith('text/');
   const body=readable?await file.text():`Arquivo anexado por você: ${file.name} (${file.type||'tipo desconhecido'}, ${Math.round(file.size/1024)} KB). O conteúdo deste formato não é legível dentro da simulação.`;
   onUpload({id:crypto.randomUUID(),name:file.name,sender:'Você',at:minute,body,kind:file.type||'desconhecido',size:file.size});
  }
  if(input.current)input.current.value='';
 }

 return <section className="files-shell">
  <div className="panel file-list">
   <div className="inbox-head"><h2>Arquivos</h2><span className="muted">{files.length} documentos</span></div>
   <div className="upload-row">
    <button className="btn" onClick={()=>input.current?.click()}><Upload size={16}/>Anexar documento</button>
    <input ref={input} type="file" multiple hidden onChange={event=>handleFiles(event.target.files)} aria-label="Anexar documento"/>
   </div>
   {error&&<div className="runtime-error">{error}</div>}
   {files.map(file=><button key={file.id} className={'mail-row '+(opened?.id===file.id?'selected ':'')+(!seen[file.id]&&!file.uploaded?'file-unread':'')} onClick={()=>onSelect(file.id)}>
    <div className="mail-row-top"><b><FileText size={16} style={{verticalAlign:'middle',marginRight:6}}/>{file.name}{!seen[file.id]&&!file.uploaded&&<span className="unread-dot"/>}</b><small>{timeOf(file.at)}</small></div>
    <span>{file.sender}{file.uploaded?' · anexado por você':''}</span>
   </button>)}
  </div>
  <section className="panel file-reader">{opened&&<>
   <div className="mail-title"><div><div className="eyebrow">{opened.uploaded?'SEU ANEXO':'DOCUMENTO'}</div><h2>{opened.name}</h2><div className="muted">Disponível às {timeOf(opened.at)} · {opened.sender}</div></div><FileText size={28}/></div>
   <div className="file-body"><p>{opened.body}</p></div>
  </>}</section>
 </section>;
}
