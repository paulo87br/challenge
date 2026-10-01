-- O mundo passa a ter o que dizer antes de alguém falar com ele.
--
-- O caso jurídico foi escrito com três eventos de abertura -- o escritório
-- explicando o recurso, a encarregada perguntando o que foi colado na
-- ferramenta, a CEO exigindo uma nota. Nenhum deles chegava ao mundo: não havia
-- coluna para guardá-los, e worldFor zerava a lista de eventos para qualquer
-- cenário com elenco próprio.
--
-- O efeito disso num teste real foi o participante sentar numa caixa de entrada
-- vazia e nunca ser procurado por ninguém. Reagir ele reagia; ser acionado,
-- nunca. Um tabletop em que o mundo só responde não é um mundo, é um balcão.
--
-- 'at' é minutos depois do início da sessão, como na imprensa: 0 já está lá
-- quando a pessoa senta, e qualquer número maior chega durante a corrida.

alter table public.challenge_scenarios
  add column if not exists events jsonb not null default '[]'::jsonb;

comment on column public.challenge_scenarios.events is
  'Eventos autorados do cenário. at = minutos depois do início da sessão.';
