# Design System — gramática visual

> Como criar e alterar UI neste app. Imperativo e atemporal. Formulários e
> política de reutilização → `CONVENTIONS.md`. Catálogo visual → Storybook
> (`bun run storybook`). Referências canônicas → seção final.

## 1. Surface

Todo componente/página vive em uma de três superfícies; o comportamento esperado muda por superfície:

- **Auth** (login, registro, recuperação): sem PageShell/sidebars; composição livre centrada, ritmo de animação próprio (`auth-stage`).
- **App** (área autenticada padrão): AppHeader + AppSidebar + PageShell em cada rota interna.
- **Admin** (`admin/users`): mesma base de App, densidade maior, ações administrativas explícitas (destructive consciente).

## 2. Archetypes

Identifique o archetype ANTES de escrever a tela e copie a estrutura da referência canônica:

- **List**: PageShell → PageHeader → PageToolbar (busca/filtros) → DataTable. Ex.: `admin/users`.
- **Detail**: PageShell → PageHeader → PageSection por agrupamento; sem tabela obrigatória. Ex.: `components/$id`.
- **Form**: PageShell → PageHeader → PageSection com Form* agrupando; largura contida. Ex.: `classes/enroll`.
- **Dashboard**: PageShell → PageHeader → grid de Cards de métrica/summary; zero toolbar de tabela.
- **Settings**: como List/Admin, prioriza labels descritivos e confirmação em ações sensíveis.
- **Wizard**: passos com progresso explícito; cada passo é um PageSection ou um Dialog com passos internos.
- **Dialog-heavy**: fluxos que vivem em Dialogs/Sheets (ex.: meetings); a página hospeda o gatilho e a lista; o Dialog é o palco. Use os dialogs compostos de `src/components/<domínio>/`.
- **Specialized**: templates, councils e afins — composição própria, mas reutilize patterns/primitives; só escape do layout padrão com justificativa no PR.

## 3. Layout

- **PageShell é obrigatório em toda página interna.** Ele já entrega `w-full space-y-6` e o ritmo de entrada.
- NUNCA escreva `mx-auto max-w-*` manual quando PageShell cobre. Largura default é `w-full`; se a tela pede contenção (form, wizard), contenha o conteúdo dentro (ex.: PageSection com max-width interno ou grid limitado), não o shell.
- Ritmo padrão: `space-y-6` entre blocos; PageSection já dá padding interno (`p-4 sm:p-5`).
- **PageSection** agrupa conteúdo dentro da página: use para cada bloco semântico (filtros, seção de form, painel). Não aninhe PageSection em PageSection.

## 4. Headers

- **PageHeader é obrigatório** em páginas internas: `title`, `description` opcional, `eyebrow` opcional, `actions` à direita.
- NUNCA escreva `<h1>` manual em rota interna — divergência conhecida e alvo de migração.
- No mobile o PageHeader empilha: título primeiro, actions abaixo. Não reposicione via CSS próprio.

## 5. Toolbars

- Use PageToolbar para a faixa de controles acima de listas.
- Ordem fixa dentro do toolbar: **Search → Filters → Secondary → Primary** (busca primeiro, ações primárias por último, à direita).
- Filtros usam Select/SearchableSelect/EntitySelect; busca usa SearchInput. Não invente controles novos para filtrar.

## 6. Tables

- **DataTable é o caminho padrão** para qualquer lista tabular: paginação, loading (skeletons), erro (Alert + retry) e empty (Empty) já embutidos. Passe `emptyTitle/Description/Action`, `isLoading/isError`, handlers de paginação.
- NÃO use tabela quando: a lista é de cards/mosaico; há menos de ~2 colunas de dados úteis; a navegação é o conteúdo em si (use Cards ou lista simples); os dados cabem em um resumo (use Cards de métrica).
- Não recrie loading/empty/erro por fora do DataTable.

## 7. Forms

- **react-hook-form é obrigatório** (regra e detalhes em `CONVENTIONS.md` — Form*, Field*, zodResolver).
- Agrupe os campos com PageSection (title/description por grupo) e Field/FieldGroup; largura contida, sem ocupar o `w-full` todo em forms simples.
- Labels, ajuda e erro sempre via FieldLabel/FieldDescription/FieldError.
- Ordem das ações: **Cancelar antes de Salvar** (Cancelar à esquerda, variante outline/ghost; Salvar é o único primary do form). Em dialogs, idem.

## 8. Cards

- **USE Card para**: agrupamento semântico real (um resumo, uma métrica, um bloco de conteúdo coeso), dashboards de summary.
- **DO NOT USE Card para**: decoração; "dar borda" em qualquer bloco; envolver toolbars (existe PageToolbar); envolver seções de formulário (existe PageSection); empilhar cards onde um PageSection resolve.
- Se você está colocando Card para o bloco "parecer bonito", é DO NOT.

## 9. Actions

