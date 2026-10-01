-- De qual organização é este mundo.
--
-- O organograma precisa separar quem é de dentro de quem é de fora: no caso
-- jurídico, o sócio e o estagiário são de um escritório contratado, e pendurá-los
-- debaixo da CEO da transportadora afirma uma subordinação que não existe --
-- justamente a fronteira que o caso existe para discutir.
--
-- A convenção de "deixe a organização em branco para quem é de dentro" quebra
-- assim que alguém preenche todas, que é o natural de fazer. Sem um nome aqui,
-- o desenho elegia como casa a organização de quem aparecesse primeiro na lista.

alter table public.challenge_scenarios
  add column if not exists organization text;

update public.challenge_scenarios set organization = 'Nortes Logística'
 where key = 'juridico' and organization is null;

comment on column public.challenge_scenarios.organization is
  'A organização em que o participante se senta. Personagens sem org, ou com esta, são de dentro.';
