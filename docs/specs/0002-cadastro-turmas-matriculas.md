---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0015
implemented-by: []
---

# Cadastro de turmas e vínculos de matrícula

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir criar turmas vinculadas a períodos letivos e registrar o vínculo histórico de alunos com cada turma, preservando mudanças de série/curso/período.

## Fluxo

1. O operador cadastra uma turma informando nome, período letivo e campos opcionais (curso, série, turno).
2. O operador seleciona um aluno e define início, término opcional e status do vínculo com a turma.
3. O sistema exibe vínculos ativos e históricos.
4. Mudanças de turma encerram o vínculo anterior e abrem novo vínculo sem apagar histórico.

## Contrato

- `POST /api/classes` — cria turma.
- `GET /api/classes` — lista turmas.
- `POST /api/enrollments` — cria/encerra vínculo aluno-turma.
- `GET /api/classes/:id/students?date=YYYY-MM-DD` — retorna alunos da turma na data informada.
- Payload de turma: `nome`, `periodoLetivo`, campos opcionais `curso`, `serie`, `turno`.
- Payload de vínculo: `alunoId`, `turmaId`, `dataInicio`, `dataTermino` opcional, `status`.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                                       | o sistema DEVE ⟨resposta⟩                     |
| --- | ---------------------------------------------------------------------- | --------------------------------------------- |
| 1   | duas turmas equivalentes de períodos diferentes forem criadas          | tratá-las como entidades distintas            |
| 2   | um aluno for transferido para outra turma                              | encerrar vínculo antigo e preservar histórico |
| 3   | uma reunião consultar alunos da turma em data fora de qualquer vínculo | não incluir o aluno na lista daquela reunião  |
| 4   | houver vínculos sobrepostos para o mesmo aluno na mesma turma          | rejeitar ou sinalizar inconsistência          |
| 5   | o vínculo não possuir data de término                                  | considerá-lo ativo até nova data de término   |

## Questões em aberto

- [ ]

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- Regra de negócio para sobreposição de vínculos e UX de encerramento.

## Verificação

```text
(preencher no fechamento)
```
