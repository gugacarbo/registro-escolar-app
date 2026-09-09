---
status: accepted
date: 2026-09-08
builds-on:
  - ADR-0006
superseded-by: null
deciders: []
---

# Adota Tailwind CSS v4 e shadcn/ui para estilização e componentes

## Contexto e problema

O projeto precisa de uma estratégia de UI consistente, acessível e produtiva. A escolha impacta a velocidade de implementação de telas, a manutenção do design system e a experiência do usuário.

## Direcionadores da decisão

- Estilização utilitária rápida sem sair do TSX/JSX.
- Biblioteca de componentes acessíveis e customizáveis.
- Consistência visual entre formulários, tabelas e navegação.
- Pouca dependência de runtime.

## Opções consideradas

### Opção 1 — CSS Modules + componentes próprios

**Prós:** controle total, nenhuma dependência de UI.
**Contras:** alto esforço inicial para acessibilidade, animações e consistência.

### Opção 2 — Material UI / Chakra UI

**Prós:** componentes prontos, temas integrados.
**Contras:** bundle maior, estilização mais opinada, possível conflito com Tailwind.

### Opção 3 — Tailwind CSS v4 + shadcn/ui

**Prós:** utilitários rápidos, componentes copiáveis/customizáveis, integração com Vite, estilo “New York” moderno.
**Contras:** Tailwind v4 ainda é recente; shadcn/ui exige instalação manual por componente.

## Decisão

Adotar **Tailwind CSS v4** com **shadcn/ui** no estilo “New York”. A escolha fornece componentes base acessíveis em `src/components/ui/` enquanto mantém a flexibilidade de customização via Tailwind.

## Consequências

- **Positivas:** catálogo de componentes base pronto; estilização consistente; integração com Vite via `@tailwindcss/vite`.
- **Negativas:** Tailwind v4 pode exigir ajustes em configurações legadas; componentes shadcn precisam ser adicionados explicitamente.
- **Obrigatório:** novos componentes genéricos devem ser adicionados via `bunx shadcn@latest add <componente>` quando possível; reutilizar componentes de `src/components/ui/` antes de recriar.
- **Proibido:** duplicar componentes já existentes em `src/components/ui/`; usar outro framework de UI sem superseder esta ADR.

## Confirmação

```bash
grep -q "tailwindcss" package.json && test -d src/components/ui && ls src/components/ui/ | grep -q button
```

## Notas
