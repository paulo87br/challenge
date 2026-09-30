'use client';
import{PROVIDERS,defaultModel,type ProviderId}from'@/lib/ai/providers';

export function EnginePicker({provider,model,onChange,chaves}:{
 provider:ProviderId;model:string;onChange:(next:{provider:ProviderId;model:string})=>void;
 chaves?:Record<string,boolean>;
}){
 const config=PROVIDERS[provider]||PROVIDERS.openai;
 // Sem o mapa de chaves (banco ou build antigo) nada é afirmado: dizer "sem
 // chave" por falta de informação seria pior que não dizer nada.
 const sabe=Boolean(chaves&&Object.keys(chaves).length);
 const tem=(id:string)=>!sabe||chaves?.[id]!==false;
 const modeloEfetivo=model||defaultModel(provider);

 return <section className="panel">
  <div className="eyebrow">MOTOR</div>
  <h2>Qual modelo dirige este mundo</h2>
  <p className="muted">Director, personagens, Ara, Observer e debrief usam o mesmo modelo. Cada turno são de duas a cinco chamadas, então a escolha aqui é o que define o custo de uma sessão.</p>
  <div className="provider-row">{(Object.keys(PROVIDERS) as ProviderId[]).map(id=>
   <button key={id} className={'provider-chip '+(id===provider?'active ':'')+(tem(id)?'':'sem-chave')}
    title={tem(id)?undefined:`Sem ${PROVIDERS[id].keyEnv} neste ambiente`}
    onClick={()=>onChange({provider:id,model:defaultModel(id)})}>
    <span>{PROVIDERS[id].label}</span>
    {/* Elemento de verdade, não ::after: um marcador que só existe no CSS não
        é lido por leitor de tela nem aparece para quem for conferir. */}
    {!tem(id)&&<small className="chip-sem-chave">sem chave</small>}</button>)}</div>

  {sabe&&!tem(provider)
   ?<div className="runtime-error">Não há <code>{config.keyEnv}</code> neste ambiente. Escolher este provedor não falha aqui:
     falha no primeiro turno de quem estiver jogando, e vira um incidente. Configure a variável no ambiente ou escolha um provedor que já tenha chave.</div>
   :<p className="muted provider-note">{config.note} Chave lida de <code>{config.keyEnv}</code>
     {sabe&&<> · <b className="chave-ok">configurada</b></>}.</p>}

  <div className="field-grid">
   <label><span>Modelo</span>
    <select className="input" value={modeloEfetivo} onChange={e=>onChange({provider,model:e.target.value})}>
     {config.models.map(option=><option key={option.id} value={option.id}>{option.label}{option.note?` — ${option.note}`:''}</option>)}
    </select>
    {!model&&<small className="campo-dica">Este cenário não tem modelo gravado e cai em <b>{modeloEfetivo}</b>.
     Salvar o cenário fixa essa escolha.</small>}
   </label>
  </div>
 </section>;
}
