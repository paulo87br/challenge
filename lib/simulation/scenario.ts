import type{Character,Competency,NewsItem,Temperature,WorldState}from'./types';
import{initialWorld}from'./runtime';

// What the Studio can author today. Characters and their knowledge perimeter
// still live in code; this is the layer the instructor already expects to
// control, and it is the part the engine can consume without being rewritten.
export type ScenarioConfig={
 key:string;title:string;domain:string;seat_role:string;mission:string;
 world_description:string;temperature:Partial<Temperature>;duration_minutes:number;
 provider:string;model:string;
 // Authored in the Studio. Empty means "use the cast compiled into runtime.ts",
 // which is what every scenario did before personas became editable.
 characters:Character[];
 artifacts:Array<{name:string;ownerId:string;body:string;keywords:string[]}>;
 knowledge:Record<string,unknown>;
 // The instrument. The Observer may only label evidence with a code from here,
 // so signals from different turns land in the same bucket.
 competencies:Competency[];
 // A imprensa do mundo. Vazia significa que o cenário não tem notícia própria.
 news:NewsItem[];
 calls_enabled:boolean;
};

export const defaultScenario:ScenarioConfig={
 key:'atlas',title:initialWorld.title,domain:'AI Governance',seat_role:initialWorld.seat.role,
 mission:'conduza a decisão sobre a entrada do assistente de IA em produção.',
 world_description:'Empresa de médio porte preparando um assistente de IA generativa para produção. Existe pressão executiva, documentação incompleta e sinais de uso de dados reais no piloto.',
 temperature:initialWorld.temperature,duration_minutes:30,provider:'openai',model:'gpt-5.6',
 characters:[],artifacts:[],knowledge:{},calls_enabled:false,
 // Same reasoning as the press below: an empty framework makes the Observer
 // unable to label anything and the profile unable to aggregate, so a
 // scenario that has not been authored still gets a working instrument.
 competencies:[
 {
  "code": "busca_de_informacao",
  "name": "Busca de informação",
  "definition": "Procura ativamente o que falta antes de concluir: pergunta, checa fonte, vai atrás de quem sabe."
 },
 {
  "code": "validacao",
  "name": "Validação de evidência",
  "definition": "Distingue relato de verificação. Não aceita afirmação de terceiro como prova e busca o artefato ou a confirmação independente."
 },
 {
  "code": "priorizacao",
  "name": "Priorização",
  "definition": "Escolhe o que tratar primeiro sob pressão de tempo e mantém o foco no que decide o problema."
 },
 {
  "code": "raciocinio_sob_ambiguidade",
  "name": "Raciocínio sob ambiguidade",
  "definition": "Age com informação incompleta explicitando premissas e o que ainda não se sabe."
 },
 {
  "code": "uso_de_ia",
  "name": "Uso de IA",
  "definition": "Usa o assistente de IA disponível de forma proveitosa e crítica, sem delegar a ele o julgamento."
 },
 {
  "code": "decisao",
  "name": "Decisão e posicionamento",
  "definition": "Toma posição e a sustenta com o que foi apurado, incluindo decidir esperar."
 },
 {
  "code": "escalonamento",
  "name": "Escalonamento",
  "definition": "Reconhece o que está acima da própria alçada e envolve quem tem autoridade ou informação."
 },
 {
  "code": "comunicacao_sob_pressao",
  "name": "Comunicação sob pressão",
  "definition": "Ajusta a mensagem ao interlocutor sem perder a substância, inclusive ao discordar de quem tem mais poder."
 },
 {
  "code": "adaptacao",
  "name": "Adaptação",
  "definition": "Revê a própria linha de ação quando a informação muda."
 }
],
 // Fallback press, so a scenario that has not been authored yet -- or a
 // database without migration 011 -- still gives the participant a world with
 // something happening in it, instead of an empty feed.
 news:[
 {
  "id": "news-anpd",
  "source": "Portal RegTech",
  "at": 545,
  "tag": "Regulação",
  "headline": "ANPD abre consulta sobre uso de dados pessoais em treinamento de IA",
  "summary": "A autoridade quer ouvir empresas sobre bases legais para uso de dados de clientes em sistemas de IA generativa. Prazo de contribuição termina em 30 dias.",
  "article": "A Autoridade Nacional de Proteção de Dados abriu consulta pública sobre o uso de dados pessoais no treinamento e na operação de sistemas de inteligência artificial generativa.\n\nO documento em consulta trata especificamente de ambientes de teste e homologação, hoje um ponto cinzento: muitas empresas replicam bases de produção para validar modelos sem registrar essa etapa em seus inventários de tratamento.\n\n\"O ambiente de homologação não é um lugar fora da lei\", afirmou uma das técnicas envolvidas na redação. \"Se há dado pessoal real ali, há tratamento, e há responsabilidade.\"\n\nA consulta também pede subsídios sobre transferência internacional quando o fornecedor do modelo opera fora do país — cenário comum entre empresas que contratam APIs de terceiros.\n\nEspecialistas ouvidos avaliam que a orientação final deve exigir registro formal da avaliação de impacto antes da entrada em produção, e não depois."
 },
 {
  "id": "news-incidente",
  "source": "Tecnologia & Negócios",
  "at": 520,
  "tag": "Mercado",
  "headline": "Empresa do setor financeiro suspende assistente de IA após exposição de dados",
  "summary": "O sistema retornava trechos de atendimentos de outros clientes. A companhia afirma que o piloto havia sido aprovado internamente.",
  "article": "Uma instituição financeira de médio porte suspendeu nesta semana o assistente de IA que atendia seus canais digitais, depois que clientes relataram receber respostas contendo trechos de atendimentos de terceiros.\n\nSegundo a apuração interna, o conjunto de dados usado para ajustar o modelo continha transcrições completas de atendimento, incluindo campos que não haviam sido mapeados na avaliação inicial.\n\nA companhia informou que o piloto passou por aprovação interna e que os controles declarados pelo fornecedor foram considerados suficientes à época.\n\nO caso reacendeu a discussão sobre a diferença entre a segurança declarada por um fornecedor e a validação independente feita por quem responde pelo risco.\n\n\"Ninguém foi negligente de forma óbvia\", disse um consultor da área. \"O que faltou foi alguém perguntar qual recorte exato dos dados entrou, e ter a resposta por escrito.\""
 },
 {
  "id": "news-concorrente",
  "source": "Mercado Digital",
  "at": 492,
  "tag": "Concorrência",
  "headline": "Concorrente anuncia assistente de IA em produção e ações sobem",
  "summary": "O anúncio pressiona companhias do setor que ainda tratam seus projetos como piloto.",
  "article": "Um dos principais concorrentes do setor anunciou a entrada em produção de seu assistente de IA para atendimento, com previsão de cobertura total dos canais até o fim do trimestre.\n\nO mercado reagiu bem: as ações da companhia subiram no pregão seguinte ao anúncio.\n\nAnalistas apontam, porém, que o comunicado não detalha quais dados alimentam o sistema nem se houve avaliação independente de privacidade — informação que passou a ser cobrada por investidores institucionais.\n\nPara empresas que ainda tratam seus projetos como piloto, o anúncio cria uma pressão de calendário que nem sempre corresponde a uma pressão técnica."
 }
]
};

// A new world starts from the authored configuration. Existing sessions keep
// the world they were played in: editing a scenario must not rewrite history.
export{worldFor as worldFromScenario}from'./scenario-world';

export const TEMPERATURE_FIELDS:Array<{key:keyof Temperature;label:string;icon:string}>=[
 {key:'ambiguity',label:'Ambiguidade',icon:'🌫️'},
 {key:'timePressure',label:'Pressão de tempo',icon:'⏱️'},
 {key:'stakeholderConflict',label:'Conflito entre pessoas',icon:'⚡'},
 {key:'informationNoise',label:'Ruído de informação',icon:'📡'},
 {key:'technicalComplexity',label:'Complexidade técnica',icon:'🧩'},
 {key:'incidentSeverity',label:'Gravidade do incidente',icon:'🔥'}
];
