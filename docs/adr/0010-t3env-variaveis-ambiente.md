---
status: proposed
date: 2026-09-08
builds-on:
  - ADR-0006
superseded-by: null
deciders: []
---

# Adota T3Env para validação e isolamento de variáveis de ambiente

## Contexto e problema

O projeto manipula variáveis sensíveis (secrets de auth) e variáveis públicas (título da aplicação). Sem validação centralizada, secrets podem vazar para o cliente e env vars podem faltar em produção.

## Direcionadores da decisão

- Type safety de variáveis de ambiente.
- Garantia de que secrets não vazam para o cliente.
- Suporte a SSR e runtime do browser no TanStack Start.
- Validação em tempo de execução com Zod.

## Opções consideradas

### Opção 1 — Acesso direto a `process.env` / `import.meta.env`

**Prós:** simples, nenhuma dependência.
**Contras:** sem validação de tipos; risco de secrets no bundle do cliente; erros só aparecem em runtime.

### Opção 2 — dotenv + interfaces TypeScript manuais

**Prós:** organização básica de env vars.
**Contras:** não valida valores; sincronização manual entre `.env.example` e código.

### Opção 3 — T3Env

**Prós:** validação com Zod, separação explícita entre server e client, prefixo `VITE_` forçado para client, erros no startup.
**Contras:** adiciona uma dependência; requer entendimento de `runtimeEnv`.

## Decisão

Adotar **@t3-oss/env-core** (T3Env) para validar e isolar variáveis de ambiente. A escolha centraliza a definição de env vars em `src/env.ts` e impede que variáveis do servidor sejam acessadas no cliente.

## Consequências

- **Positivas:** validação no startup; tipos automáticos; separação clara server/client; `emptyStringAsUndefined: true` evita valores vazios indesejados.
- **Negativas:** configuração de `runtimeEnv` precisa ser testada em SSR e cliente; erros de env podem parar o build/dev.
- **Obrigatório:** toda variável de ambiente nova deve ser declarada em `src/env.ts`.
- **Proibido:** acessar `process.env` ou `import.meta.env` diretamente fora de `src/env.ts`; expor variável server no cliente sem prefixo `VITE_` e sem declarar em `client`.

## Confirmação

```bash
grep -q "@t3-oss/env-core" package.json && grep -q "clientPrefix" src/env.ts
```

## Notas
