-- O relógio da sessão vivia só no localStorage do navegador.
--
-- Enquanto cada pessoa tinha uma sessão e um navegador, isso passava. Com uma
-- corrida viva por mundo -- a 026 em diante -- alternar entre dois mundos
-- limparia o estado local, e voltar ao primeiro devolveria quarenta minutos
-- novos a quem já os gastou. O tempo decorrido é fato da sessão, não do
-- aparelho: pertence à linha.
--
-- Fica em milissegundos porque é o que o cliente já contava, e o pause continua
-- sendo do cliente: ele para de somar e sincroniza o valor parado.

alter table public.challenge_sessions
  add column if not exists elapsed_ms bigint not null default 0;
