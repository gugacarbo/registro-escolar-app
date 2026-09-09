---
status: proposed
date: 2026-09-08
builds-on: []
superseded-by: null
deciders: []
---

# Adota Cloudflare Workers como runtime de deploy

## Contexto e problema

O projeto precisa de uma plataforma de execução serverless no edge, com baixa latência global e integração nativa com banco e armazenamento. A escolha define onde e como a aplicação roda em produção.

## Direcionadores da decisão

- Deploy global no edge.
- Baixo custo para tráfego moderado.
- Suporte a Node.js compat e Vite SSR.
- Integração nativa com D1 para dados relacionais.

## Opções consideradas

### Opção 1 — Vercel

**Prós:** DX excelente, deploy automático, preview branches.
**Contras:** otimizado para Next.js; menos integração com D1/TanStack Start; funções serverless com cold start.

### Opção 2 — Node.js tradicional em VPS/containers

**Prós:** controle total, ecossistema maduro.
**Contras:** sobrecarga operacional, escalabilidade manual, perde os benefícios de edge.

### Opção 3 — Cloudflare Workers

**Prós:** edge nativo, bindings para D1/KV/R2, compatibilidade com Node.js via flag, deploy via Wrangler.
**Contras:** cold start diferente de VPS; restrições de runtime (no filesystem, timers etc.).

## Decisão

Adotar **Cloudflare Workers** como runtime de produção. A escolha alinha o deploy ao edge com o banco D1 e o build via Vite + Cloudflare plugin, formando uma stack coesa.

## Consequências

- **Positivas:** deploy global; integração nativa com D1; observabilidade e source maps habilitados.
- **Negativas:** restrições de runtime exigem testes contínuos; alguns pacotes Node.js precisam de `nodejs_compat`.
- **Obrigatório:** toda deploy deve ser feita via `bun run deploy`/`wrangler deploy`; `wrangler.jsonc` é a fonte da verdade.
- **Proibido:** fazer deploy em outra plataforma sem ADR que supersedes esta; subir secrets em repositório.

## Confirmação

```bash
grep -q '"main": "@tanstack/react-start/server-entry"' wrangler.jsonc && \
  grep -q 'compatibility_date' wrangler.jsonc
```

## Notas
