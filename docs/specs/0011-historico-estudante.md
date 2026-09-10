---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0015
  - ADR-0013
implemented-by:
  - src/lib/history/schema.ts
  - src/lib/history/types.ts
  - src/lib/history/repository.ts
  - src/routes/api/students/$id/history.ts
  - src/hooks/history/use-history.ts
  - src/components/history/student-history-panel.tsx
---

# Histórico do estudante

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir consultar a linha do tempo completa de um estudante, atravessando turmas, períodos letivos, reuniões e registros, com filtros e busca textual.

## Fluxo

1. O operador pesquisa o estudante.
2. Abre o perfil/histórico.
3. O sistema exibe eventos agrupados por período e turma.
4. O operador filtra por turma, período letivo, reunião, categoria, componente curricular ou busca no texto.
5. Durante uma reunião, o histórico do estudante é acessível sem sair do fluxo de registro.

## Contrato

- `GET /api/students/:id/history` — retorna linha do tempo do estudante.
- Query params: `turmaId`, `periodo`, `reuniaoId`, `categoriaId`, `componenteId`, `q` (busca textual).
- Resposta: lista de eventos ordenados cronologicamente com turma, reunião, data, registros e metadados.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                            | o sistema DEVE ⟨resposta⟩                                             |
| --- | ------------------------------------------- | --------------------------------------------------------------------- |
| 1   | o estudante mudou de turma                  | exibir registros de ambas as turmas na mesma linha histórica (CA-001) |
| 2   | não houver registros para o filtro aplicado | exibir estado vazio com opção de limpar filtros                       |
| 3   | o estudante estiver sendo discutido         | exibir histórico em painel lateral sem abandonar a reunião (CA-006)   |
| 4   | houver registro interno                     | incluir no histórico interno, mesmo que omitido da ata                |
| 5   | uma reunião antiga for consultada           | relacionar registros ao contexto da turma naquela data (CA-007)       |

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

DoD executado em 2026-09-09. A linha do tempo compõe matrículas,
encerramentos, reuniões, status de acompanhamento, registros vinculados e
independentes; usa a data da reunião (`heldAt` ou `createdAt`) e a regra temporal
do ADR-0015. Registros internos permanecem no histórico; filtros e busca textual
ignoram acentos/caixa. Borda 3 está atendida pelo hook reutilizável
`useStudentHistory`, pronto para painel lateral da reunião. Gates conforme DoD.
