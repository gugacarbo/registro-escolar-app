---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0012
implemented-by: []
---

# Cadastro de servidores e papéis de reunião

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir cadastrar servidores reutilizáveis e papéis de reunião, vinculando ambos à participação de uma reunião específica.

## Fluxo

1. O operador cadastra servidores (professores, coordenadores, direção etc.).
2. O sistema oferece papéis padrão (Professor, Coordenação pedagógica, Direção etc.) e permite criar novos.
3. Na preparação de uma reunião, o operador seleciona servidores e define o papel de cada um naquela reunião.
4. O mesmo servidor pode ter papéis diferentes em reuniões diferentes.

## Contrato

> Decisão D0 (nomenclatura): identificadores e endpoints em inglês, consistente
> com o código existente (`/api/students`, tabelas `students`); rótulos e
> mensagens da UI em português. Equivalência com os termos da seção Fluxo:
> servidor → `staff`, papel → `role`, reunião → `meeting`, participação →
> `meeting_participants`.

- `POST /api/staff` — cria servidor.
- `GET /api/staff` — lista servidores (exclui soft-deleted).
- `POST /api/roles` — cria papel.
- `GET /api/roles` — lista papéis (garante o papel padrão `Professor`).
- `POST /api/meetings/:id/participants` — adiciona participante com papel.
- Payload de participação: `{ staffId, roleId }` (`meetingId` vem do path `:id`).

A entidade `meetings` neste escopo é mínima (`id`, `title`, `status`,
`heldAt`); será estendida pela spec futura do ciclo de vida de reuniões.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                            | o sistema DEVE ⟨resposta⟩                            |
| --- | ----------------------------------------------------------- | ---------------------------------------------------- |
| 1   | o servidor já estiver cadastrado                            | reutilizar cadastro existente                        |
| 2   | um papel padrão for criado novamente pelo operador          | evitar duplicidade ou normalizar nome                |
| 3   | o servidor for removido do cadastro                         | manter participações históricas (soft delete apenas) |
| 4   | o operador tentar atribuir papel inexistente a participação | rejeitar com erro de validação                       |

## Questões em aberto

- [ ]

## Definition of Done

```bash
bun run typecheck        # exit 0
bun run check            # exit 0
bun run test             # tudo verde
bun run test:coverage    # ≥ 95%
```

## Revisão humana

- Lista final de papéis padrão; nomenclatura em português.

## Verificação

```text
(preencher no fechamento)
```
