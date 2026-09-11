---
status: draft
date: 2026-09-11
builds-on:
  - ADR-0008
  - ADR-0020
  - SPEC-0014
implemented-by: []
---

# Plano de implementação — Administração de usuários e autorização por papéis

> Especificação: [docs/specs/0014-administra-usuarios-e-autorizacao-por-papeis.md](../specs/0014-administra-usuarios-e-autorizacao-por-papeis.md)
> Convenções: `docs/context/CONVENTIONS.md` e `docs/context/TESTS.md`

## Global Constraints

- Use TanStack Start, Cloudflare Workers, D1/SQLite, Drizzle ORM, Better Auth, TanStack Query e componentes shadcn/ui já existentes.
- O papel persistido aceita exclusivamente `admin` e `user`; `isPermanentAdmin` identifica a primeira conta e jamais é removido.
- A migration deve ser gerada pelo Drizzle Kit com `bun run db:generate -- --name=adiciona-papeis-de-acesso` e deve promover a conta de menor `created_at` a administrador permanente, mantendo as demais como `user`.
- Todas as decisões de autorização administrativas ocorrem no servidor. Rotas e APIs fora de `/admin/*` permanecem acessíveis a qualquer sessão autenticada.
- Use TanStack Query, com `staleTime`, `gcTime` e invalidação explícitos, para requisições da interface administrativa.
- Reaproveite componentes de `src/components/ui/` e `src/components/data-table.tsx`; não altere o domínio de papéis de reunião em `/roles` nem a entidade `staff`.
- Mensagens e rótulos da interface devem permanecer em português; identificadores de código permanecem em inglês.
- Testes devem cobrir regras de negócio, handlers de API, UI, fluxo e2e e snapshot visual da rota nova.

## Escopo

- Persistência e sessão de `role`/`isPermanentAdmin`, incluindo cadastro inicial e migração de dados existentes.
- APIs administrativas para listar, alterar papel e excluir usuários sob as restrições da SPEC-0014.
- Rota protegida `/admin/users`, navegação administrativa condicional e estados de carregamento, vazio e erro.
- Testes e validações da Definition of Done da SPEC-0014.

## Fora do escopo

- Papéis de reunião em `/roles` e entidade `staff`.
- Alteração das permissões de funcionalidades existentes fora do prefixo `/admin`.
- Recuperação de senha, convite de usuários ou papéis adicionais.

## Tarefas

### Task 1 — Persistir e expor papéis de acesso

**Dependências:** nenhuma.

**Arquivos esperados:**

- `src/db/auth-schema.ts`
- `src/db/schema.ts`, caso necessário para exportar o schema existente
- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/lib/auth.test.ts`
- `src/routes/auth-pages.test.tsx`, se fixtures de sessão/cadastro exigirem o novo campo
- `drizzle/<migration-gerada>.sql`
- `drizzle/meta/<snapshot-gerado>.json`
- `drizzle/meta/_journal.json`

**Implementar:**

1. Adicionar ao usuário os campos persistidos `role` e `isPermanentAdmin`, com valores compatíveis com usuários existentes.
2. Configurar Better Auth para incluir ambos os campos na criação e no retorno de sessão, garantindo que a primeira criação concorrente receba `admin` e `isPermanentAdmin: true`, e toda criação posterior receba `user`.
3. Gerar a migration nomeada que promove a conta existente de menor `created_at` a admin permanente e atribui `user` às demais.
4. Adaptar o cliente/tipos de autenticação para que rotas e componentes possam consumir o papel sem casts inseguros.
5. Cobrir em testes o cadastro inicial, cadastro posterior e exposição da sessão.

**Aceitação:** os casos 1 e 2 da SPEC-0014 passam, sem modificar regras de papéis de reunião.

### Task 2 — Autorizar e administrar usuários no servidor

**Dependências:** Task 1 integrada e aprovada.

**Arquivos esperados:**

- `src/lib/auth/session.ts`
- `src/lib/auth/authorization.ts` ou helper equivalente
- `src/lib/admin-users/repository.ts`
- `src/lib/admin-users/repository.test.ts`
- `src/routes/api/admin/users/index.ts`
- `src/routes/api/admin/users/index.test.ts`
- `src/routes/api/admin/users/$id.ts`
- `src/routes/api/admin/users/$id.test.ts`

**Implementar:**

1. Criar helpers server-side para exigir sessão e papel `admin`, sem confiar apenas na UI.
2. Implementar listagem paginada de usuários, com pesquisa por nome/e-mail e os campos contratuais da SPEC.
3. Implementar atualização de papel somente entre `admin` e `user`, bloqueando autoalteração e alteração do administrador permanente.
4. Implementar exclusão somente de outro `user`, bloqueando autoexclusão, administrador permanente e demais admins; manter cascata de credenciais e sessões.
5. Cobrir respostas não autenticadas, não autorizadas, payload inválido e todos os casos de borda 3–6 da SPEC.

**Aceitação:** `GET`, `PATCH` e `DELETE /api/admin/users` obedecem integralmente ao contrato da SPEC-0014.

### Task 3 — Entregar a interface administrativa e suas proteções

**Dependências:** Tasks 1 e 2 integradas e aprovadas.

**Arquivos esperados:**

- `src/routes/_app/admin/users/index.tsx`
- `src/routes/_app/admin/route.tsx` ou guarda equivalente de rota server-side
- `src/routes/_app/route.tsx`
- `src/components/app-sidebar.tsx`
- `src/components/admin-users/*`
- `src/hooks/admin-users/*`
- `src/routes/_app/route.test.tsx`
- testes adjacentes dos componentes/rotas novos
- `e2e/admin-users.spec.ts`
- `e2e/visual/admin-users.spec.ts`
- snapshots visuais gerados correspondentes
- `src/routeTree.gen.ts`

**Implementar:**

1. Proteger `/admin/*` no carregamento da rota e apresentar acesso negado para sessão ausente ou usuário comum.
2. Exibir navegação de administração apenas para admins autenticados.
3. Construir `/admin/users` usando tabela e componentes compartilhados, com busca, paginação e estados de carregamento, vazio e erro.
4. Permitir promover/rebaixar contas elegíveis e excluir outro `user` mediante confirmação; representar visualmente ações indisponíveis e suas restrições.
5. Aplicar TanStack Query com cache explícito e invalidação após mutações.
6. Cobrir o fluxo real de admin, negativas de usuário comum e snapshot visual da rota.

**Aceitação:** os casos 3–7 da SPEC-0014 passam; a interface não oferece ações proibidas.

## Validação final

```bash
bun run test src/lib/auth.test.ts src/routes/_app/route.test.tsx src/routes/api/admin/users/index.test.ts src/routes/api/admin/users/$id.test.ts
bun run e2e e2e/admin-users.spec.ts
bun run test:visual
bun run typecheck
bun run check
scripts/docs-check
bun run build
```