- **1 botão primary por página** (ou por Dialog). Todo o resto: secondary, outline, ghost ou link.
- **destructive NÃO compete com primary**: a ação destrutiva usa variante destructive e é sempre precedida de confirmação (Cancelar é o default); destructive nunca é o único botão da tela.
- Ícones em botões só quando ajudam; texto sempre presente.

## 10. Empty / loading / error

- **Sempre** os componentes prontos: Empty (+EmptyHeader/EmptyMedia/EmptyTitle/EmptyDescription/EmptyContent), LoadingFeedback, ErrorFeedback, StatusFeedback. Nunca improvise spinner/texto próprios.
- Em DataTable, alimente as props de empty/error/loading — não sobreponha com estado próprio.
- Empty oferece ação de saída (criar o primeiro item, limpar filtro).

## 11. Responsividade

- Breakpoints do app: `sm:` e `md:` (e `lg:` para navegação). Teste em 375px e 1440px.
- Em 375px: toolbars colapsam (empilham), formulários ficam em 1 coluna, PageHeader empilha, grids de cards caem para 1–2 colunas.
- Tabelas: sempre com `overflow-x` disponível — nunca esconda colunas com CSS por conta própria; reavalie colunas se não couber.
- Dialogs/Sheets: prefira Sheet no mobile quando o conteúdo for largo.

## 12. Política de novos componentes

Destinos, em ordem de preferência:

- **Primitive** (genérico, sem domínio) → `src/components/ui/`.
- **Pattern** (composição reutilizável entre domínios) → `src/components/` raiz (ex.: `data-table.tsx`, `search-input.tsx`).
- **Product** (específico de um domínio) → `src/components/<domínio>/` (ex.: `src/components/meetings/`).
- **Recipe** (receita de composição de página) → segue o padrão de recipes existente no repo.

**Só crie um componente novo se**: (1) não há equivalente no catálogo (consulte o Storybook), (2) composição dos existentes não atende, (3) o caso é genérico ou repetido. Se as três falham, componha.

Antes de criar: 1) confira no Storybook (Foundations, UI/*, UI/Page, UI/DataTable, Compositions); 2) confira esta gramática; 3) só então escreva, com `data-slot` e story quando for primitive/pattern.

## 13. className não é escape hatch primário

- `className` serve para ajuste fino pontual (largura, margem local) — NÃO para redefinir recipes/patterns.
- Se você está sobrescrevendo o visual de um pattern via `className` em muitos lugares, o que falta é um variant ou um componente novo — não mais classes.
- Proibido: cores hex/rgb arbitrárias fora dos tokens (use os tokens oklch do tema, incluindo `.dark`); tamanhos arbitrários `w-[]/h-[]/p-[]/gap-[]/space-y-[]` por conveniência — prefira a escala padrão.

## 14. Visual review

Duas coisas distintas:

- **Visual quality review** (agente/humano, checklist abaixo): olhar a tela renderizada e julgar qualidade. Obrigatório em toda mudança de UI.
- **Visual regression** (Playwright, `e2e/visual/`): baselines automáticos; complementa, não substitui o review.

Checklist canônica do visual review:

- [ ] Alignment (eixos e bordas coerentes)
- [ ] Spacing (ritmo `space-y-6`; padding dos patterns respeitado)
- [ ] Hierarchy (1 primary por página; títulos via PageHeader/PageSection)
- [ ] Density (não aperta nem infla; densidade coerente com a Surface)
- [ ] Typography (font-display nos títulos dos patterns; sem tamanhos arbitrários)
- [ ] Responsive: 375px e 1440px (empilhar, colapsar toolbars, overflow de tabela)
- [ ] Overflow (nada cortado; scroll correto)
- [ ] States (empty, loading, error, hover/focus visíveis)
- [ ] Dark mode (tokens; nada de cor hardcode que quebre `.dark`)

## 15. Golden references

Telas canônicas — copie a estrutura, não o conteúdo:

| Rota | Archetype | Componentes-chave | Por que é canônica |
| --- | --- | --- | --- |
| `#/admin/users` (`admin/users.tsx`) | List / Admin | PageShell, PageHeader, PageToolbar, SearchInput, DataTable | ListPage completa: busca + filtros + tabela + estados |
| `#/minutes` (`minutes/index.tsx`) | List | PageShell, PageHeader, PageToolbar, filtros Select, DataTable | List com filtros múltiplos bem ordenados |
| `#/components` e `#/components/$id` (`components/index.tsx`, `components/$id.tsx`) | List + Detail | PageShell, PageHeader/PageSection, DataTable | Par List→Detail navegável; composição limpa de seções |
| `#/classes/enroll` (`classes/enroll.tsx`) | Form | PageShell, PageHeader, PageSection, RHF + Field*, EntitySelect | Form com patterns, RHF e confirmação |
| `#/meetings` (`meetings/index.tsx`) | Dialog-heavy | PageShell, PageHeader, PageToolbar, DataTable, dialogs de domínio | Página hospedando dialogs de domínio |