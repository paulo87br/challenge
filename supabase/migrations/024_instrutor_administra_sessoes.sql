-- O instrutor pode ler qualquer sessão desde a 001, mas só podia alterar a
-- dele: "update own session" exige user_id = auth.uid(), e delete não tinha
-- política nenhuma. Sem isto, qualquer botão de encerrar ou excluir no painel
-- voltaria como sucesso tendo mexido em zero linhas -- a falha silenciosa que
-- este projeto já pagou caro várias vezes.
--
-- A autoridade mora aqui, no banco, e não na rota: mesmo que a rota tivesse um
-- furo, um participante continua sem conseguir tocar na sessão de outro.
--
-- Excluir uma sessão leva junto telemetria, evidências, turnos, chamadas e
-- tíquetes de fila, todos com on delete cascade desde que foram criados. O
-- incidente é on delete set null: ele é sobre o motor, não sobre a pessoa, e
-- continua valendo depois que a sessão sai.

drop policy if exists "instructor updates any session" on public.challenge_sessions;
create policy "instructor updates any session" on public.challenge_sessions
  for update using(public.is_challenge_instructor())
  with check(public.is_challenge_instructor());

drop policy if exists "instructor deletes any session" on public.challenge_sessions;
create policy "instructor deletes any session" on public.challenge_sessions
  for delete using(public.is_challenge_instructor());

-- A política permite; o grant é o que deixa a instrução chegar na política.
grant delete on public.challenge_sessions to authenticated;
