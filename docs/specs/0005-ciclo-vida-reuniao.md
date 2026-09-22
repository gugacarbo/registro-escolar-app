---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0021
  - ADR-0011
  - ADR-0013
implemented-by:
  - src/db/meetings-schema.ts
  - src/lib/meetings/schema.ts
  - src/lib/meetings/repository.ts
  - src/lib/meetings/transitions.ts
  - src/lib/meetings/errors.ts
  - src/routes/api/meetings/index.ts
  - src/routes/api/meetings/$meetingId/index.ts
  - src/routes/api/meetings/$meetingId/reopen.ts
  - src/routes/api/meetings/$meetingId/classes/index.ts
  - src/routes/api/meetings/$meetingId/classes/$classId/index.ts
  - src/routes/api/meetings/$meetingId/participants.ts
  - src/components/meetings/meeting-form.tsx
  - src/components/meetings/meeting-status-badge.tsx
  - src/components/meetings/transition-buttons.tsx
  - src/hooks/meetings/use-transition-meeting.ts
  - src/routes/_app/meetings/index.tsx
  - src/routes/_app/meetings/$meetingId/index.tsx
  - src/routes/_app/meetings/$meetingId/council.tsx
---

# Criação e ciclo de vida de reunião

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir criar e gerenciar uma reunião de conselho de classe em um único estado
de trabalho (**Aberta**) e encerrá-la ao emitir a ata oficial, mantendo o
caminho de reabertura para correções e novas versões da ata. O estado da
reunião regula o que pode ser alterado dentro dela, não os registros
independentes do estudante.

## Fluxo

1. O operador cria uma reunião informando nome, data, turmas, participantes e
   modelo de ata. Ela nasce **Aberta**.
2. Em **Aberta**, o operador ajusta dados gerais, turmas, participantes,
   acompanhamento dos estudantes, registros vinculados, relatos gerais e o
   conteúdo da ata.
3. O operador gera a versão oficial da ata. A geração encerra a reunião:
   **Aberta → Encerrada**.
4. Em **Encerrada**, dados, turmas, registros vinculados, relatos gerais e
   conteúdo da ata não podem ser alterados.
5. Se necessário, o operador reabre a reunião para correções
   (**Encerrada → Aberta**); a próxima geração da ata cria a versão seguinte e
   encerra novamente.

## Contrato

- `POST /api/meetings` — cria reunião em `open`.
- `GET /api/meetings/:id` — retorna a reunião, incluindo `status`.
- `PATCH /api/meetings/:id` — atualiza dados gerais (nome, data, local, modelo
  de ata); permitido apenas em `open`.
- `POST /api/meetings/:id/classes` — vincula turma; permitido apenas em `open`.
- `DELETE /api/meetings/:id/classes/:classId` — desvincula turma; permitido
  apenas em `open` e rejeitado com conflito se a turma já possuir acompanhamento.
- `POST /api/meetings/:id/participants` — adiciona participante; permitido
  apenas em `open`.
- `PATCH /api/meetings/:id/reopen` — reabre reunião `closed`, retornando-a para
  `open`. Única transição de estado explícita.
- `POST /api/meetings/:id/minutes` — gera versão oficial da ata e encerra a
  reunião (`open` → `closed`); em `closed` responde conflito exigindo reabertura.
- Estados de reunião: `open` (Aberta) e `closed` (Encerrada).

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                                                                                                                                   | o sistema DEVE ⟨resposta⟩                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 1   | a reunião estiver `closed` e o operador tentar editar dados gerais, turmas, participantes, acompanhamento, registros vinculados, relatos gerais ou conteúdo da ata | rejeitar e informar necessidade de reabertura                     |
| 2   | a reunião estiver `closed` e existir registro independente do estudante                                                                                            | permitir visualizar e criar/editar o registro independente        |
| 3   | o operador gerar a versão oficial da ata em reunião `open`                                                                                                         | criar a versão e transicionar a reunião para `closed`             |
| 4   | o operador tentar gerar ata em reunião `closed`                                                                                                                    | rejeitar e informar necessidade de reabertura                     |
| 5   | a reunião for reaberta                                                                                                                                             | voltar para `open` e manter versões anteriores da ata e seus PDFs |
| 6   | o operador tentar reabrir reunião `open`                                                                                                                           | rejeitar transição inválida                                       |
| 7   | um registro independente for criado em qualquer estado da reunião                                                                                                  | permitir, pois não depende do estado da reunião                   |
| 8   | a reunião estiver `open` e o operador vincular turma                                                                                                               | permitir, refletindo no acompanhamento e na ata                   |
| 9   | o operador desvincular turma que já possui acompanhamento de estudantes registrado                                                                                 | rejeitar com conflito e manter a turma vinculada                  |
| 10  | a reunião estiver `open` e o operador adicionar participante                                                                                                       | permitir                                                          |

## Regras de edição por estado

- `open` aceita: `PATCH /api/meetings/:id`, `POST/DELETE /api/meetings/:id/classes`,
  `POST /api/meetings/:id/participants`, acompanhamento, registros vinculados,
  relatos gerais, conteúdo da ata e geração da ata.
- `closed` aceita apenas: leitura, registros independentes do estudante
  (criar/editar) e `PATCH /api/meetings/:id/reopen`.
- A geração da ata é o único gatilho que fecha a reunião.
- A edição de turmas não apaga acompanhamento, registros vinculados, relatos
  gerais nem versões de ata já emitidas.

## Questões em aberto

Nenhuma — os dez casos de borda estão cobertos por testes.

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
bun run test --run                       # casos 1-10 verdes
```

## Revisão humana

- Estados e transições; mensagens de erro apresentadas ao operador.
- Encerramento automático da reunião ao gerar a ata e o fluxo de reabertura.

## Verificação

DoD executado em 2026-09-22 (ADR-0021). A reunião nasce `open` e permanece
editável; gerar a versão oficial da ata a encerra (`open → closed`) na mesma
operação; `PATCH /api/meetings/:id/reopen` é a única transição explícita e
devolve a reunião para `open`. As rotas `start`/`finalize` foram removidas
(arquivos e `routeTree.gen.ts` regenerado). Em `closed`, `PATCH` de dados,
turmas, participantes, acompanhamento, registros vinculados, relatos gerais e
conteúdo da ata respondem `409` com `meetingStatus: "closed"`; registros
independentes continuam permitidos. A aprovação exige reunião `closed`
(`ERR_MEETING_NOT_CLOSED` quando aberta) e a migração
`drizzle/0018_remapeia-status-reuniao.sql` remapeia
`draft|in_progress|reopened → open` e `finished → closed`. O default `open` é
aplicado explicitamente em `createMeeting`/`createMeetingWithRelations` porque
o D1 não permite o rebuild da tabela `meetings` (tem 7 filhas com FK) dentro da
transação da migration: o default físico legado `'draft'` permanece na coluna,
mas nunca é usado (ver `AGENTS.md > Gotchas` e a consequência no ADR-0021).

Gates executados:

```bash
bun run typecheck        # exit 0
bun run check            # exit 0 (544 arquivos)
bunx vitest run --project=unit --maxWorkers=2  # 178 arquivos, 1204 verdes, 1 ignorado
bun run test:coverage    # branches 95.02% (limite 95%)
bun run db:local:migrate # 0018 aplicada
bun run e2e              # 118 verdes (spec-0005 e demais specs)
bun run test:visual      # 8 verdes
bun run build            # exit 0
scripts/docs-check --emit-index  # 36 docs, 0 erros
```
