'use client';
import{useState}from'react';import{ArrowLeft,ExternalLink}from'lucide-react';
import type{NewsItem,WorldEvent}from'@/lib/simulation/types';

// The feed is the world's peripheral vision: things the participant did not ask
// for, that change what the decision means. Seeded items are in-world press;
// the Director adds more as the scenario moves.
const seededNews:NewsItem[]=[
 {id:'news-anpd',source:'Portal RegTech',at:9*60+5,tag:'Regulação',headline:'ANPD abre consulta sobre uso de dados pessoais em treinamento de IA',
  summary:'A autoridade quer ouvir empresas sobre bases legais para uso de dados de clientes em sistemas de IA generativa. Prazo de contribuição termina em 30 dias.',
  article:'A Autoridade Nacional de Proteção de Dados abriu consulta pública sobre o uso de dados pessoais no treinamento e na operação de sistemas de inteligência artificial generativa.\n\nO documento em consulta trata especificamente de ambientes de teste e homologação, hoje um ponto cinzento: muitas empresas replicam bases de produção para validar modelos sem registrar essa etapa em seus inventários de tratamento.\n\n"O ambiente de homologação não é um lugar fora da lei", afirmou uma das técnicas envolvidas na redação. "Se há dado pessoal real ali, há tratamento, e há responsabilidade."\n\nA consulta também pede subsídios sobre transferência internacional quando o fornecedor do modelo opera fora do país — cenário comum entre empresas que contratam APIs de terceiros.\n\nEspecialistas ouvidos avaliam que a orientação final deve exigir registro formal da avaliação de impacto antes da entrada em produção, e não depois.'},
 {id:'news-incidente',source:'Tecnologia & Negócios',at:8*60+40,tag:'Mercado',headline:'Empresa do setor financeiro suspende assistente de IA após exposição de dados',
  summary:'O sistema retornava trechos de atendimentos de outros clientes. A companhia afirma que o piloto havia sido aprovado internamente.',
  article:'Uma instituição financeira de médio porte suspendeu nesta semana o assistente de IA que atendia seus canais digitais, depois que clientes relataram receber respostas contendo trechos de atendimentos de terceiros.\n\nSegundo a apuração interna, o conjunto de dados usado para ajustar o modelo continha transcrições completas de atendimento, incluindo campos que não haviam sido mapeados na avaliação inicial.\n\nA companhia informou que o piloto passou por aprovação interna e que os controles declarados pelo fornecedor foram considerados suficientes à época.\n\nO caso reacendeu a discussão sobre a diferença entre a segurança declarada por um fornecedor e a validação independente feita por quem responde pelo risco.\n\n"Ninguém foi negligente de forma óbvia", disse um consultor da área. "O que faltou foi alguém perguntar qual recorte exato dos dados entrou, e ter a resposta por escrito."'},
 {id:'news-concorrente',source:'Mercado Digital',at:8*60+12,tag:'Concorrência',headline:'Concorrente anuncia assistente de IA em produção e ações sobem',
  summary:'O anúncio pressiona companhias do setor que ainda tratam seus projetos como piloto.',
  article:'Um dos principais concorrentes do setor anunciou a entrada em produção de seu assistente de IA para atendimento, com previsão de cobertura total dos canais até o fim do trimestre.\n\nO mercado reagiu bem: as ações da companhia subiram no pregão seguinte ao anúncio.\n\nAnalistas apontam, porém, que o comunicado não detalha quais dados alimentam o sistema nem se houve avaliação independente de privacidade — informação que passou a ser cobrada por investidores institucionais.\n\nPara empresas que ainda tratam seus projetos como piloto, o anúncio cria uma pressão de calendário que nem sempre corresponde a uma pressão técnica.'}
];

function timeOf(at:number){return `${String(Math.floor(at/60)%24).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`}

export function FeedScreen({liveFeed}:{liveFeed:WorldEvent[]}){
 const[openId,setOpenId]=useState('');
 // A Director feed event is already an article: its subject is the headline and
 // its body is the piece. Nothing is invented here that the world did not emit.
 const fromWorld:NewsItem[]=liveFeed.map(event=>{
  const body=String(event.body||'');
  return{id:event.id,source:String(event.sender||'Comunicação interna'),at:event.at,tag:'Interno',
   headline:event.subject||body.split(/[.!?]/)[0].slice(0,110)||'Atualização',
   summary:body.length>190?body.slice(0,190)+'…':body,article:body};
 });
 const news=[...fromWorld,...seededNews].sort((a,b)=>b.at-a.at);
 const open=news.find(item=>item.id===openId);

 if(open)return <section className="feed">
  <button className="btn" onClick={()=>setOpenId('')}><ArrowLeft size={16}/>Voltar ao feed</button>
  <article className="panel article">
   <div className="article-meta"><span className="tag">{open.tag||'Notícia'}</span><span className="muted">{open.source} · {timeOf(open.at)}</span></div>
   <h1 className="h1">{open.headline}</h1>
   {open.article.split('\n').filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}
  </article>
 </section>;

 return <section className="feed">
  <div className="feed-head"><div><div className="eyebrow">NOVA BANK · INTERNO E IMPRENSA</div><h2>Feed</h2></div><span className="tag">{news.length} publicações</span></div>
  {news.map(item=><article className="panel feed-card" key={item.id}>
   <div className="article-meta"><span className="tag">{item.tag||'Notícia'}</span><span className="muted">{item.source} · {timeOf(item.at)}</span></div>
   <h3 className="feed-headline">{item.headline}</h3>
   <p>{item.summary}</p>
   <button className="btn read-more" onClick={()=>setOpenId(item.id)}>Ler reportagem completa<ExternalLink size={15}/></button>
  </article>)}
 </section>;
}
