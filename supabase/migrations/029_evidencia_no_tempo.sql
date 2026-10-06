-- Em que minuto do mundo cada sinal foi colhido.
--
-- A evidência só tinha o horário de gravação, que é relógio de parede. A
-- reprodução de uma sessão corre em tempo simulado, então não havia como
-- mostrar os sinais surgindo junto com o que os produziu -- e correlacionar por
-- proximidade de horário não serve: evidência e telemetria são gravadas em
-- paralelo, e foi exatamente esse pareamento por tempo que me fez concluir
-- errado, uma vez, que o Observer inventava 59% dos sinais.
--
-- Nulo para as linhas que já existem. A turma de 05/10 não tem como recuperar
-- isso, e preencher por aproximação seria inventar precisão que não houve.

alter table public.challenge_evidence
  add column if not exists simulated_minute int;

create index if not exists challenge_evidence_no_tempo
  on public.challenge_evidence(session_id,simulated_minute);
