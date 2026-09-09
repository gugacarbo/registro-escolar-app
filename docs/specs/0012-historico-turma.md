---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0015
implemented-by:
  - src/lib/history/schema.ts
  - src/lib/history/types.ts
  - src/lib/history/repository.ts
  - src/routes/api/classes/$id/history.ts
  - src/hooks/history/use-history.ts
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

Nenhuma — os casos de borda estão cobertos por testes.

## Definition of Done

```bash
bun run typecheck .................. exit 0
bun run check ...................... exit 0 (292 arquivos)
bun run test --run ................. 57 arquivos, 452 testes verdes
bun run test:coverage .............. 98,48% stmts/linhas, 99,11% funcs, 95,02% branches
scripts/docs-check ................ exit 0
```

## Revisão humana

- Resolvido no fechamento: API/hooks prontos; a tela final pode consumir o contrato sem alterações de domínio.

## Verificação

DoD executado em 2026-09-09. O histórico da turma retorna dados cadastrais,
alunos ativos/históricos com datas/status, reuniões relacionadas e eventos
cronológicos (reunião, registros, status e relatos gerais). Período divergente
não mistura eventos; registros internos permanecem visíveis; filtros e busca
textual são aplicados no serviço. Gates conforme DoD.
