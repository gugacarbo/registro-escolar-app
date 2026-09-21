---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0012
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
  - src/routes/api/meetings/$meetingId/start.ts
  - src/routes/api/meetings/$meetingId/finalize.ts
  - src/routes/api/meetings/$meetingId/reopen.ts
  - src/routes/api/meetings/$meetingId/classes/index.ts
  - src/routes/api/meetings/$meetingId/classes/$classId/index.ts
  - src/components/meetings/meeting-form.tsx
  - src/components/meetings/meeting-status-badge.tsx
  - src/components/meetings/transition-buttons.tsx
  - src/hooks/meetings/use-meetings.ts
  - src/hooks/meetings/use-create-meeting.ts
  - src/hooks/meetings/use-meeting.ts
  - src/hooks/meetings/use-update-meeting.ts
  - src/hooks/meetings/use-add-meeting-class.ts
  - src/hooks/meetings/use-remove-meeting-class.ts
  - src/hooks/meetings/use-transition-meeting.ts
  - src/routes/_app/meetings/index.tsx
  - src/components/meetings/edit-meeting-dialog.tsx
  - src/components/meetings/create-meeting-dialog.tsx
  - src/routes/_app/meetings/$meetingId/index.tsx
---

# Criação e ciclo de vida de reunião

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir criar e gerenciar o ciclo de vida de uma reunião de conselho de classe, desde a preparação até a finalização e reabertura, distinguindo registros vinculados à reunião de registros independentes do estudante.

## Fluxo

1. O operador cria uma reunião informando nome e data.
2. Em Rascunho, seleciona turmas participantes, servidores participantes, cargos e modelo de ata.
3. O operador inicia a reunião (Rascunho → Em andamento).
4. Durante o conselho, o operador visualiza estudantes das turmas, seus registros independentes pré-existentes, e pode criar novos registros vinculados àquela reunião. Também pode ajustar os dados gerais da reunião (nome, data, modelo de ata) e as turmas participantes.
5. O operador finaliza a reunião (Em andamento → Finalizada).
6. Se necessário, reabre a reunião para correções (Finalizada → Reaberta → Em andamento → Finalizada).

## Contrato

- `POST /api/meetings` — cria reunião em Rascunho.
- `GET /api/meetings/:id/classes` — lista turmas vinculadas.
- `POST /api/meetings/:id/classes` — vincula turma à reunião.
- `DELETE /api/meetings/:id/classes/:classId` — desvincula turma da reunião.
- `PATCH /api/meetings/:id` — atualiza dados gerais (nome, data, modelo de ata).
- `PATCH /api/meetings/:id/start` — inicia reunião.
- `PATCH /api/meetings/:id/finalize` — finaliza reunião.
- `PATCH /api/meetings/:id/reopen` — reabre reunião finalizada.
- Payload de criação: `nome`, `data`, `turmaIds[]`, `participantes[]` com `servidorId` e `papelId`, `templateId` opcional do modelo.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                                                     | o sistema DEVE ⟨resposta⟩                                    |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 1   | a reunião estiver Finalizada e o operador tentar editar registro vinculado à reunião | rejeitar e informar necessidade de reabertura                |
| 2   | a reunião estiver Finalizada e houver registro independente do estudante             | permitir visualizar, mas não permitir novo vínculo exclusivo |
| 3   | a reunião não tiver turmas selecionadas ao iniciar                                   | rejeitar início                                              |
| 4   | a reunião for reaberta                                                               | manter versões anteriores da ata e seus PDFs                 |
| 5   | o operador tentar iniciar uma reunião já em andamento                                | rejeitar transição inválida                                  |
| 6   | um registro independente for criado enquanto a reunião está em qualquer estado       | permitir, pois não depende do estado da reunião              |
| 7   | a reunião estiver Em andamento ou Reaberta e o operador editar dados gerais          | permitir a atualização                                       |
| 8   | a reunião estiver Rascunho, Em andamento ou Reaberta e o operador vincular turma     | permitir, refletindo no acompanhamento e na ata              |
| 9   | o operador desvincular turma que já possui acompanhamento de estudantes registrado   | rejeitar com conflito e manter a turma vinculada             |
| 10  | a reunião estiver Finalizada e o operador tentar editar dados gerais ou turmas       | rejeitar e informar necessidade de reabertura                |

## Regras de edição durante a reunião

- `PATCH /api/meetings/:id` aceita `draft`, `in_progress` e `reopened`; em
  `finished` responde `409` com exigência de reabertura.
- `POST /api/meetings/:id/classes` aceita `draft`, `in_progress` e `reopened`.
- `DELETE /api/meetings/:id/classes/:classId` aceita `draft`, `in_progress` e
  `reopened`; responde `409` se a turma já possuir acompanhamento
  (`meeting_student_status`) naquela reunião, para não perder registro já feito.
- A edição de turmas não apaga acompanhamento, registros vinculados, relatos
  gerais nem versões de ata já emitidas.

## Questões em aberto

Nenhuma — os dez casos de borda estão cobertos por testes.

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- Estados e transições; mensagens de erro apresentadas ao operador.
- Edição em Em andamento: dados gerais e turmas ficam disponíveis durante a
  reunião; registros vinculados continuam restritos a Em andamento/Reaberta.

## Verificação

```text
2026-09-09 — implementação API + UI completa:
- bunx tsc --noEmit --skipLibCheck → exit 0
- bun run test → 58 arquivos, 460 testes, tudo verde
- biome nos 44 arquivos do escopo (db meetings, lib/meetings, routes/api/meetings,
  hooks/meetings, components/meetings, routes/_app/meetings) → limpo
- bun run check → exit 0 (299 arquivos)
- bun run test:coverage → global ≥95% (statements/lines 98,45%; funções 99,20%; branches 95,09%)
- Endpoints: POST /api/meetings (201 sempre draft), PATCH :id/start (422 sem
  turmas, 409 transição inválida), PATCH :id/finalize, PATCH :id/reopen + hint
- UI: /meetings (lista+filtros+transições), /meetings/new, /meetings/:id e
  /meetings/:id/council integrado às specs 0006/0007

2026-09-21 — edição durante a reunião (bordas 7/8/9/10):
- bun run typecheck → exit 0
- bun run check → exit 0 (542 arquivos)
- bun run test → 177 arquivos, 1168 testes verdes (1 skip)
- bun run test:coverage → 96,69% statements/lines; 95,02% branches;
  97,17% funções (≥95%)
- bun run e2e → 125 testes verdes, incluindo os dois novos cenários
  SPEC-0005 (edição de dados/turmas em andamento; bloqueio de remoção com
  acompanhamento e edição em finalizada)
- PATCH /api/meetings/:id em in_progress/reopened → 200; finished → 409
- POST /api/meetings/:id/classes em draft/in_progress/reopened → 201;
  DELETE .../classes/:classId → 200, 409 com acompanhamento, 409 em finished
- UI: aba Turmas vincula/desvincula em andamento; diálogo "Editar dados"
  disponível em in_progress; banner orienta ajustes durante a reunião
```
