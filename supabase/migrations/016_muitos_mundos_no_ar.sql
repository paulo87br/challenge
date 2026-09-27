-- Mais de um mundo no ar ao mesmo tempo, e um código por mundo.
--
-- Até aqui exatamente um cenário podia estar ativo, e quem abria o /lab caía
-- nele. Uma turma por vez. Duas turmas em cenários diferentes na mesma semana
-- obrigavam a trocar o mundo no ar entre uma aula e outra, e quem entrasse na
-- hora errada entrava no mundo errado sem perceber.
--
-- O código é lido de um projetor e digitado num celular, então o alfabeto
-- deixa fora os glifos que se confundem à distância: O/0 e I/1. Mesmo
-- alfabeto e mesmo tamanho do Pulso, porque para a turma é o mesmo gesto.

alter table public.challenge_scenarios add column if not exists join_code text;

create or replace function public.challenge_new_join_code()
returns text language plpgsql as $fn$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  tentativa text;
  i int;
begin
  for _volta in 1..200 loop
    tentativa := '';
    for i in 1..4 loop
      tentativa := tentativa || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    if not exists(select 1 from public.challenge_scenarios where join_code = tentativa) then
      return tentativa;
    end if;
  end loop;
  -- 200 colisões seguidas em 1.048.576 combinações não acontece por acaso. Se
  -- acontecer, falhar alto é melhor que devolver um código já em uso.
  raise exception 'não foi possível gerar um código de acesso livre';
end $fn$;

-- Uma linha por statement, de propósito: dentro de um único UPDATE a função
-- enxergaria o snapshot do início e não veria os códigos que ela mesma acabou
-- de atribuir às linhas anteriores.
do $do$
declare alvo record;
begin
  for alvo in select key from public.challenge_scenarios where join_code is null loop
    update public.challenge_scenarios set join_code = public.challenge_new_join_code() where key = alvo.key;
  end loop;
end $do$;

alter table public.challenge_scenarios alter column join_code set default public.challenge_new_join_code();
alter table public.challenge_scenarios alter column join_code set not null;

create unique index if not exists challenge_scenarios_join_code
  on public.challenge_scenarios(join_code);

-- O índice que garantia exatamente um mundo no ar sai. Quantos estão no ar
-- passa a ser decisão do Studio, não do schema.
drop index if exists public.challenge_scenario_one_active;

create index if not exists challenge_scenarios_live
  on public.challenge_scenarios(active) where active and not is_template;

-- A invariante que os comentários da 014 já afirmavam, agora escrita: um
-- template é ponto de partida, nunca um mundo em que alguém está.
do $do$
begin
  if not exists(
    select 1 from pg_constraint
     where conname = 'challenge_scenarios_template_nunca_no_ar'
       and conrelid = 'public.challenge_scenarios'::regclass
  ) then
    alter table public.challenge_scenarios
      add constraint challenge_scenarios_template_nunca_no_ar check (not (active and is_template));
  end if;
end $do$;
