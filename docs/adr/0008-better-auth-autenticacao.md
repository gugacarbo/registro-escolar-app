---
status: accepted
date: 2026-09-08
builds-on:
  - ADR-0003
  - ADR-0004
  - ADR-0006
superseded-by: null
deciders: []
---

# Adota Better Auth para autenticação e sessão

## Contexto e problema

O projeto precisa de um sistema de autenticação para usuários escolares, com sessões, credenciais e integração com o banco e framework escolhidos. A escolha impacta segurança, UX e manutenção.

## Direcionadores da decisão

- Integração com TanStack Start (cookies, SSR).
- Persistência de usuários no D1 via Drizzle.
- Suporte a email/senha como método inicial.
- Extensibilidade para OAuth e roles futuras.

## Opções consideradas

### Opção 1 — Auth.js / NextAuth

**Prós:** popular, muitos providers OAuth, comunidade grande.
**Contras:** acoplado ao Next.js; integração com TanStack Start não é nativa.

### Opção 2 — Lucia

**Prós:** leve, agnóstico de framework, controle total de sessão.
**Contras:** exige mais boilerplate; não tem plugins prontos para TanStack Start.

### Opção 3 — Better Auth

**Prós:** integração nativa com TanStack Start (`tanstackStartCookies`), adapters para Drizzle/SQLite, API extensível por plugins.
**Contras:** framework mais novo que Auth.js; documentação em crescimento.

## Decisão

Adotar **Better Auth** com `drizzleAdapter` (SQLite) e plugin `tanstackStartCookies`. A escolha integra autenticação ao banco D1 e às rotas do TanStack Start, permitindo começar com email/senha e evoluir para outros métodos.

## Consequências

- **Positivas:** uma única configuração para server e client; sessão via cookie; schema de usuários gerenciado pelo adapter.
- **Negativas:** necessidade de validar `BETTER_AUTH_SECRET`; atualizações do Better Auth podem exigir ajustes de plugins.
- **Obrigatório:** toda configuração de auth deve passar por `src/lib/auth.ts` e `src/lib/auth-client.ts`; usar `authClient` no cliente.
- **Proibido:** implementar sessão manualmente sem superseder esta ADR; expor `BETTER_AUTH_SECRET` no cliente.

## Confirmação

```bash
grep -q "better-auth" package.json && \
  grep -q "drizzleAdapter" src/lib/auth.ts && \
  grep -q "tanstackStartCookies" src/lib/auth.ts
```

## Notas
