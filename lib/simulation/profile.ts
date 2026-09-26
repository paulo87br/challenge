import type{Competency,CompetencyProfile,EvidenceSignal}from'./types';

// Aggregation, not judgement. Every number here says how much was observed and
// how sure the Observer was -- never how good the person is. A competency with
// no signals means the session did not exercise it, which is a fact about the
// run, not about the participant.
export function buildProfile(competencies:Competency[],signals:EvidenceSignal[]):CompetencyProfile[]{
 return competencies.map(competency=>{
  const mine=signals.filter(signal=>signal.competency===competency.code);
  const mean=(pick:(s:EvidenceSignal)=>number)=>mine.length?mine.reduce((sum,s)=>sum+(Number(pick(s))||0),0)/mine.length:0;
  return{
   code:competency.code,name:competency.name,definition:competency.definition,
   signals:mine.length,
   positive:mine.filter(s=>s.polarity==='positive').length,
   neutral:mine.filter(s=>s.polarity==='neutral').length,
   risk:mine.filter(s=>s.polarity==='risk').length,
   meanConfidence:mean(s=>s.confidence),
   meanStrength:mean(s=>s.strength),
   needsCorroboration:mine.filter(s=>s.corroboration_required).length,
   behaviors:mine.map(s=>s.behavior).filter(Boolean)
  };
 }).sort((a,b)=>b.signals-a.signals||a.name.localeCompare(b.name));
}

export function profileSummary(profile:CompetencyProfile[]){
 const touched=profile.filter(entry=>entry.signals>0);
 return{
  total:profile.length,touched:touched.length,untouched:profile.length-touched.length,
  signals:profile.reduce((sum,entry)=>sum+entry.signals,0),
  risks:profile.reduce((sum,entry)=>sum+entry.risk,0),
  needsCorroboration:profile.reduce((sum,entry)=>sum+entry.needsCorroboration,0)
 };
}
