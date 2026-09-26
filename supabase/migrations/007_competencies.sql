-- The Observer invented a competency label every turn: "information_seeking"
-- in one and "Information Seeking" in the next, for the same behaviour. The
-- instructor panel groups by that string, so one competency became two groups
-- and nothing aggregated across a session. The taxonomy becomes scenario data
-- and the Observer has to choose from it.

alter table public.challenge_scenarios add column if not exists competencies jsonb not null default '[]';

-- Seeded from what the Observer was already producing, so the Atlas scenario
-- does not start with an empty instrument.
update public.challenge_scenarios
set competencies = '[
 {"code":"busca_de_informacao","name":"Busca de informação","definition":"Procura ativamente o que falta antes de concluir: pergunta, checa fonte, vai atrás de quem sabe."},
 {"code":"validacao","name":"Validação de evidência","definition":"Distingue relato de verificação. Não aceita afirmação de terceiro como prova e busca o artefato ou a confirmação independente."},
 {"code":"priorizacao","name":"Priorização","definition":"Escolhe o que tratar primeiro sob pressão de tempo e mantém o foco no que decide o problema."},
 {"code":"raciocinio_sob_ambiguidade","name":"Raciocínio sob ambiguidade","definition":"Age com informação incompleta explicitando premissas e o que ainda não se sabe."},
 {"code":"uso_de_ia","name":"Uso de IA","definition":"Usa o assistente de IA disponível de forma proveitosa e crítica, sem delegar a ele o julgamento."},
 {"code":"decisao","name":"Decisão e posicionamento","definition":"Toma posição e a sustenta com o que foi apurado, incluindo decidir esperar."},
 {"code":"escalonamento","name":"Escalonamento","definition":"Reconhece o que está acima da própria alçada e envolve quem tem autoridade ou informação."},
 {"code":"comunicacao_sob_pressao","name":"Comunicação sob pressão","definition":"Ajusta a mensagem ao interlocutor sem perder a substância, inclusive ao discordar de quem tem mais poder."},
 {"code":"adaptacao","name":"Adaptação","definition":"Revê a própria linha de ação quando a informação muda."}
]'::jsonb
where key = 'atlas' and (competencies is null or competencies = '[]'::jsonb);
