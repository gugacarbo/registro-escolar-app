# AGENTS.md

```yaml
casa-repo-id: registro-escolar-app # usado em referências cross-repo (repo:ADR-0001)
casa-tier: T1 # T0 (leve) | T1 (padrão) — STANDARD §3
casa-version: 1.8 # versão do contrato CASA adotado (promessa do repo, ADR-0010)
casa-standard-ref: 7cdb964 # versão do casa-standard de origem — o casa-init carimba
```

> Padrão: https://github.com/atplus-digital/casa-standard (STANDARD.md) ROUTER
> (CASA §4): carga sempre, teto ~150 linhas. Só alto-ROI transversal. Estourou o
> teto → conteúdo desce para docs/context/, fica o ponteiro. ⚠️ NÃO usar @import
> para colar capítulos: @import expande tudo no launch. Regras de um pacote
> específico → <subdir>/AGENTS.md (lazy nativo, nearest-wins).

## Contexto em 5 linhas

<!-- O que este sistema é, pra quem, e qual o stack principal. Máximo 5 linhas. -->

## Infra & ambientes

<!-- Onde roda; o que é self-hosted. ⚠️ Liste ferramentas que NUNCA usar
     (ex.: "Supabase self-hosted → nunca usar o supabase CLI").
     Detalhe extenso → docs/context/INFRA.md (ponteiro no mapa abaixo). -->

## Como rodar localmente

```bash
# comandos exatos, copiáveis
```

## Como validar (DoD global do repo)

```bash
npm run typecheck        # exit 0
npm test                 # tudo verde
npm run test:coverage    # ≥ 95%
npm run e2e              # tudo verde (CI)
```

## UI

- Catálogo canônico de UI no Storybook: `bun run storybook` (porta 6006).
- Foundations em Design System/Foundations; primitives em UI/*; patterns em UI/Page e UI/DataTable; composições em Design System/Compositions.
- Consulte o catálogo antes de criar componente novo.
- Fluxo de UI: identifique a surface → o archetype → consulte o catálogo (Storybook) → use recipe se houver → componha com patterns → crie componente/primitive só por último (política e detalhes em `docs/context/DESIGN_SYSTEM.md`; skill: `.agents/skills/frontend-ui/SKILL.md`).

## Como deployar

Ordem oficial (deploy é manual; o CI **não** publica):

```bash
CI=true bun run db:remote:migrate   # só se houver migrações novas em drizzle/
bun run deploy                      # = vite build + wrangler deploy
wrangler deployments list           # confirma 100% na nova versão
```

NÃO fazer: commitar secrets; confiar em "CI verde" como prova de publicação;
editar `wrangler.jsonc` com booleanos entre aspas (quebra o deploy no fim).
URL de produção: https://registro-escolar-app.gugacarbo.workers.dev

## Git & PRs

<!-- Convenções; quando commitar; se há remote; se o agente abre PR sem ser pedido. -->

## Gotchas

<!-- Conhecimento NÃO-INFERÍVEL que já custou tentativas falhas. Todo gotcha
     descoberto pelo agente DEVE ser registrado aqui. -->

- `db:seed` descobre o arquivo do banco dinamicamente em
  `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`; se existirem
  múltiplos `.sqlite` lá, apague o diretório `.wrangler/state/v3/d1` e rode
  `pre-dev`.
- `wrangler.jsonc` é JSONC, mas a API do Cloudflare é estrita com tipos:
  booleano escrito como string (`"enabled": "true"`) faz o `wrangler deploy`
  subir os assets e **falhar só no fim** (`code: 10021`,
  `Settings.observability.enabled of type bool`). O Worker segue na versão
  anterior — deploy silenciosamente não publicado. Sempre `true`/`false` sem
  aspas.
- NUNCA rodar `prettier --write wrangler.jsonc`: o prettier não tem parser
  JSONC e reescreve o arquivo como se fosse markdown (destrói o comentário de
  cabeçalho e a indentação). O `prettier --check` sempre acusa esse arquivo; é
  falso positivo.
- Deploy é manual (`bun run deploy`) e **não** roda no CI: `ci.yml` só tem
  check/e2e/visual. CI verde ≠ publicado. Para conferir o que está no ar:
  `wrangler deployments list` e `wrangler versions list`.
- Migração remota: `CI=true bun run db:remote:migrate` (o `CI=true` pula o
  prompt de confirmação; o wrangler ainda captura backup). Rodar **antes** do
  deploy quando houver migrações novas em `drizzle/`.
- O Worker de produção precisa dos secrets `BETTER_AUTH_SECRET`,
  `RESEND_API_KEY` e `EMAIL_FROM` (`wrangler secret put`). Sem
  `BETTER_AUTH_SECRET`, o Better Auth usa em silêncio o fallback público
  `better-auth-secret-12345678901234567890` (o `validateSecret` só aborta com
  `NODE_ENV=production`, que não existe no workerd) — qualquer um consegue
  forjar cookie de sessão. Trocar o secret invalida as sessões existentes.

## Mapa de contexto

<!-- Índice dos capítulos (docs/context/), cada um com QUANDO carregar.
     Capítulo = estado atual, imperativo, atemporal. Decisão datada = ADR. -->

| Capítulo                      | Quando carregar                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `docs/context/CONVENTIONS.md` | ao alterar contratos de API, estado cliente, formulários, componentes UI ou persistência |
| `docs/context/TESTS.md`       | ao alterar teste, DoD, bugfix ou comportamento crítico                                   |
| `docs/context/DESIGN_SYSTEM.md` | ao criar/alterar UI, componentes, recipes ou páginas                                    |

## Mapa de docs

- Decisões: `docs/adr/` · Comportamento: `docs/specs/` (READMEs GERADOS — não
  editar)
- Validar: `scripts/docs-check` · Regenerar índices:
  `scripts/docs-check --emit-index`
