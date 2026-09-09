<!-- Capítulo de contexto RECONHECIDO pelo CASA (STANDARD §4/§8).
     Apontado no Mapa de contexto do AGENTS.md.
     Conteúdo IMPERATIVO e ATEMPORAL ("rode X", "NUNCA Y", "o estado atual é Z").
     Quando este capítulo é DECLARADO no router, o docs-check exige ao menos UM comando
     canônico em bloco de código — liste o comando real do repo, não prosa. -->

# Testes

## Comandos canônicos

```bash
bun run test            # testes unitários/integração com Vitest
bun run test:coverage   # mesma suíte com relatório de cobertura (mínimo 95%)
bun run test:watch      # Vitest em modo watch
bun run e2e             # testes end-to-end com Playwright (headless, CI)
bun run e2e:ui          # Playwright com UI mode (debug local)
bun run storybook       # catálogo local de estados visuais em http://localhost:6006
bun run build-storybook # build estático do Storybook
bun run chromatic       # publica as histórias para comparação visual (requer CHROMATIC_PROJECT_TOKEN)
```

## Tipos de teste

| Tipo                 | Ferramenta                        | O que cobre                                                                                  |
| -------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| **Unitário**         | Vitest + happy-dom                | Funções puras, utilitários, schemas, hooks isolados.                                         |
| **Integração**       | Vitest + `@testing-library/react` | Componentes próprios, formulários com react-hook-form, provedores (TanStack Query, Tooltip). |
| **End-to-end (e2e)** | Playwright                        | Fluxos reais no navegador: autenticação, cadastros, geração de ata, PDF, etc.                |
| **Visual**           | Storybook + Chromatic             | Estados visuais estáveis dos componentes e detecção de regressões de interface.              |

## Testes visuais

- Crie histórias colocalizadas com o componente, usando o sufixo `*.stories.tsx`.
- Cubra variantes, estados de erro, desabilitado e demais estados visualmente relevantes.
- Use `bun run storybook` para desenvolver e revisar histórias localmente.
- Execute `bun run chromatic` com `CHROMATIC_PROJECT_TOKEN` configurado como segredo do ambiente ou da CI.
- A primeira execução no Chromatic estabelece a baseline; as seguintes apontam diferenças visuais para revisão.

## Onde criar testes

- **Unitários/integração:** colocados ao lado do código, com sufixo `*.test.ts` ou `*.test.tsx` (ex.: `src/lib/utils.test.ts`).
- **e2e:** em `e2e/**/*.spec.ts`, organizados por fluxo (ex.: `e2e/auth/login.spec.ts`).
- **Fixtures e helpers compartilhados:** `src/test/setup.ts`, `src/test/factories/`, `e2e/fixtures/`.

## Cobertura mínima

- **95%** em linhas, funções, statements e branches sobre o código coberto.
- O relatório é gerado por `@vitest/coverage-v8` em `coverage/`.
- A CI falha se qualquer threshold não for atingido.

## O que NÃO conta na cobertura

- Componentes de UI base em `src/components/ui/*` (shadcn/ui).
- Arquivos gerados automaticamente: `src/routeTree.gen.ts`.
- Entrypoints de framework: `src/default-entry.ts`, `src/integrations/tanstack-query/devtools.tsx`.
- Arquivos de configuração, estilos e os próprios arquivos de teste.

## Como testar bugfix

1. Reproduza o bug como um teste de regressão **antes** de alterar o código.
2. Confirme que o teste falha com a versão atual.
3. Aplique o fix e verifique que o teste passa.
4. Commite o teste junto com a correção.

## O que conta como regressão

Todo bug corrigido deve ter cobertura de teste. Para novas funcionalidades, os critérios são:

- Nova rota API → testes unitários/integração do handler + e2e do fluxo quando aplicável.
- Novo formulário → teste de submissão válida, inválida e estados de erro.
- Nova regra de negócio → testes de casos positivos, negativos e bordas.
- Alteração em schema Drizzle → testes de insert/update schemas derivados.

## Convenções de escrita

- Use `describe`/`it` descritivos; nomes de teste em português, consistentes com o domínio.
- Prefira `screen.getByRole` e consultas acessíveis no `@testing-library/react`.
- Isole efeitos colaterais com `beforeEach`/`afterEach`; limpe `localStorage`, `sessionStorage` e mocks entre testes.
- Mocks de D1/Workers são centralizados; nunca dispare requisições reais em testes unitários.

## Ambiente e2e

- O Playwright sobe a aplicação automaticamente via `bun run preview` em `http://localhost:3001`.
- Banco de testes usa D1 local (`bun run db:local:migrate`) aplicado antes do servidor.
- Cada spec pode usar `test.describe.configure({ mode: "serial" })` quando modifica estado compartilhado.

## Ferramentas que NUNCA usar para testes

- **Não use Jest** — o projeto usa Vitest nativamente.
- **Não use Cypress** — e2e é Playwright.
- **Não use `jsdom`** — ambiente de DOM é `happy-dom`.
- **Não instale browsers do Playwright via `npx` fora do CI** — use `bunx playwright install` para manter o lockfile consistente.
