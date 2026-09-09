---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0012
  - ADR-0015
implemented-by: []
---

# Acompanhamento dos alunos durante a reunião

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir ao operador acompanhar o progresso da discussão dos alunos das turmas participantes, identificando pendentes, em discussão, concluídos e não discutidos.

## Fluxo

1. A reunião é iniciada.
2. O operador seleciona uma das turmas da reunião.
3. O sistema lista os alunos vinculados à turma na data da reunião.
4. O operador seleciona um aluno, marca como "Em discussão", consulta histórico, adiciona registros e marca como "Concluído".
5. O sistema atualiza contadores e destaca próximos pendentes.

## Contrato

- `GET /api/meetings/:id/classes/:classId/students` — alunos da turma na data da reunião.
- `PATCH /api/meetings/:id/students/:studentId/status` — atualiza status de acompanhamento.
- Status permitidos: `pendente`, `em_discussao`, `concluido`, `nao_discutido`.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                         | o sistema DEVE ⟨resposta⟩                                |
| --- | -------------------------------------------------------- | -------------------------------------------------------- |
| 1   | o aluno não pertencer à turma na data da reunião         | não listá-lo como disponível para discussão              |
| 2   | todas as turmas forem concluídas                         | indicar progresso de 100% e sugerir revisão/encerramento |
| 3   | o operador marcar um aluno como concluído sem registros  | permitir, pois registros são opcionais                   |
| 4   | o operador alternar entre turmas                         | manter estado de acompanhamento independente por turma   |
| 5   | o aluno estiver vinculado a mais de uma turma da reunião | permitir discussão em cada turma independentemente       |

## Questões em aberto

- [ ]

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- UX de navegação entre alunos; acessibilidade dos indicadores de progresso.

## Verificação

```text
(preencher no fechamento)
```
