-- O que o mundo diz por conta própria, e quando.
--
-- Gerada a partir de content/caso-juridico.json. Não edite à mão:
--   node scripts/gerar-migracao-caso.mjs
--
-- 'at' é minutos depois do início da sessão: 0 já está lá quando a pessoa
-- senta, e qualquer número maior chega durante a corrida. É isto que faz o
-- mundo procurar o participante em vez de só responder a ele.
--
-- Depende da 019, que cria a coluna. O bloco guardado existe para a ordem entre
-- as duas não importar quando alguém reaplica só esta.
do $do$
begin
 if exists(
  select 1 from information_schema.columns
   where table_schema='public' and table_name='challenge_scenarios' and column_name='events'
 ) then
  update public.challenge_scenarios set events='[{"id":"jur-mail-1","channel":"mail","sender":"Renato Tavares · Albuquerque & Tavares","characterId":"renato","subject":"Sobre o recurso do processo J.P.S. — esclarecimento","body":"Prezada Diretoria Jurídica, tivemos um incidente pontual no recurso do processo do sr. J.P.S. Um estagiário do nosso time utilizou ferramenta de inteligência artificial na pesquisa de precedentes sem seguir nossos procedimentos. O tribunal aplicou multa e oficiou a OAB. Entendemos que se trata de episódio isolado e já afastamos o profissional. Envio em anexo nossa carta com uma proposta de desconto para encerrarmos o tema. Sigo à disposição.","urgency":0.85,"visible":true,"at":0},{"id":"jur-chat-1","channel":"chat","sender":"Marta · Proteção de dados","characterId":"marta","body":"Vi a decisão. Antes de qualquer coisa: alguém sabe o que exatamente foi colado nessa ferramenta? Se foi o dossiê do processo, tinha atestado médico ali dentro.","urgency":0.75,"visible":true,"at":2},{"id":"jur-chat-2","channel":"chat","sender":"Helena · CEO","characterId":"helena","body":"Acabei de ver um post sobre isso circulando. Preciso de uma nota até o fim do dia dizendo que foi erro de um estagiário do escritório. Isso não pode virar assunto nosso.","urgency":0.9,"visible":true,"at":6},{"id":"jur-mail-2","channel":"mail","sender":"Daniel Rocha · RH","characterId":"daniel","subject":"Triagem de currículos — começo semana que vem","body":"Oi! Fechamos a ferramenta de triagem de currículos e queremos ligar na segunda. Outras transportadoras já usam. Preciso só de um ok seu para seguir — imagino que não tenha nada demais, é só leitura de currículo.","urgency":0.5,"visible":true,"at":12},{"id":"jur-call-1","channel":"call","sender":"Helena Braga · CEO","characterId":"helena","body":"A Helena está te ligando. O conselho pediu posição e ela quer a nota pública fechada agora.","urgency":0.9,"visible":true,"at":18},{"id":"jur-chat-3","channel":"chat","sender":"Lucas · Estagiário","characterId":"lucas","body":"Oi. Me falaram para procurar você. Eu ainda tenho o histórico da conversa na minha conta, posso exportar se precisar. Só queria entender se eu vou ser responsabilizado sozinho por isso.","urgency":0.7,"visible":true,"at":26},{"id":"jur-mail-3","channel":"mail","sender":"Renato Tavares · Albuquerque & Tavares","characterId":"renato","subject":"Ofício da OAB — proposta de resposta conjunta","body":"Prezada Diretoria, a Ordem pediu informações sobre o episódio. Sugiro uma resposta conjunta, alinhada entre escritório e empresa, atribuindo o ocorrido à conduta isolada do estagiário, que já foi afastado. Mantemos a proposta de desconto nos honorários do trimestre.","urgency":0.8,"visible":true,"at":34}]'::jsonb, updated_at=now()
   where key='juridico';
 end if;
end
$do$;
