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

- `POST /api/servidores` — cria servidor.
- `GET /api/servidores` — lista servidores.
- `POST /api/roles` — cria papel.
- `GET /api/roles` — lista papéis.
- `POST /api/meetings/:id/participants` — adiciona participante com papel.
- Payload de participação: `servidorId`, `papelId`, `reuniaoId`.

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
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- Lista final de papéis padrão; nomenclatura em português.

## Verificação

```text
(preencher no fechamento)
```
