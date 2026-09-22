---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0012
  - ADR-0015
implemented-by:
  - src/db/meeting-student-status-schema.ts
  - src/lib/meeting-student-status/schema.ts
  - src/lib/meeting-student-status/repository.ts
  - src/routes/api/meetings/$meetingId/classes/$classId/students.ts
  - src/routes/api/meetings/$meetingId/students/$studentId/status.ts
  - src/hooks/meetings/use-meeting-class-students.ts
  - src/hooks/meetings/use-update-student-status.ts
  - src/routes/_app/meetings/$meetingId/students.tsx
---

# Acompanhamento dos estudantes durante a reunião

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir ao operador acompanhar o progresso da discussão dos estudantes das turmas participantes, identificando pendentes, em discussão, concluídos e não discutidos.

## Fluxo

1. A reunião está `open` (Aberta).
2. O operador seleciona uma das turmas da reunião.
3. O sistema lista os estudantes vinculados à turma na data da reunião.
4. O operador seleciona um estudante, marca como "Em discussão", consulta histórico, adiciona registros e marca como "Concluído".
5. O sistema atualiza contadores e destaca próximos pendentes.

## Contrato

- `GET /api/meetings/:id/classes/:classId/students` — estudantes da turma na data da reunião.
- `PATCH /api/meetings/:id/students/:studentId/status` — atualiza status de acompanhamento.
- Status permitidos: `pendente`, `em_discussao`, `concluido`, `nao_discutido`.
- `PATCH` é permitido apenas com a reunião `open`; em `closed` responde `409` exigindo reabertura.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                             | o sistema DEVE ⟨resposta⟩                                |
| --- | ------------------------------------------------------------ | -------------------------------------------------------- |
| 1   | o estudante não pertencer à turma na data da reunião         | não listá-lo como disponível para discussão              |
| 2   | todas as turmas forem concluídas                             | indicar progresso de 100% e sugerir revisão/encerramento |
| 3   | o operador marcar um estudante como concluído sem registros  | permitir, pois registros são opcionais                   |
| 4   | o operador alternar entre turmas                             | manter estado de acompanhamento independente por turma   |
| 5   | o estudante estiver vinculado a mais de uma turma da reunião | permitir discussão em cada turma independentemente       |

## Questões em aberto

Nenhuma — os cinco casos de borda estão cobertos por testes.

## Definition of Done

```bash
bun run db:local:migrate ............ exit 0
bun run typecheck .................. exit 0
bun run check ...................... exit 0 (299 arquivos)
bun run test --run ................. 58 arquivos, 460 testes verdes
bun run test:coverage .............. 98,45% stmts/linhas, 99,20% funcs, 95,09% branches
scripts/docs-check ................ exit 0
```

## Revisão humana

- Resolvido no fechamento: navegação e indicadores operacionais validados por testes; refinamentos visuais não alteram contrato.

## Verificação

Atualização 2026-09-22 (ADR-0021): o acompanhamento é permitido apenas em reunião `open`; em `closed` o PATCH responde conflito. DoD original (2026-09-09). A tabela `meeting_student_statuses` materializa o
status por `(meetingId, classId, studentId)`, garantindo acompanhamento
independente por turma e permitindo o mesmo estudante em mais de uma turma da
reunião. A listagem usa vínculos temporais ativos na data da reunião; turma sem
estudantes/reunião sem acompanhamento retorna contadores zerados; conclusão sem
registros é permitida. Gates conforme DoD.
