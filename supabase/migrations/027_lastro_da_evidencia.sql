-- Quanto cada sinal se apoia no que a pessoa realmente escreveu.
--
-- Medido contra uma turma real de 1993 sinais: 91% citam a pessoa, 3%
-- parafraseiam e 7% não tocam nada do que ela escreveu. Esses 7% contavam igual
-- aos outros no relatório, e a confiança do Observer -- 0,85 ± 0,07 para todos
-- -- não os distinguia.
--
-- Classificar, não apagar. Um sinal legítimo sobre o que a pessoa NÃO fez não
-- tem como citá-la, e seria o primeiro a cair num corte automático. O relatório
-- usa o que tem lastro; o Studio mostra a proporção, que é uma medida da
-- qualidade do motor e não da pessoa.
--
-- 'nao_medido' é o padrão de propósito: as linhas que já existem não passaram
-- por esta medida, e dizer isso é mais honesto que carimbá-las de citadas.

alter table public.challenge_evidence
  add column if not exists support text not null default 'nao_medido';

alter table public.challenge_evidence drop constraint if exists challenge_evidence_support_check;
alter table public.challenge_evidence
  add constraint challenge_evidence_support_check
  check(support in('citado','parafraseado','sem_apoio','nao_medido'));

-- Quantas vezes a mesma ideia reapareceu antes de ser fundida. Um não é
-- repetição: é a primeira vez.
alter table public.challenge_evidence
  add column if not exists repeated int not null default 1;

create index if not exists challenge_evidence_support
  on public.challenge_evidence(session_id,support);
