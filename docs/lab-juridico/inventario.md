# Inventário dos labs existentes

Levantado em 27/09/2026, antes de escrever qualquer código, como pede a seção 2 da spec.

## Os labs da família "Paulo Nascimento · Laboratório"

| repo | stack | telas | realtime |
|---|---|---|---|
| `neural-network-classroom` | Vite 7 + React 19 + Supabase | `HomePage`, `TeacherPage`, `DisplayPage`, `InputPage` | canal Supabase com `broadcast` + `presence` |
| `transformer-classroom-prototype` | Vite 7 + React 19 + Supabase | `TeacherPage`, `LabApp`, `AuthGate` | idem |
| `deep-learning` | Vite 7 + React 19 + Supabase | `TeacherPage`, `LabApp`, `AuthGate` | idem |
| `pulso` | Next 16 + React 19 + Supabase + Tailwind 4 | app router | Supabase |

O padrão dos três labs Vite é o mesmo: uma página do professor, uma tela de projeção,
uma tela de entrada do participante, e um `AuthGate` + `BrandSignature`/`Brand` comuns.
A sincronização é por `broadcast` num canal Supabase, com `presence` para saber quem está na sala.

## Chamada a LLM pelo servidor

**Existe.** `transformer-classroom-prototype/api/generate.ts`:

- função serverless, `POST` apenas
- exige `Authorization: Bearer <token do Supabase>`, valida com `supabase.auth.getUser(token)`
- exige `pulso_is_admin` via RPC antes de qualquer chamada ao modelo
- chave lida de `AI_API_KEY` / `OPENAI_API_KEY` no ambiente, **nunca no cliente**
- provedor configurável por `AI_PROVIDER`, cliente `ChatOpenAI` do LangChain

O portão da seção 2 está satisfeito: há precedente de chamada server-side com a chave fora do cliente,
e o padrão de autorização (token do Supabase + verificação de papel antes do modelo) é o que o lab
jurídico deve seguir.

## Onde o Challenge se encaixa

`challenge` é Next 14 + Supabase, com fila de turnos, multi-provedor (Groq/OpenAI/Anthropic/DeepSeek),
avaliação por evidência e voz em tempo real. É um produto de **uma pessoa por sessão, mundo dinâmico** —
não de sala com grupos e rodadas fixas. A diferença está registrada no relatório ao Paulo.
