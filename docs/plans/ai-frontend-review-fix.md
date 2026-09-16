Você vai trabalhar no repositório:

[https://github.com/gugacarbo/registro-escolar-app](https://github.com/gugacarbo/registro-escolar-app)

Seu objetivo é transformar o frontend atual em um **design system canônico, descobrível, executável e verificável por agentes de IA**, reduzindo drasticamente a liberdade de agentes para inventarem componentes, layouts, espaçamentos, hierarquias e padrões visuais novos quando já existe uma solução aprovada no projeto.

Este NÃO é um trabalho para redesenhar todo o frontend.

Este NÃO é um trabalho para substituir shadcn.

Este NÃO é um trabalho para reescrever componentes existentes apenas por preferência estética.

Este é um trabalho para transformar o que já existe no projeto em uma linguagem visual explícita e obrigatória para humanos e agentes.

# Problema que precisa ser resolvido

O projeto já possui:

- shadcn/ui;
- Tailwind;
- tokens visuais;
- Storybook;
- testes unitários;
- testes E2E;
- testes visuais com Playwright;
- componentes reutilizáveis;
- `PageShell`;
- `PageHeader`;
- `PageToolbar`;
- `PageSection`;
- `DataTable`;
- convenções dizendo para reutilizar componentes;
- [`AGENTS.md`](http://AGENTS.md);
- `docs/context/[CONVENTIONS.md](http://CONVENTIONS.md)`;
- `docs/context/[TESTS.md](http://TESTS.md)`.

Mesmo assim, agentes de IA ainda:

- recriam componentes existentes;
- inventam layouts novos;
- usam espaçamentos arbitrários;
- geram telas visualmente inconsistentes;
- desalinhavam elementos;
- criam headers e toolbars manualmente;
- usam estruturas distintas para problemas equivalentes;
- colocam `Card` em lugares arbitrários;
- criam formulários com larguras, grids e espaçamentos inconsistentes;
- escolhem livremente classes Tailwind locais;
- implementam algo funcional, mas visualmente fraco;
- tratam testes visuais como prova de qualidade visual.

O problema fundamental é:

```text
o projeto possui COMPONENTES
mas ainda não possui uma GRAMÁTICA VISUAL suficientemente forte

```

Hoje existe aproximadamente:

```text
Foundations
    ↓
Primitives
    ↓
alguns Patterns
    ↓
Product Pages

```

O objetivo final deve ser:

```text
Foundations
    ↓
Primitives
    ↓
Patterns
    ↓
Page Recipes
    ↓
Product Pages

```

Com agentes tendo o menor número possível de decisões visuais livres.

# Princípio fundamental

Quando um agente recebe:

> crie uma tela de usuários

o fluxo NÃO deve ser:

```text
procurar Button
procurar Input
procurar Card
inventar layout
inventar header
inventar toolbar
inventar espaçamentos
inventar empty state
inventar estrutura responsiva

```

O fluxo desejado é:

```text
identificar superfície
        ↓
identificar archetype da página
        ↓
consultar catálogo/design system
        ↓
usar recipe existente
        ↓
usar patterns existentes
        ↓
usar componentes existentes
        ↓
implementar apenas comportamento específico

```

Exemplo:

```text
"lista administrativa de usuários"

        ↓

Surface: App/Admin
Archetype: ListPage

        ↓

PageShell
PageHeader
PageToolbar
SearchInput
DataTable
EmptyState
ActionGroup

        ↓

implementar domínio de usuários

```

# Regra de ouro

**Reuse first. Compose second. Extend third. Create last.**

Antes de criar qualquer componente visual novo, o agente deve conseguir demonstrar que procurou:

1. recipe existente;
2. pattern existente;
3. componente compartilhado existente;
4. primitive existente;
5. story relevante no Storybook.

Somente depois disso pode criar algo novo.

---

# MODO DE EXECUÇÃO: USE SUBAGENTS EM PARALELO

Você é o agente ORQUESTRADOR.

Não implemente todo o trabalho sequencialmente sozinho se subagents estiverem disponíveis.

Divida o trabalho em frentes independentes e execute-as em paralelo.

## Regra de isolamento

Subagents que modificam código DEVEM trabalhar em:

```text
branch própria
+
Git worktree própria

```

Nunca permita dois agentes independentes escrevendo na mesma worktree.

Modelo:

```text
repo principal
│
├── ../registro-ds-storybook
│      branch: agent/ds-storybook
│
├── ../registro-ds-recipes
│      branch: agent/ds-recipes
│
├── ../registro-ds-enforcement
│      branch: agent/ds-enforcement
│
├── ../registro-ds-docs
│      branch: agent/ds-docs
│
└── ../registro-ds-audit
       branch: agent/ds-audit

```

O agente orquestrador é responsável pela integração.

## Estado externo compartilhado

Worktrees isolam Git, mas NÃO necessariamente:

- portas;
- Storybook;
- Vite;
- Playwright;
- banco;
- Cloudflare local;
- `.wrangler`;
- artefatos temporários.

Portanto:

- evite subir vários servidores usando a mesma porta;
- serialize validações E2E/visuais que dependam da mesma infraestrutura;
- não permita migrations concorrentes;
- não permita que agentes alterem baselines de screenshots simultaneamente;
- não rode comandos destrutivos em estado compartilhado.

## Comandos Git proibidos sem necessidade explícita

Subagents NÃO devem executar indiscriminadamente:

```bash
git reset --hard
git clean -fd
git restore .
git checkout -- .
git stash
git add .
git commit --amend
git rebase

```

Prefira alterações estritamente no write-set de cada tarefa.

## Formatação

Não permita:

```bash
biome check --write .
prettier --write .

```

como parte de uma tarefa localizada.

Formate apenas arquivos alterados quando possível.

---

# FASE 0 — AUDITORIA OBRIGATÓRIA

Antes de modificar código, o ORQUESTRADOR deve analisar o estado real atual do repositório.

Leia obrigatoriamente:

```text
AGENTS.md
docs/context/CONVENTIONS.md
docs/context/TESTS.md
package.json
components.json
src/styles.css
.storybook/main.ts
.storybook/preview.tsx

```

Examine:

```text
src/components/ui/
src/components/
src/routes/_app/
e2e/visual/

```

Leia especificamente:

```text
src/components/ui/page.tsx
src/components/data-table.tsx
src/components/app-header.tsx
src/components/app-sidebar.tsx

```

Examine também:

```text
docs/plans/uiux-auditoria-2026-09.md
docs/plans/complete-ui-specs.md

```

Faça buscas por:

```text
PageShell
PageHeader
PageToolbar
PageSection
DataTable
<Card
<h1
<input
<button
className=
.stories.tsx

```

Não assuma que a estrutura descrita neste prompt continua exatamente igual.

O repositório é a fonte da verdade.

Se alguma recomendação deste prompt já estiver implementada, valide-a e não replique.

---

# FASE 1 — MAPEAR O DESIGN SYSTEM EXISTENTE

Delegue um subagent de AUDITORIA/DISCOVERY somente leitura.

Ele deve produzir um inventário estruturado.

## Foundations

Mapeie:

- cores;
- tipografia;
- radius;
- sombras;
- backgrounds;
- dark mode;
- espaçamentos recorrentes;
- larguras recorrentes;
- breakpoints usados;
- animações;
- estados de foco.

## Primitives

Mapeie `src/components/ui/`.

Classifique componentes por função:

```text
actions
inputs
selection
feedback
navigation
overlays
layout
data display
forms

```

## Patterns

Procure componentes como:

```text
PageShell
PageHeader
PageToolbar
PageSection
DataTable
SearchInput
EntitySelect
SearchableSelect
StatusFeedback
Empty
Form wrappers
dialogs compostos

```

## Product components

Mapeie componentes específicos em:

```text
src/components/students
src/components/classes
src/components/staff
src/components/meetings
src/components/minutes
src/components/admin-users
...

```

## Page archetypes existentes

Examine rotas reais e classifique-as como:

```text
List
Detail
Form/Create
Dashboard
Settings
Wizard
Workflow
Dialog-heavy
Specialized

```

Identifique as melhores telas atuais como referências canônicas.

Não escolha pelo domínio.

Escolha pela qualidade da composição.

---

# FASE 2 — STORYBOOK COMO CATÁLOGO CANÔNICO

Delegue esta frente para um subagent especializado.

Objetivo:

> Storybook deve deixar de ser apenas uma ferramenta instalada e virar o catálogo oficial das peças e composições permitidas.

Hoje não basta ter stories esparsas.

Crie cobertura prioritariamente para elementos que definem o visual do produto.

## Não crie stories indiscriminadamente

Não é necessário começar documentando cada wrapper trivial do shadcn.

Priorize componentes com alto valor para agentes.

## Foundations

Crie documentação/stories apropriadas para:

```text
Design System / Foundations / Colors
Design System / Foundations / Typography
Design System / Foundations / Spacing
Design System / Foundations / Radius
Design System / Foundations / Layout

```

Os stories devem mostrar o sistema REAL do projeto.

Não invente nova identidade visual.

## Primitives prioritários

Documente pelo menos os componentes importantes para composição:

```text
Button
Input
Textarea
Select
SearchInput
EntitySelect
SearchableSelect
Badge
Card
Dialog
Alert
Empty
Form

```

## Patterns prioritários

Crie stories detalhadas para:

```text
PageShell
PageHeader
PageToolbar
PageSection
DataTable

```

E quaisquer outros patterns identificados na auditoria.

Mostre diferentes estados relevantes:

```text
default
com descrição
com ações
loading
error
empty
long content
mobile/narrow quando aplicável

```

## Stories de composição

Stories não devem mostrar somente componentes isolados.

Crie exemplos que demonstrem:

```text
PageHeader + PageToolbar + DataTable

PageHeader + PageSection + Form

PageHeader + sections de DetailPage

Toolbar com SearchInput + filters + actions

```

O agente deve conseguir olhar para o Storybook e aprender como montar páginas.

---

# FASE 3 — STORYBOOK ORIENTADO A AGENTES

Configure o Storybook para ser consumível por agentes através dos recursos oficiais disponíveis na versão atual instalada.

Investigue a versão real do Storybook no projeto antes de alterar configuração.

Objetivos:

```text
Storybook
   ↓
manifest/documentação estruturada
   ↓
MCP ou interface oficial equivalente
   ↓
agente consegue descobrir componentes/stories

```

Se a versão instalada oferecer suporte oficial a:

```text
components manifest
MCP
docs estruturadas
test runner

```

configure corretamente.

NÃO invente APIs ou configuração baseada em versões antigas.

Consulte a documentação correspondente à versão realmente instalada caso necessário.

## [AGENTS.md](http://AGENTS.md)

Adicione uma regra curta e de alto ROI indicando que qualquer alteração significativa de UI deve:

```text
1. identificar o archetype da tela;
2. consultar o design system/Storybook;
3. procurar recipe;
4. procurar pattern;
5. procurar componente existente;
6. criar somente quando necessário.

```

Não transforme [`AGENTS.md`](http://AGENTS.md) em um livro.

Detalhes devem ficar em documentação lazy-load.

---

# FASE 4 — CRIAR A GRAMÁTICA VISUAL

Delegue esta frente para outro subagent.

Crie algo como:

```text
docs/context/DESIGN_SYSTEM.md

```

ou estrutura equivalente adequada ao padrão CASA já usado no repositório.

Adicione ponteiro no [`AGENTS.md`](http://AGENTS.md).

Esse documento deve ser IMPERATIVO e ATEMPORAL.

Evite explicações abstratas.

Defina regras operacionais.

## Surface

Toda implementação deve primeiro identificar em qual superfície ocorre:

```text
Auth
App
Admin
Workflow especial

```

Adapte às superfícies realmente existentes.

## Archetypes

Toda nova tela deve ser classificada primeiro:

```text
List
Detail
Form
Dashboard
Settings
Wizard
Workflow

```

Se surgir outro archetype real, documente.

## Layout

Defina:

- quando usar `PageShell`;
- largura default;
- quando página é narrow;
- quando pode ser wide/full;
- padding padrão;
- comportamento mobile;
- alinhamento horizontal;
- ritmo vertical;
- quando usar `PageSection`.

Não espalhe números mágicos novos se os patterns puderem encapsular isso.

## Headers

Defina que páginas internas devem preferir `PageHeader`.

Descreva:

- posição de título;
- descrição;
- eyebrow;
- ação primária;
- ações secundárias;
- comportamento mobile.

## Toolbars

Defina:

```text
Search
Filters
Secondary actions
Primary bulk actions

```

e sua ordem padrão.

## Tables

`DataTable` deve ser o caminho padrão para listas tabulares do produto.

Documente quando NÃO usar tabela.

## Forms

Defina:

- largura;
- grid;
- espaçamento;
- agrupamento;
- labels;
- ajuda;
- mensagens de erro;
- posição das ações;
- ordem Cancelar/Salvar;
- comportamento mobile.

Continue respeitando as regras existentes de React Hook Form.

## Cards

Crie regras explícitas para `Card`.

Cards NÃO devem ser usados como decoração automática.

Exemplos:

```text
USE Card:
agrupamento semântico
summary block
dashboard metric
conteúdo realmente independente

DO NOT USE Card:
cada seção de formulário
cada pedaço de texto
cada toolbar
cada área simplesmente para gerar bordas

```

## Actions

Defina hierarquia:

```text
primary
secondary
outline
ghost
destructive

```

Evite uma página com múltiplas ações competindo visualmente como primárias.

## Density

Defina convenções para:

```text
compact
default
comfortable

```

somente se necessário.

## Empty/loading/error

Não permita implementações improvisadas para esses estados quando já houver patterns existentes.

## Responsividade

Especifique regras claras:

- empilhamento;
- toolbars;
- grupos de ações;
- tabelas;
- tabs;
- formulários;
- conteúdo overflow.

---

# FASE 5 — PAGE RECIPES

Esta é uma das partes mais importantes do projeto.

Delegue para um subagent especializado em composição.

Precisamos passar de:

```text
primitives

```

para:

```text
recipes

```

Crie recipes reais, preferencialmente compostas com os patterns existentes.

A API exata deve ser decidida depois de examinar a codebase.

NÃO crie abstrações gigantes.

## ListPage

Deve representar aproximadamente:

```text
PageShell
├── PageHeader
│   ├── title
│   ├── description
│   └── actions
│
├── PageToolbar
│   ├── search
│   ├── filters
│   └── secondary actions
│
└── content
    └── DataTable

```

Pode ser um componente, pattern documentado ou composição tipada.

Escolha a menor abstração útil.

## DetailPage

Estrutura aproximadamente:

```text
PageShell
├── navigation/back
├── PageHeader
│   ├── status
│   └── actions
├── summary
└── sections/tabs

```

## FormPage

Estrutura:

```text
PageShell narrow
├── navigation/back
├── PageHeader
└── form content
    ├── fields/sections
    └── actions

```

## DashboardPage

Estrutura consistente para:

```text
header
summary
metrics
primary content
secondary content

```

## WizardPage

Se há fluxos multi-step reais, crie recipe específica.

## Regra importante

Recipes devem reduzir liberdade.

Evite componentes que apenas repassem:

```tsx
className
children

```

e continuem deixando todas as decisões para o consumidor.

Ao mesmo tempo, NÃO construa um framework interno gigantesco.

Busque abstrações de alto ROI.

---

# FASE 6 — COMPONENTES SEMÂNTICOS DE LAYOUT

Durante a implementação das recipes, avalie criar componentes semânticos onde eles eliminarem decisões repetitivas.

Exemplos possíveis:

```text
PageContent
FormLayout
FormSection
ActionGroup
FilterBar
DetailSection

```

Mas somente crie quando houver evidência de repetição.

Não crie abstrações especulativas.

## Possível API

Exemplo conceitual:

```tsx
<PageContent width="narrow">

```

em vez de agentes escolhendo repetidamente:

```tsx
className="mx-auto max-w-2xl ..."

```

Exemplo:

```tsx
<ActionGroup>

```

em vez de cada rota escolher:

```text
flex
gap
wrap
justify
mobile behavior

```

Prefira APIs semânticas a números mágicos.

---

# FASE 7 — ENFORCEMENT AUTOMÁTICO

Delegue a outro subagent.

Crie:

```bash
bun run ui:check

```

ou nome coerente com os scripts existentes.

Objetivo:

> convenções visuais importantes não podem depender apenas do agente lembrar delas.

## Comece simples

Não construa inicialmente um compilador de design system.

Um script TypeScript com AST ou análise estrutural é suficiente.

## Regras candidatas

Analise a codebase antes de ativar cada regra.

Evite falsos positivos.

Detecte quando fizer sentido:

### HTML cru

Fora de allowlists conhecidos:

```text
<button>
<select>
<textarea>
input de tipos em que já existe abstraction adequada

```

Não bloqueie elementos legítimos como file input oculto quando necessário.

### Imports incorretos

Impedir imports diretos de primitives de bibliotecas internas quando deveriam passar por:

```text
src/components/ui/

```

Por exemplo, Base UI/Radix diretamente em feature/routes, se isso contrariar a arquitetura atual.

### Tokens visuais

Detectar:

```text
hex arbitrário
rgb arbitrário
cores Tailwind arbitrárias que escapem dos tokens

```

quando não forem casos legítimos.

### Page structure

Quando tecnicamente confiável, detectar páginas internas que ignoram recipes/patterns aprovados.

Não faça heurística frágil apenas para cumprir checklist.

### Duplicação conhecida

Detectar componentes locais com nomes/estrutura conflitantes com primitives existentes quando possível.

### Arbitrary values

Auditar uso de coisas como:

```text
w-[...]
h-[...]
p-[...]
gap-[...]
text-[...]
shadow-[...]

```

Não necessariamente bloqueie todos.

Classifique:

```text
permitido
warning
erro

```

conforme risco.

## Output

`ui:check` deve emitir mensagens úteis para agentes.

RUIM:

```text
Error 17

```

BOM:

```text
src/routes/_app/foo.tsx:42

UI001: botão HTML cru encontrado.

Use:
#/components/ui/button

Se Button não atender ao caso, documente a exceção ou crie uma
variante no design system em vez de duplicar a implementação.

```

O linter deve ensinar o caminho correto.

---

# FASE 8 — INTEGRAR NO DEFINITION OF DONE

Adicione `ui:check` ao fluxo apropriado do repositório.

Avalie:

```text
pre-push
CI
bun run check

```

Escolha a opção consistente com a arquitetura atual.

O resultado esperado deve incluir:

```bash
bun run check
bun run typecheck
bun run test
bun run ui:check
bun run build-storybook

```

Não torne pre-commit excessivamente lento.

E2E/visual provavelmente devem permanecer em estágio mais caro.

---

# FASE 9 — SKILL LOCAL DE FRONTEND PARA AGENTES

Verifique primeiro como skills locais são estruturadas neste repositório/ecossistema.

Se compatível, crie uma skill dedicada, por exemplo:

```text
.agents/skills/frontend-ui/
├── SKILL.md
└── references/
    ├── foundations.md
    ├── components.md
    ├── patterns.md
    ├── page-recipes.md
    └── visual-review.md

```

Adapte ao formato realmente suportado.

O arquivo inicial deve ser curto.

Não duplique toda a documentação nele.

Ele deve instruir o agente a carregar referências somente conforme necessário.

## Workflow obrigatório da skill

```text
1. identify surface

2. identify page archetype

3. inspect relevant Storybook/design-system entries

4. search for page recipe

5. search for pattern

6. search for product/shared component

7. search for primitive

8. implement behavior

9. run ui:check

10. perform visual review

```

---

# FASE 10 — VISUAL REVIEW COMO ETAPA SEPARADA

Snapshots NÃO medem qualidade visual.

Eles apenas detectam mudanças.

Portanto, introduza explicitamente dois conceitos:

```text
visual quality review

```

e:

```text
visual regression test

```

Não trate os dois como equivalentes.

## Fluxo correto

```text
implementação
      ↓
render real
      ↓
visual quality review
      ↓
correções
      ↓
baseline aprovada
      ↓
visual regression daqui em diante

```

## Visual Review Checklist

Crie uma checklist canônica para humanos/agentes.

Ela deve incluir pelo menos:

### Alignment

- títulos alinhados;
- inputs alinhados;
- labels alinhadas;
- ações coerentes;
- elementos relacionados compartilham eixos.

### Spacing

- ritmo vertical consistente;
- ausência de gaps arbitrários;
- ausência de áreas excessivamente vazias;
- grupos semanticamente relacionados visualmente próximos.

### Hierarchy

- apenas uma ação principal dominante quando apropriado;
- título claramente dominante;
- descrição subordinada;
- ações destrutivas não competem visualmente.

### Density

- tabela não excessivamente espaçada;
- formulários não comprimidos;
- dashboards não são mural de cards sem necessidade.

### Typography

- titles;
- section titles;
- body;
- labels;
- metadata;
- muted content.

### Responsiveness

Verificar pelo menos:

```text
mobile
desktop

```

e, se necessário, largura intermediária.

### Overflow

- tabs;
- tables;
- toolbars;
- buttons;
- long names;
- dialogs.

### States

- loading;
- empty;
- error;
- disabled;
- validation;
- destructive confirmation.

### Dark mode

Quando o componente/tela usar os tokens globais, valide dark mode.

---

# FASE 11 — SUBAGENT DE VISUAL QA

Use um subagent independente do implementador para revisão visual.

Ele NÃO deve começar alterando código.

Primeiro deve produzir achados.

Fluxo:

```text
Implementer
      ↓
UI pronta
      ↓
Visual QA agent
      ↓
screenshots/runtime
      ↓
checklist
      ↓
issues estruturados
      ↓
implementer corrige

```

Formato esperado de issue:

```text
[HIGH] Toolbar desalinhada em 375px

Arquivo:
src/...

Problema:
O grupo de filtros possui largura fixa e força overflow horizontal.

Referência:
ListPage / PageToolbar

Correção sugerida:
usar comportamento responsivo padrão da toolbar.

Evidência:
viewport 375px

```

Evite comentários vagos como:

```text
"está meio feio"

```

---

# FASE 12 — MELHORAR TESTES VISUAIS

Não remova os testes Playwright existentes.

Eles continuam valiosos.

Mas deixe clara sua responsabilidade.

## Testes visuais devem proteger

```text
baseline aprovada
layout
regressões
overflow
responsive states
dark mode quando relevante

```

## Não devem ser considerados prova automática de

```text
boa composição
bom gosto
hierarquia correta
consistência com outras páginas
UX correta

```

## Cobertura representativa

Não crie centenas de screenshots redundantes.

Escolha estados relevantes.

Exemplo para ListPage:

```text
desktop populated
mobile populated
empty

```

Se dark mode tiver risco significativo:

```text
desktop dark

```

---

# FASE 13 — MIGRAR TELAS EXISTENTES PARA OS NOVOS PADRÕES

Depois que foundations/patterns/recipes estiverem estáveis, audite as telas existentes.

NÃO refatore todas cegamente.

Classifique:

```text
A — já canônica
B — pequena divergência
C — divergência estrutural
D — exceção legítima

```

Priorize B e C.

## Exemplos já observados anteriormente

Há telas utilizando patterns como:

```text
PageShell
PageHeader
PageToolbar
DataTable

```

Estas devem servir de base.

Também existem telas com estrutura mais manual, incluindo `h1` local e composições próprias.

Investigue novamente no HEAD atual.

Não aplique substituição mecânica.

## Objetivo

Reduzir múltiplas implementações equivalentes para um único padrão.

Por exemplo:

```text
antes:

roles/$id     → header manual
staff/$id     → header manual diferente
component/$id → terceiro header

depois:

DetailPage recipe

```

quando semanticamente adequado.

---

# FASE 14 — REGRAS PARA NOVOS COMPONENTES

Documente uma política explícita.

## Novo primitive

Só criar se:

```text
não existe equivalente no DS
+
não pode ser atendido por variant/composição
+
é genérico

```

Destino:

```text
src/components/ui/

```

e deve possuir documentação/story adequada.

## Novo pattern

Só criar quando:

```text
composição se repete
+
há valor semântico
+
reduz decisões

```

## Novo product component

Use quando for comportamento específico do domínio.

Não coloque lógica de negócio em primitive genérico.

## Novo recipe

Criar quando houver um novo archetype real repetível.

Não criar uma recipe exclusiva para uma única tela.

---

# FASE 15 — EVITAR CLASSNAME COMO ESCAPE HATCH

Não remova `className` das APIs sem necessidade.

Mas documente que:

```text
className

```

não deve ser o mecanismo primário para redefinir a aparência de uma recipe.

Exemplo RUIM:

```tsx
<ListPage
  className="max-w-[1370px] space-y-[19px] ..."
>

```

Exemplo desejado:

```tsx
<ListPage density="default" width="wide">

```

somente se essas variantes representarem necessidades reais recorrentes.

---

# FASE 16 — USAR O PRÓPRIO APP COMO GOLDEN REFERENCES

Escolha entre 3 e 6 telas do produto que representem os melhores padrões atuais.

Documente-as como referências canônicas.

Exemplo conceitual:

```text
Canonical List
Canonical Detail
Canonical Form
Canonical Dashboard
Canonical Wizard

```

Não use screenshot isolado como única documentação.

Relacione cada referência aos componentes/recipes responsáveis.

---

# DIVISÃO SUGERIDA DOS SUBAGENTS

O ORQUESTRADOR pode adaptar conforme dependências reais.

## Subagent A — Discovery

Read-only inicialmente.

Responsável por:

```text
inventário do DS
componentes existentes
patterns existentes
archetypes
golden screens
divergências

```

Entrega relatório ao orquestrador.

## Subagent B — Storybook

Write-set principal:

```text
.storybook/
*.stories.tsx
arquivos estritamente necessários à documentação

```

Responsável por:

```text
foundation stories
component stories
pattern stories
composed stories
manifest/MCP quando aplicável

```

## Subagent C — Recipes

Write-set:

```text
src/components/ui/page*
src/components apropriados de layout/patterns
stories correspondentes
testes correspondentes

```

Responsável por:

```text
ListPage
DetailPage
FormPage
DashboardPage
WizardPage quando necessário

```

## Subagent D — Enforcement

Write-set:

```text
scripts/
package.json
configuração de CI/hook estritamente necessária
testes do próprio checker

```

Responsável por:

```text
ui:check
mensagens
allowlist
integração no DoD

```

## Subagent E — Documentation/Agent UX

Write-set:

```text
AGENTS.md
docs/context/DESIGN_SYSTEM.md
.agents/skills/... se suportado

```

Responsável por:

```text
visual grammar
agent workflow
discovery rules
creation policy
visual review checklist

```

## Subagent F — Migration

Somente depois que recipes principais estabilizarem.

Responsável por:

```text
migrar telas divergentes prioritárias

```

Divida por grupos de rotas para evitar conflitos.

## Subagent G — Visual QA

Idealmente sem write access inicialmente.

Responsável por:

```text
review independente
mobile
desktop
dark
alignment
spacing
hierarchy
states

```

---

# DEPENDÊNCIAS ENTRE AGENTES

Não execute tudo cegamente ao mesmo tempo.

Use aproximadamente:

```text
                    ┌─────────────┐
                    │ Discovery A │
                    └──────┬──────┘
                           │
          ┌────────────────┼───────────────────┐
          ▼                ▼                   ▼
   Storybook B        Recipes C          Documentation E
          │                │                   │
          └──────┐         │         ┌─────────┘
                 ▼         ▼         ▼
                  Enforcement D
                       │
                       ▼
                   Migration F
                       │
                       ▼
                  Visual QA G
                       │
                       ▼
                   Corrections

```

Discovery deve acontecer primeiro.

Depois, B/C/E podem trabalhar parcialmente em paralelo.

Enforcement depende de saber quais regras serão canônicas.

Migration depende das recipes.

Visual QA depende das telas já migradas.

---

# INTEGRAÇÃO DOS SUBAGENTS

O ORQUESTRADOR deve revisar cada branch antes de integrar.

Não faça merge automático apenas porque testes passaram.

Verifique:

```text
duplicação
abstração excessiva
mudança visual não solicitada
API inconsistente
falsos positivos do ui:check
stories frágeis
dependência circular
className escape hatches
componentes que só encapsulam div

```

Resolva conflitos arquiteturais centralmente.

Não deixe cada subagent criar sua própria interpretação do design system.

---

# CRITÉRIO DE QUALIDADE DAS ABSTRAÇÕES

Antes de aceitar um novo componente de design system, pergunte:

### 1. Ele reduz decisões?

Se não, provavelmente é só um wrapper.

### 2. Ele representa um conceito visual recorrente?

Se não, provavelmente não pertence ao DS.

### 3. É mais fácil para um agente escolher corretamente?

Essa pergunta é essencial.

Uma API como:

```tsx
<PageContent width="narrow">

```

pode ser superior para agentes a:

```tsx
<div className="mx-auto w-full max-w-2xl">

```

porque transforma uma escolha visual em uma escolha semântica.

### 4. Evita duplicação futura?

### 5. Continua compreensível para humanos?

Não sacrifique a arquitetura humana para otimizar exclusivamente agentes.

---

# NÃO FAÇA

Não:

- substitua shadcn por outra biblioteca;
- reescreva todos os primitives;
- crie dezenas de abstrações sem evidência;
- duplique componentes existentes;
- transforme todo `div` em componente;
- crie design tokens para cada número existente;
- normalize toda diferença visual automaticamente;
- aceite screenshots novos sem revisão;
- altere baseline para fazer CI passar;
- esconda problemas colocando allowlist global;
- adicione dependências sem necessidade clara;
- espalhe documentação repetida;
- faça uma refatoração massiva de uma vez;
- altere comportamento funcional sem relação com este trabalho;
- mude contracts de API;
- mude domínio;
- reescreva páginas já canônicas só para “usar a nova abstraction”.

---

# TESTES

Preserve a infraestrutura existente.

Para novas abstrações, adicione testes proporcionais.

## Components/patterns

Teste:

```text
semântica
props/variants
acessibilidade relevante
composição

```

Evite testar classes internas em excesso, exceto quando elas fazem parte de um contrato estrutural importante.

## Recipes

Teste estrutura e comportamento importante.

## ui:check

Deve possuir fixtures/casos de teste para:

```text
caso válido
violação
allowlist
false positive conhecido

```

## Storybook

Garanta:

```bash
bun run build-storybook

```

verde.

Se o projeto já possui testes do Storybook, integre adequadamente.

---

# VALIDATION MATRIX

Ao final, execute os comandos reais do projeto.

No mínimo, se continuarem válidos:

```bash
bun run check
bun run typecheck
bun run test
bun run test:coverage
bun run ui:check
bun run build
bun run build-storybook

```

Depois, sequencialmente:

```bash
bun run e2e
bun run test:visual

```

E os checks de documentação existentes, por exemplo:

```bash
scripts/docs-check

```

Use os comandos canônicos encontrados no repositório.

Não invente nomes se tiverem mudado.

---

# VALIDAÇÃO MANUAL / VISUAL FINAL

Faça revisão real de telas representativas.

Viewport mínimo:

```text
375px
1440px

```

Modo:

```text
light
dark

```

para pelo menos as superfícies relevantes.

Analise:

```text
alignment
spacing
hierarchy
density
typography
responsive
overflow
states
consistency

```

Documente problemas restantes.

---

# DEFINITION OF DONE

O trabalho só está concluído quando:

1. Storybook representa de forma útil os principais foundations, primitives e patterns.
2. Agentes possuem um caminho estruturado para descobrir os componentes existentes.
3. Há uma gramática visual canônica documentada.
4. Há archetypes/page recipes claros.
5. List/Detail/Form e demais recipes aplicáveis estão representados de forma reutilizável.
6. `PageShell`, `PageHeader`, `PageToolbar`, `PageSection`, `DataTable` e outros patterns existentes estão integrados nessa arquitetura.
7. As principais regras visuais possuem enforcement automático quando objetivamente verificáveis.
8. Existe `ui:check` ou equivalente.
9. O DoD executa esse checker.
10. Agentes recebem instruções explícitas para consultar DS/Storybook antes de criar UI.
11. Existe checklist de revisão visual.
12. Visual regression e visual quality estão claramente separados.
13. Há golden references reais do produto.
14. Telas estruturalmente divergentes prioritárias foram migradas.
15. Não surgiram componentes duplicados desnecessários.
16. Não houve reescrita geral do frontend.
17. Build, testes, Storybook, E2E e visual estão verdes.
18. A documentação reflete o estado final real.

---

# RESULTADO ESPERADO

A arquitetura final deve ficar aproximadamente:

```text
                       ┌─────────────────────┐
                       │     Foundations     │
                       │                     │
                       │ colors              │
                       │ typography          │
                       │ spacing             │
                       │ radius              │
                       │ layout rules        │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │     Primitives      │
                       │                     │
                       │ Button              │
                       │ Input               │
                       │ Select              │
                       │ Dialog              │
                       │ Card                │
                       │ ...                 │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │      Patterns       │
                       │                     │
                       │ PageHeader          │
                       │ PageToolbar         │
                       │ PageSection         │
                       │ DataTable           │
                       │ FilterBar           │
                       │ ActionGroup         │
                       │ FormLayout          │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │    Page Recipes     │
                       │                     │
                       │ ListPage            │
                       │ DetailPage          │
                       │ FormPage            │
                       │ DashboardPage       │
                       │ WizardPage          │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │    Product Pages    │
                       └─────────────────────┘

```

E o fluxo de um coding agent deve ser:

```text
task
 │
 ▼
identify surface
 │
 ▼
identify archetype
 │
 ▼
Storybook / Design System
 │
 ▼
recipe?
 │ yes
 ▼
pattern?
 │
 ▼
existing component?
 │
 ▼
primitive?
 │
 ▼
implement only product-specific behavior
 │
 ▼
ui:check
 │
 ▼
component/tests
 │
 ▼
visual quality review
 │
 ▼
Playwright visual regression

```

O objetivo não é fazer os agentes “terem mais criatividade visual”.

O objetivo é fazer com que eles **precisem de muito menos criatividade visual para produzir uma interface boa e consistente**.

---

# RELATÓRIO FINAL OBRIGATÓRIO

Ao terminar, apresente:

## Arquitetura

Explique a arquitetura final:

```text
Foundations
Primitives
Patterns
Recipes
Product Pages

```

## Arquivos adicionados

Liste novos arquivos relevantes.

## Arquivos modificados

Agrupe por:

```text
Storybook
Design System
Enforcement
Agent instructions
Recipes
Migrated pages
Tests

```

## Patterns encontrados

Liste os que já existiam e foram canonizados.

## Patterns novos

Explique por que cada um foi criado.

## Recipes

Liste as recipes finais e seus usos.

## Enforcement

Liste cada regra do `ui:check`:

```text
rule id
severity
o que detecta
como corrigir
allowlist

```

## Storybook

Liste foundations/components/patterns/recipes documentados.

## Páginas migradas

Liste:

```text
rota
antes
depois
recipe usada

```

## Dívida restante

Liste apenas dívida concreta, não sugestões genéricas.

## Validação

Informe resultado exato de:

```text
check
typecheck
tests
coverage
ui:check
build
storybook
e2e
visual
docs-check

```

## Subagents

Informe:

```text
subagent
responsabilidade
branch/worktree
principais arquivos
resultado

```

Não encerre apenas dizendo que “foi implementado”.

Forneça evidência suficiente para verificar que o design system deixou de ser apenas uma coleção de componentes e passou a funcionar como uma **linguagem canônica para desenvolvimento de interface por agentes**.