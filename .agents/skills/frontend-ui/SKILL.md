---
name: frontend-ui
description: Cria ou altera UI neste app (páginas, componentes, recipes) seguindo a gramática visual do design system.
---

# Skill frontend-ui

Aplicável quando a tarefa cria ou altera página, componente, recipe ou fluxo de UI. Documentação completa em `docs/context/DESIGN_SYSTEM.md`; catálogo visual no Storybook (`bun run storybook`, porta 6006). Formulários: `docs/context/CONVENTIONS.md` (RHF obrigatório).

## Workflow (nesta ordem)

1. **Identify surface** — Auth, App ou Admin (DESIGN_SYSTEM.md §1). Determina densidade e comportamento.
2. **Identify archetype** — List, Detail, Form, Dashboard, Settings, Wizard, Dialog-heavy ou Specialized (§2). Define a estrutura da tela.
3. **Storybook** — abra `Design System/*`, `UI/*`, `UI/Page`, `UI/DataTable` (`bun run storybook`). Confira o que já existe antes de escrever qualquer coisa.
4. **Recipe** — se existe recipe para o archetype, use-a e personalize só props/dados.
5. **Pattern** — componha com PageShell/PageHeader/PageToolbar/PageSection/DataTable/SearchInput etc.
6. **Component** — só crie componente novo se não há equivalente, composição não atende e o caso é genérico/repetido (§12). Destino: primitive → `ui/`, pattern → `components/`, product → `components/<domínio>/`.
7. **Primitive** — se precisar de primitive nova, escreva em `src/components/ui/` com `data-slot` e story.
8. **Behavior** — estados (empty/loading/error via Empty/LoadingFeedback/ErrorFeedback), responsividade 375/1440, dark mode via tokens.
9. **ui:check** — rode o linter de regras de UI do repo (se disponível); corrija `<h1>` manual, `<button>` cru, cores/tamanhos arbitrários.
10. **Visual review** — percorra a checklist canônica do DESIGN_SYSTEM.md §14 (alignment, spacing, hierarchy, density, typography, responsive 375/1440, overflow, states, dark mode). Visual regression Playwright é complemento, não substituto.

Regra de ouro: consultar antes de criar; compor antes de escrever; PageShell sempre; 1 primary por página.