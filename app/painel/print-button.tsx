'use client';
import{Printer,Download}from'lucide-react';

// Printing to PDF is what the browser already does well; a PDF library would
// be a dependency and a second rendering of the same page to keep in sync.
export function PrintButton({csv,filename}:{csv:string;filename:string}){
 function baixar(){
  // BOM so Excel opens accented names as UTF-8 instead of mojibake.
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=filename;link.click();
  URL.revokeObjectURL(url);
 }
 return <div className="print-actions">
  <button className="btn" onClick={baixar}><Download size={16}/>Baixar CSV</button>
  <button className="btn primary" onClick={()=>window.print()}><Printer size={16}/>Imprimir / PDF</button>
 </div>;
}
