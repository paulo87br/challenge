# A cadeira do Jurídico

Cenário do Challenge: a pessoa ocupa a Diretoria Jurídica da **Nortes Logística S.A.**
(fictícia) diante de um recurso protocolado pelo escritório terceirizado com três
precedentes que não existem, gerados por IA. O escritório atribui o erro a um estagiário.

## Como editar o caso sem mexer em código

Todo o conteúdo está em **`content/caso-juridico.json`**: personagens, o que cada um
sabe, documentos, competências, imprensa e as mensagens iniciais. Edite o JSON e regenere
a migração:

```bash
node scripts/gerar-migracao-caso.mjs
```

Depois rode `supabase/migrations/015_caso_juridico.sql` no Supabase. A migração é
idempotente: rodar de novo atualiza o cenário em vez de duplicá-lo.

Para ajustes pontuais — clima, duração, uma persona, uma notícia — o **Studio** (`/admin`)
edita direto no banco, sem passar pelo arquivo. Use o JSON quando quiser que a mudança
fique versionada.

## O que está onde

| no JSON | no Studio | o que faz |
|---|---|---|
| `characters` | Pessoas | quem existe, e **o que cada um sabe** (`knownFacts`) |
| `knowledge.knowledgeCatalog` | — | o significado de cada fato; é o perímetro que impede o mundo de inventar |
| `artifacts` | Documentos | o que precisa ser **pedido** a alguém durante a história |
| `knowledge.documentContents` | — | o que já está em Arquivos desde o começo |
| `competencies` | Avaliação | o que o Observer pode rotular; nada fora desta lista vira evidência |
| `news` | Imprensa | o que o mundo está lendo |
| `events` | — | as mensagens que chegam antes da primeira ação |

## Princípios que o cenário preserva

- **Não existe resposta certa.** Nenhuma tela diz "correto" ou "errado", e o perfil não
  tem nota, nível nem comparação entre pessoas.
- **A IA não julga o mérito jurídico.** Os prompts do Director, do Observer e do debrief
  proíbem dizer que algo é legal ou ilegal.
- **Citação nunca é confirmada nem negada.** Os três prompts proíbem afirmar que uma lei,
  artigo, súmula ou precedente existe. Um personagem pode dizer que precisa conferir e
  apontar quem saberia — nunca funcionar como autoridade normativa.
  A competência `verificacao_de_fontes` é o que registra se a pessoa conferiu o que citou.
- **Tudo é fictício.** Nenhum nome real de pessoa, empresa, escritório, tribunal ou
  processo. Todo documento traz "CASO FICTÍCIO".

## [VERIFICAR — Paulo]

Cinco pontos onde o caso pediria referência normativa e o agente não escreveu nenhuma:

1. `Decisão do tribunal (trecho)` — a multa por litigância de má-fé
2. `Decisão do tribunal (trecho)` — o ofício à OAB
3. `Relação de titulares expostos` — enquadramento, prazos e obrigação de comunicar
4. Notícia *"Departamentos jurídicos passam a exigir cláusula…"* — enquadramento aplicável
5. Notícia *"Empresa é notificada após dados…"* — consequências e enquadramento

Substitua ou remova conforme a sua leitura. Nenhum deles é necessário para o caso
funcionar — eles existem para você decidir o que entra.

## O que este cenário NÃO é

A spec original descreve um laboratório de **rodadas com grupos**: até 5 grupos numa sala,
4 rodadas liberadas pelo professor, menu de no máximo 3 ações, variante determinística e
rubrica de 0 a 3. Isso é outro produto — no padrão dos labs Vite
(`deep-learning`, `transformer-classroom-prototype`), cujo inventário está em
`inventario.md`. Este cenário é **uma pessoa por sessão, mundo dinâmico, sem nota**.
O conteúdo do caso em `caso-juridico.json` é reaproveitável se o lab de rodadas for feito.
