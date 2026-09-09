---
status: proposed
date: 2026-09-08
builds-on:
  - ADR-0003
superseded-by: null
deciders: []
---

# Adota Drizzle ORM como camada de acesso a dados

## Contexto e problema

O projeto precisa de uma camada de acesso ao banco type-safe, próxima ao SQL e que facilite a manutenção de schemas e migrations. A escolha impacta a produtividade do time e a consistência entre banco, APIs e formulários.

## Direcionadores da decisão

- Type safety entre schema e código.
- Geração automática de migrations.
- Schema derivado para validação e contratos de API.
- Facilidade de leitura para quem conhece SQL.

## Opções consideradas

### Opção 1 — Prisma

**Prós:** DX excelente, geração automática de cliente, ecossistema grande.
**Contras:** engine binário adiciona complexidade no Workers; menos transparente no SQL gerado.

### Opção 2 — Knex.js

**Prós:** query builder maduro, SQL explícito.
**Contras:** não gera types automaticamente; migrations e schema carecem de validação integrada.

### Opção 3 — Drizzle ORM

**Prós:** SQL-like type-safe, schema como código TypeScript, integração nativa com D1, geração de migrations via Drizzle Kit.
**Contras:** ecossistema de plugins menor que Prisma; algumas abstrações exigem SQL manual.

## Decisão

Adotar **Drizzle ORM** com **Drizzle Kit** para schema, queries e migrations. A escolha aproveita a integração com D1 e permite derivar schemas de validação a partir do próprio schema do banco.

## Consequências

- **Positivas:** um único schema de tabelas alimenta banco, validação e types; migrations geradas automaticamente.
- **Negativas:** necessidade de conhecimento de SQL; menos abstração que ORMs tradicionais.
- **Obrigatório:** todo schema de banco deve ser definido em `src/db/schema.ts`; toda migration deve ser gerada pelo Drizzle Kit com `--name` descritivo e nomeado explicitamente (não é permitido nome gerado automaticamente).
- **Proibido:** escrever migrations manualmente; declarar interfaces/types paralelos para entidades persistidas quando já existirem derivados do Drizzle.

## Confirmação

```bash
bun run db:generate -- --name=verifica-drizzle-kit 2>/dev/null; ls drizzle/*.sql 1>/dev/null 2>/dev/null
bun run db:migrate -- --name=migration-inicial
```

## Notas

A nomenclatura explícita é garantida pelos scripts `db:generate` e `db:migrate`, que validam a presença do parâmetro `--name`.
