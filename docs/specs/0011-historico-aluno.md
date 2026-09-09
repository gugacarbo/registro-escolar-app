---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0015
  - ADR-0013
implemented-by: []
---

# Histórico do aluno

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir consultar a linha do tempo completa de um aluno, atravessando turmas, períodos letivos, reuniões e registros, com filtros e busca textual.

## Fluxo

1. O operador pesquisa o aluno.
2. Abre o perfil/histórico.
3. O sistema exibe eventos agrupados por período e turma.
4. O operador filtra por turma, período letivo, reunião, categoria, componente curricular ou busca no texto.
5. Durante uma reunião, o histórico do aluno é acessível sem sair do fluxo de registro.

## Contrato

- `GET /api/students/:id/history` — retorna linha do tempo do aluno.
- Query params: `turmaId`, `periodo`, `reuniaoId`, `categoriaId`, `componenteId`, `q` (busca textual).
- Resposta: lista de eventos ordenados cronologicamente com turma, reunião, data, registros e metadados.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                            | o sistema DEVE ⟨resposta⟩                                             |
| --- | ------------------------------------------- | --------------------------------------------------------------------- |
| 1   | o aluno mudou de turma                      | exibir registros de ambas as turmas na mesma linha histórica (CA-001) |
| 2   | não houver registros para o filtro aplicado | exibir estado vazio com opção de limpar filtros                       |
| 3   | o aluno estiver sendo discutido             | exibir histórico em painel lateral sem abandonar a reunião (CA-006)   |
| 4   | houver registro interno                     | incluir no histórico interno, mesmo que omitido da ata                |
| 5   | uma reunião antiga for consultada           | relacionar registros ao contexto da turma naquela data (CA-007)       |

## Questões em aberto

- [ ]

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- UX da linha do tempo; performance com histórico longo.

## Verificação

```text
(preencher no fechamento)
```
