---
status: accepted
date: 2026-09-08
builds-on:
  - ADR-0001
  - ADR-0007
superseded-by: null
deciders: []
---

# Adota Vite com Cloudflare Vite plugin como pipeline de build

## Contexto e problema

O projeto precisa de uma ferramenta de build moderna que suporte SSR, HMR rápido e integração com a runtime de Workers. A escolha impacta a experiência de desenvolvimento e o formato do bundle de produção.

## Direcionadores da decisão

- HMR rápido durante o desenvolvimento.
- Suporte nativo a SSR com TanStack Start.
- Integração com Cloudflare Workers sem emulação manual.
- Configuração mínima e extensível.

## Opções consideradas

### Opção 1 — Webpack

**Prós:** ecossistema maduro, altamente configurável.
**Contras:** configuração verbosa, HMR mais lento, menos integração com frameworks modernos.

### Opção 2 — Vite padrão

**Prós:** HMR rápido, ESM nativo, SSR via plugin.
**Contras:** requer adaptação manual para emular bindings do Workers (D1, KV, secrets) localmente.

### Opção 3 — Vite + @cloudflare/vite-plugin

**Prós:** HMR nativo do Vite, emulação real dos bindings do Workers durante o dev, build otimizado para `wrangler deploy`.
**Contras:** plugin ainda evolui; algumas combinações de plugins podem exigir ajustes de ordem.

## Decisão

Adotar **Vite 8** com o plugin oficial `@cloudflare/vite-plugin` configurado com environment `ssr`. A escolha mantém a DX do Vite e usa a emulação real do Workers para bindings como D1.

## Consequências

- **Positivas:** dev server realista; build otimizado para Workers; HMR rápido.
- **Negativas:** compatibilidade de plugins precisa ser validada a cada atualização.
- **Obrigatório:** build deve ser executado com `bun run build`; preview com `bun run preview`.
- **Proibido:** alterar `vite.config.ts` sem validar `bun run build` e `bun run preview`; usar outro bundler sem superseder esta ADR.

## Confirmação

```bash
bun run build
```

## Notas
