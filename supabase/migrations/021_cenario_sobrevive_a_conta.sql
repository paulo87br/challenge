-- Um cenário sobrevive à conta de quem o salvou.
--
-- challenge_scenarios.updated_by aponta para auth.users sem regra de exclusão,
-- o que no Postgres é NO ACTION: apagar a conta é recusado enquanto houver um
-- cenário carimbado com ela. Na prática, qualquer instrutor que tenha salvo um
-- mundo uma vez vira indeletável, e o erro só aparece na hora de apagar --
-- "violates foreign key constraint", vindo de uma tabela que nada tem a ver com
-- o que a pessoa pensava estar fazendo.
--
-- O carimbo é informação sobre o cenário, não uma dependência dele. Quando a
-- conta vai embora, o mundo fica e o carimbo esvazia.

alter table public.challenge_scenarios
  drop constraint if exists challenge_scenarios_updated_by_fkey;

alter table public.challenge_scenarios
  add constraint challenge_scenarios_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;
