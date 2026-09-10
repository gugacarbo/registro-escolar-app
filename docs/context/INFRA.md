# Infraestrutura &amp; ambientes

## Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React, SSR/SPA, file-system routing)
- **Build tooling:** Vite 8 + `@cloudflare/vite-plugin`
- **Runtime:** Cloudflare Workers (`wrangler.jsonc`)
- **Banco de dados:** Cloudflare D1 (SQLite) via [Drizzle ORM](https://orm.drizzle.team/)
- **Autenticação:** [Better Auth](https://www.better-auth.com/) com `drizzleAdapter` (SQLite)
- **Estilização:** Tailwind CSS v4 + shadcn/ui (novo estilo “New York”)
- **Gerenciador de pacotes:** Bun 1.3.14 (lockfile `bun.lock`, workspace `bun-workspace.yaml`)
- **Lint/format:** Biome 2.5.12 + Prettier (Markdown/YAML/shell)
- **Observabilidade:** Wrangler observability habilitado; source maps enviadas

## Onde roda

A aplicação é **serverless no Cloudflare Workers** com banco D1. Não há Docker, docker-compose, servidor próprio ou banco self-hosted.


| Componente | Serviço                |
| ---------- | ---------------------- |
| Aplicação  | Cloudflare Workers     |
| Banco      | Cloudflare D1 (SQLite) |
| Deploy     | Wrangler CLI           |


## Como rodar localmente

1. Instale as dependências:
  ```bash
   bun install
  ```
2. Copie e ajuste os secrets/variáveis:
  ```bash
   cp .env.example .env.local
   cp .dev.vars.example .dev.vars
  ```
3. Gere o secret do Better Auth:
  ```bash
   bunx @better-auth/cli secret
   # copie o valor para BETTER_AUTH_SECRET em .env.local e .dev.vars
  ```
4. Crie o banco D1 localmente (apenas uma vez):
  ```bash
   bun run db:create
  ```
5. Aplique as migrations locais:
  ```bash
   bun run db:local:migrate
  ```
6. Inicie o servidor de desenvolvimento:
  ```bash
   bun run dev
  ```

   Abra [http://localhost:3000](http://localhost:3000).

### Comandos úteis


| Ação                     | Comando                                 |
| ------------------------ | --------------------------------------- |
| Dev server               | `bun run dev`                           |
| Build prod               | `bun run build`                         |
| Preview prod local       | `bun run preview`                       |
| Typecheck                | `bun run typecheck`                     |
| Lint/format              | `bun run check`                         |
| Testes                   | `bun run test`                          |
| Ortografia               | `bunx cspell lint --no-progress "**/*"` |
| Docs CASA                | `scripts/docs-check`                    |
| Gerar migration          | `bun run db:generate`                   |
| Aplicar migration local  | `bun run db:local:migrate`              |
| Aplicar migration remota | `bun run db:remote:migrate`             |
| Drizzle Studio           | `bun run db:studio`                     |
| Gerar tipos do Wrangler  | `bun run cf-typegen`                    |


## Como deployar

1. Autentique o Wrangler (apenas uma vez):
  ```bash
   wrangler login
  ```
2. Crie o banco D1 remoto (apenas uma vez):
  ```bash
   wrangler d1 create registro-escolar-app-db
   # copie o `database_id` retornado para `wrangler.jsonc`
  ```
3. Aplique as migrations no D1 remoto:
  ```bash
   bun run db:remote:migrate
  ```
4. Configure o secret `BETTER_AUTH_SECRET` no Workers:
  ```bash
   wrangler secret put BETTER_AUTH_SECRET
  ```
5. Faça o deploy:
  ```bash
   bun run deploy
  ```

   Equivalente a `bun run build && wrangler deploy`.

### O que NÃO fazer

- **Não suba `.env.local` ou `.dev.vars`** — estão no `.gitignore`.
- **Não rode `bun run db:migrate` ou `bun run db:push` sem confirmar o target** — esses comandos usam `drizzle.config.ts`, que aponta para o D1 via `wrangler.jsonc`. Sempre prefira `db:local:migrate` (local) ou `db:remote:migrate` (produção) explicitamente.
- **Não use PostgreSQL/MySQL:** o schema é SQLite e o driver é D1.
- **Não altere `database_id` no `wrangler.jsonc` para valores inventados** — só preencha com o ID real retornado pelo `wrangler d1 create`.

## CI/CD

Repositório usa **GitHub Actions** (`./.github/workflows/ci.yml`).

Pipeline executada em push/PR para `main`:

1. Checkout com `fetch-depth: 0`
2. Setup do Bun (latest)
3. `bun install --frozen-lockfile`
4. `gitleaks` — detecção de secrets
5. `cspell` — spellcheck
6. `biome check` — lint/format
7. `tsc --noEmit --skipLibCheck` — typecheck
8. `bun run build` — build

## Variáveis de ambiente

Arquivos de exemplo:

- `.env.example` — variáveis do T3Env em desenvolvimento (`BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `VITE_APP_TITLE`).
- `.dev.vars.example` — secret do Better Auth para o Workers local do Wrangler.

Variáveis públicas no `wrangler.jsonc`:

```jsonc
"vars": {
  "BETTER_AUTH_URL": "http://localhost:3000"
}
```

Para produção, defina `BETTER_AUTH_URL` e `BETTER_AUTH_SECRET` via `wrangler secret put`.

## Segurança de secrets

- **Nunca commite `.env.local` ou `.dev.vars`** — ambos estão no `.gitignore`.
- **Não inclua `dist/server/.dev.vars` no commit** — o arquivo é gerado pelo build e também está ignorado.
- Em produção, use sempre `wrangler secret put BETTER_AUTH_SECRET`; nunca passe secrets via `wrangler.jsonc` ou `vars`.

## Ferramentas que NUNCA usar

- **Não use o Supabase CLI** — o banco é Cloudflare D1, não Supabase.
- **Não use `npm`/`pnpm`/`yarn` para gerenciar dependências** — o projeto usa Bun e trava o lockfile (`bun.lock`). No CI isso é obrigatório via `bun install --frozen-lockfile`.
- **Não use Docker localmente** — não há Dockerfile/compose no repo; o ambiente local roda via Vite + Wrangler dev server.

## Gotchas

- O `wrangler.jsonc` usa `main: "@tanstack/react-start/server-entry"` e o plugin `@cloudflare/vite-plugin` com environment `ssr`.
- A compatibilidade do Workers está fixada em `compatibility_date: "2025-09-02"` com flag `nodejs_compat`.
- O Drizzle config aponta para o binding `DB` do `wrangler.jsonc`; as migrations ficam em `./drizzle`.
- O Better Auth precisa de `BETTER_AUTH_SECRET` tanto em `.env.local` (dev) quanto em `.dev.vars` (Wrangler local).
- O T3Env lê `process.env` no SSR e `import.meta.env` no cliente; todas as variáveis cliente devem ter prefixo `VITE_`.
- Para adicionar componentes shadcn: `bunx shadcn@latest add <componente>`.

