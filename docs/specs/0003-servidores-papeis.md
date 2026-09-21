---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0012
implemented-by:
  - src/routes/api/staff/index.ts
  - src/routes/api/roles/index.ts
  - src/routes/api/meetings/$meetingId/participants.ts
  - src/lib/staff/repository.ts
  - src/lib/staff/schema.ts
  - src/lib/staff/shared.ts
  - src/lib/roles/repository.ts
  - src/lib/roles/schema.ts
  - src/lib/roles/shared.ts
  - src/lib/meetings/repository.ts
  - src/lib/meetings/schema.ts
  - src/routes/_app/staff/index.tsx
  - src/routes/_app/roles/index.tsx
  - src/components/staff/create-staff-dialog.tsx
  - src/components/roles/create-role-dialog.tsx
  - src/routes/_app/meetings/$meetingId/participants.tsx
  - src/components/staff/staff-form.tsx
  - src/components/roles/role-form.tsx
  - src/hooks/staff/use-staff.ts
  - src/hooks/staff/use-create-staff.ts
  - src/hooks/roles/use-roles.ts
  - src/hooks/roles/use-create-role.ts
  - src/hooks/meetings/use-participants.ts
  - src/hooks/meetings/use-add-participant.ts
---

# Cadastro de servidores e cargos de reunião

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir cadastrar servidores reutilizáveis e cargos de reunião, vinculando ambos à participação de uma reunião específica.

## Fluxo

1. Na lista de servidores, o operador abre o diálogo **Novo servidor** e cadastra professores, coordenadores, direção etc., sem sair da lista.
2. O sistema oferece cargos padrão (Professor, Coordenação pedagógica, Direção etc.) e permite criar novos.
3. Na preparação de uma reunião, o operador seleciona servidores e define o cargo de cada um naquela reunião.
4. O mesmo servidor pode ter cargos diferentes em reuniões diferentes.

## Contrato

> Decisão D0 (nomenclatura): identificadores e endpoints em inglês, consistente
> com o código existente (`/api/students`, tabelas `students`); rótulos e
> mensagens da UI em português. Equivalência com os termos da seção Fluxo:
> servidor → `staff`, cargo → `role`, reunião → `meeting`, participação →
> `meeting_participants`. O catálogo de cargos de reunião usa o substantivo
> **cargo** na UI; `role`/`roles` permanecem em código, rotas e tabelas. Os
> papéis de **acesso** (`admin`/`user`) são outro conceito, continuam
> rotulados como "Papel" e vivem em `/admin/users` (SPEC-0014).

- `POST /api/staff` — cria servidor.
- `GET /api/staff` — lista servidores (exclui soft-deleted).
- `POST /api/roles` — cria cargo.
- `GET /api/roles` — lista cargos (garante o cargo padrão `Professor`).
- `POST /api/meetings/:id/participants` — adiciona participante com cargo.
- Payload de participação: `{ staffId, roleId }` (`meetingId` vem do path `:id`).

A entidade `meetings` neste escopo é mínima (`id`, `title`, `status`,
`heldAt`); será estendida pela spec futura do ciclo de vida de reuniões.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                            | o sistema DEVE ⟨resposta⟩                            |
| --- | ----------------------------------------------------------- | ---------------------------------------------------- |
| 1   | o servidor já estiver cadastrado                            | reutilizar cadastro existente                        |
| 2   | um cargo padrão for criado novamente pelo operador          | evitar duplicidade ou normalizar nome                |
| 3   | o servidor for removido do cadastro                         | manter participações históricas (soft delete apenas) |
| 4   | o operador tentar atribuir cargo inexistente a participação | rejeitar com erro de validação                       |

## Questões em aberto

Nenhuma — os quatro casos de borda estão cobertos por testes (ver Verificação).

## Definition of Done

```bash
bun run typecheck        # exit 0 — tipos das rotas/validações
bun run check            # exit 0 — 190 arquivos, sem correções
bun run test --run       # 200 testes verdes em 30 arquivos
bun run test:coverage    # 98,48% statements/linhas, 97,58% funções, 95,15% branches
scripts/docs-check       # exit 0 — spec válida como implemented
```

## Revisão humana

- Resolvido no fechamento: o cargo padrão garantido é `Professor`
  (`DEFAULT_ROLES` + `ensureDefaultRoles` idempotente em
  `src/lib/roles/repository.ts`); nomenclatura conforme decisão D0.

## Verificação

DoD executado em 2026-09-09 no repo registro-escolar-app: `bun run
typecheck` exit 0; `bun run check` exit 0 (190 arquivos, sem correções);
`bun run test --run` com 200 testes verdes em 30 arquivos;
`bun run test:coverage` com 98,48% em statements e linhas, 97,58% em
funções e 95,15% em branches; `scripts/docs-check` exit 0 com SPEC-0003
como implemented. Casos de borda cobertos por testes de repositório e de
rota — (1) servidor já cadastrado é sinalizado para reuso em vez de
duplicar (`POST /api/staff` responde 409 "Servidor já cadastrado" com o
campo `existingStaff`; a detecção normaliza acentos, caixa e espaços
extras via `normalizeStaffName`), (2) cargo duplicado é normalizado ou
rejeitado (`"  coordenacao PEDAGOGICA "` vira "Coordenação pedagógica";
`POST /api/roles` responde 409 "Cargo já existe" com `existingRole`;
`GET /api/roles` garante o cargo padrão "Professor" de forma
idempotente), (3) remoção de servidor é soft delete (`softDeleteStaff`
preenche `deletedAt` sem tocar `meeting_participants`, preservando as
participações históricas; `GET /api/staff` exclui removidos), (4) cargo
inexistente em participação é rejeitado (`POST
/api/meetings/:id/participants` responde 404 "Cargo não encontrado";
servidor inexistente responde 404 "Servidor não encontrado"; participante
duplicado na mesma reunião responde 409).
