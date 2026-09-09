---
status: accepted
date: 2026-09-08
builds-on:
  - ADR-0005
superseded-by: null
deciders: []
---

# Adota TanStack Start como framework full-stack

## Contexto e problema

O projeto precisa de um framework React full-stack com SSR, file-system routing e integração nativa com o ecossistema TanStack. A escolha define a arquitetura de rotas, carregamento de dados e renderização.

## Direcionadores da decisão

- File-system routing para reduzir configuração de rotas.
- SSR/SPA flexível com React Server Components não obrigatórios.
- Integração com TanStack Query e TanStack Router.
- Suporte a deploy em Workers/Vite.

## Opções consideradas

### Opção 1 — Next.js

**Prós:** ecossistema enorme, App Router, Vercel.
**Contras:** acoplamento ao modelo de deploy da Vercel, RSC pode aumentar complexidade, menos alinhado com TanStack Query.

### Opção 2 — Remix

**Prós:** SSR sólido, loaders/actions claros, bom suporte a Workers.
**Contras:** migração para React Router v7 muda a estrutura do projeto; curva de aprendizado.

### Opção 3 — TanStack Start

**Prós:** file-system routing nativo, integração perfeita com TanStack Router/Query, SSR/SPA, projetado para Vite + Workers.
**Contras:** framework mais novo; documentação e comunidade menores que Next.js.

## Decisão

Adotar **TanStack Start** como framework full-stack. A escolha aproveita a coesão com TanStack Router e Query, reduzindo a quantidade de abstrações e mantendo o controle sobre SSR/SPA.

## Consequências

- **Positivas:** rotas em `src/routes/`, carregamento de dados via TanStack Query, SSR controlado.
- **Negativas:** menor quantidade de recursos online; evolução rápida exige acompanhamento.
- **Obrigatório:** toda rota deve ser criada em `src/routes/` seguindo a convenção de file-system routing.
- **Proibido:** usar outro framework de rotas (Next.js, Remix, React Router clássico) sem superseder esta ADR.

## Confirmação

```bash
grep -q "@tanstack/react-start" package.json && test -f src/routes/index.tsx
```

## Notas
