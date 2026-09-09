---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0015
implemented-by: []
---

# Histórico da turma

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir consultar reuniões, alunos, registros e evolução temporal de uma turma específica, com filtros e busca textual.

## Fluxo

1. O operador seleciona uma turma.
2. Visualiza dados cadastrais, alunos ativos e históricos.
3. Acessa reuniões relacionadas e registros feitos nelas.
4. Aplica filtros por período letivo, reunião, categoria, componente curricular ou busca textual.

## Contrato

- `GET /api/classes/:id/history` — histórico da turma.
- Query params: `periodo`, `reuniaoId`, `categoriaId`, `componenteId`, `alunoId`, `q`.
- Resposta: dados da turma, alunos vinculados, reuniões e registros cronologicamente.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                         | o sistema DEVE ⟨resposta⟩                                     |
| --- | ---------------------------------------- | ------------------------------------------------------------- |
| 1   | a turma não tiver reuniões               | exibir empty-state e lista de alunos                          |
| 2   | houver alunos com vínculos encerrados    | permitir visualizar alunos históricos com indicador de status |
| 3   | a busca textual não retornar resultados  | exibir mensagem e permitir ajuste de filtros                  |
| 4   | a turma for equivalente de outro período | não misturar registros; turmas são entidades distintas        |
| 5   | um registro estiver marcado como interno | ainda aparecer no histórico interno da turma                  |

## Questões em aberto

- [ ]

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- UX de navegação entre reuniões da turma; indicadores de evolução temporal.

## Verificação

```text
(preencher no fechamento)
```
