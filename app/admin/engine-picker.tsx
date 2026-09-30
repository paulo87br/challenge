'use client';
import{PROVIDERS,defaultModel,type ProviderId}from'@/lib/ai/providers';

type Estado={estado:string;tamanho:number};

const DIZERES:Record<string,(nome:string,tamanho:number)=>string>={
 ok:(nome,tamanho)=>`Chave lida de ${nome} · configurada, ${tamanho} caracteres`,
 vazia:nome=>`A variável ${nome} existe neste ambiente, mas está vazia`,
 ausente:nome=>`Não há ${nome} neste ambiente`,
};

export function EnginePicker({provider,model,onChange,chaves,chaveDeVoz}:{
 provider:ProviderId;model:string;onChange:(next:{provider:ProviderId;model:string})=>void;
 chaves?:Record<string,Estado>;chaveDeVoz?:Estado;
}){
 const config=PROVIDERS[provider]||PROVIDERS.openai;
 // Sem o mapa (build antigo) nada é afirmado: dizer "sem chave" por falta de
 // informação seria pior que não dizer nada.
 const sabe=Boolean(chaves&&Object.keys(chaves).length);
 const estadoDe=(id:string)=>chaves?.[id]?.estado||'ok';
 const ok=(id:string)=>!sabe||estadoDe(id)==='ok';
 const atual=chaves?.[provider];
 const modeloEfetivo=model||defaultModel(provider);

 return <section className="panel">
  <div className="eyebrow">MOTOR</div>
  <h2>Qual modelo dirige este mundo</h2>
  <p className="muted">Director, personagens, Ara, Observer e debrief usam o mesmo modelo. Cada turno são de duas a cinco chamadas, então a escolha aqui é o que define o custo de uma sessão.</p>

  <div className="provider-row">{(Object.keys(PROVIDERS) as ProviderId[]).map(id=>
   <button key={id} className={'provider-chip '+(id===provider?'active ':'')+(ok(id)?'':'sem-chave')}
    title={ok(id)?undefined:DIZERES[estadoDe(id)]?.(PROVIDERS[id].keyEnv,0)}
    onClick={()=>onChange({provider:id,model:defaultModel(id)})}>
    <span>{PROVIDERS[id].label}</span>
    {/* Elemento de verdade, não ::after: um marcador que só existe no CSS não
        é lido por leitor de tela nem aparece para quem for conferir. */}
    {!ok(id)&&<small className="chip-sem-chave">{estadoDe(id)==='vazia'?'chave vazia':'sem chave'}</small>}</button>)}</div>

  {sabe&&!ok(provider)
   ?<div className="runtime-error">
     {DIZERES[estadoDe(provider)]?.(config.keyEnv,atual?.tamanho||0)}.{' '}
     {estadoDe(provider)==='vazia'
      ? <>A variável está definida e o valor não chegou — colagem em branco, ou salva e nunca preenchida. Corrija o valor e faça um novo deploy.</>
      : <>Confira se ela está no projeto certo, no ambiente certo, e se houve deploy depois de criá-la.</>}{' '}
     Escolher este provedor não falha aqui: falha no primeiro turno de quem estiver jogando, e vira um incidente.</div>
   :<p className="muted provider-note">{config.note}{' '}
     {sabe&&atual
      ? <>{DIZERES.ok(config.keyEnv,atual.tamanho)}.</>
      : <>Chave lida de <code>{config.keyEnv}</code>.</>}</p>}

  {sabe&&chaveDeVoz&&chaveDeVoz.estado!=='ok'&&
   <p className="muted provider-note">A voz roda sempre na OpenAI e lê <code>OPENAI_API_KEY</code>,
    que aqui está <b>{chaveDeVoz.estado==='vazia'?'vazia':'ausente'}</b>. Enquanto isso, as chamadas não funcionam
    mesmo que os turnos rodem em outro provedor.</p>}

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
