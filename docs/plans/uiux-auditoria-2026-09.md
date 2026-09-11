# Plano de implementação: correções da auditoria UI/UX (2026-09)

## Contexto

Auditoria UI/UX executada em 2026-09-10 (runtime em desktop 1440px, mobile 375px,
dark mode, teclado + revisão estática). Achados confirmados contra o HEAD
`55018b1`: 14 itens abertos. Este plano implementa as correções de código.
Itens RESOLVIDOS a jusante (fora de escopo): links "Abrir" do dashboard
(redesenho já aplicado em `fa54d36`). Itens EXCLUÍDOS por ruling do
controller: endpoints DELETE de ofertas/vínculos/participações (feature de
produto, exige spec/ADR — CASA) e nomes duplicados em dados (qualidade de
seed, não de código).

## Global Constraints

- UI 100% pt-BR (nenhum texto/aria-label novo em inglês).
- Não alterar contratos de API nem o estado existente além do listado em cada task.
- Padrões do repositório: Tailwind v4 + shadcn/Radix, react-hook-form + zod,
  TanStack Query. Sem novas dependências (a Task 9 remove uma).
- Testes obrigatórios nas tasks onde o plano especifica (DoD local de cada task);
  no fim da branch: `bun run typecheck`, `bun run check`, `bun run test`,
  `bun run test:coverage` (≥95%), `bun run build` — tudo verde.
- `python3 scripts/docs-check` deve continuar passando (apenas Task G toca AGENTS.md).
- Nenhum task pode rodar `bun run dev`/`bun run e2e` em porta 3001
  (recurso compartilhado com sessão paralela) — e2e fica para a validação
  final sequencial do controller.

## Tarefas

### Task 1 —  Componentes base: acessibilidade e i18n (batch)

Correções pequenas e mesmas-forma em 5 arquivos distintos.

- `src/components/ui/pagination.tsx`:
  - `aria-label="Go to previous page"` → `aria-label="Página anterior"`
  - `aria-label="Go to next page"` → `aria-label="Próxima página"`
  - `<span className="sr-only">More pages</span>` → `<span className="sr-only">Mais páginas</span>`
- `src/components/ui/table.tsx` (TableHead): adicionar `scope="col"` ao `<th>`.
- `src/components/ui/form.tsx` (FormMessage): adicionar `role="alert"` ao `<p>`
  de erro (todos os ramos de render do FormMessage).
- `src/components/ui/sidebar.tsx` (SidebarTrigger, ~linha 268): default
  `size-7` → `size-9` (alvo de toque 36px em place de 28px).
  Se `src/components/ui/sidebar.test.tsx` asserting a classe antiga, atualizar
  a expectativa (mudança intencional).
- `src/routes/_app/route.tsx`: adicionar skip-link e `id` no main:
  - Antes do `<Sidebar>`/header, como primeiro elemento render:
    `<a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md">Pular para o conteúdo</a>`
  - `<main>` existente: adicionar `id="conteudo-principal"` (manter classes atuais).
  - Estender `src/routes/_app/route.test.tsx`: asserir que o skip-link
    (texto "Pular para o conteúdo", href `#conteudo-principal`) e o `<main id="conteudo-principal">` existem.

**Write set**: os 5 arquivos acima + `root.test.tsx`, `sidebar.test.tsx`,
+ novos testes pequenos (pagination/table/form) se a task criar.
**Validação**: `bun test src/components/ui/pagination* src/components/ui/table* src/components/ui/form* src/components/ui/sidebar* src/routes/_app/route.test.tsx` e `bun run typecheck`.

---

### Task 2 —  data-table: paginação desabilitada sem foco de teclado

`src/components/data-table.tsx` (footer de paginação, ~linhas 330–385):
`PaginationPrevious`/`PaginationNext` (e itens de página/ellipsis) desabilitados
renderizam `<a href="#">` com `aria-disabled` mas focáveis e navegáveis para `#`.

- Comportamento alvo: item desabilitado NÃO recebe `href` (renderiza como
  elemento não focusable com `aria-disabled="true"`); item habilitado mantém
  comportamento atual.
- Verificar como o shadcn `PaginationLink`/items atuais do `data-table`
  decidem `a` vs `button` e aplicar `href={condição ? "#" : undefined}`
  (ou equivalente mínimo) para o Previous, Next e números/ellipses.
- Estender `src/components/data-table.test.tsx`: na página 1, o "Previous"
  não tem `href` e não é focusable; na última página, o "Next" idem;
  itens habilitados continuam com `href="#"`.

**Write set**: `src/components/data-table.tsx`, `src/components/data-table.test.tsx`.
**Validação**: `bun test src/components/data-table.test.tsx` e `bun run typecheck`.

---

### Task 3 —  TanStack Query: fim do loop de retry em 404 + versions 404 → []

Problema auditado: `new QueryClient()` sem config → 404 retratado 3x
(tela em branco ~1 min em id de reunião inválido) e `minutes/versions`
retorna 404 quando a reunião ainda não tem ata (
`src/routes/api/meetings/$meetingId/minutes/versions/index.ts:53`) →
3 erros de console em TODA reunião aberta.

- `src/integrations/tanstack-query/root-provider.tsx`:
  `new QueryClient({ retry: false })`. Justificativa (fixada pelo controller):
  os hooks lançam `Error` sem `status`, então função condicional por status
  não é confiável; o app já exibe erro inline com ação de retry nos pontos
  críticos (estado de erro do data-table), então retry global não agrega.
- `src/hooks/minutes/use-minute-versions.ts`: no `queryFn`, se
  `response.status === 404` retornar `[]`; demais não-ok continuam lançando.
- Novo teste `src/hooks/minutes/use-minute-versions.test.tsx`:
  - fetch mock 404 → `data` vazio (`[]`), sem erro.
  - fetch mock 200 com payload → lista intacta.
  - (opcional) 500 → erro lançado.
- Se o `RootProvider` já for testado, garantir compatibilidade; caso contrário,
  extrair um factory exportável `createQueryClient` de `root-provider.tsx`
  e testar `retry === false` nele (se já houver teste do provider, só ajustar).

**Write set**: `src/integrations/tanstack-query/root-provider.tsx`,
`src/hooks/minutes/use-minute-versions.ts`, `src/hooks/minutes/use-minute-versions.test.tsx` (+ teste do factory se criado).
**Validação**: `bun test src/hooks/minutes/ src/integrations/` e `bun run typecheck`.

---

### Task 4 —  Mobile 375px: overflow no detail de reunião

`src/routes/_app/meetings/$meetingId/index.tsx` (~linha 378+): o wrapper
`<div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">`
contém `<TabsList>` (w-fit, triggers nowrap — 4 abas ≈ 477px) e a linha de
botões (≈ 409px): cada item individualmente é mais largo que 375px →
scroll horizontal de 118px.

- Envolver `<TabsList>` em `<div className="min-w-0 max-w-full overflow-x-auto">`
  (scroll horizontal da própria lista quando exceder).
- Adicionar `flex-wrap` à `div` de ações (Conselho/Participantes/Acompanhamento + TransitionButtons).
- Não alterar look em desktop 1440px (overflow-x-auto só aparece ao exceder).
- Teste: criar `src/routes/_app/meetings/$meetingId/index.test.tsx` seguindo o
  padrão de mocks dos outros route tests (`src/routes/_app/minutes/$meetingId.test.tsx`
  como referência): asserting presença dos 4 `TabsTrigger`, da classe
  `overflow-x-auto` no wrapper da lista e de `flex-wrap` nas ações.

**Write set**: `src/routes/_app/meetings/$meetingId/index.tsx`,
`src/routes/_app/meetings/$meetingId/index.test.tsx` (novo).
**Validação**: `bun test "src/routes/_app/meetings/\$meetingId/"` e `bun run typecheck`.

---

### Task 5 —  Filtro de histórico: selects em place de UUID puro

`src/components/history/history-search-form.tsx`: campos `turmaId`
(placeholder "ID da turma") e `componenteId` (placeholder "ID do componente")
são `Input` de texto que exigem colar UUID.

- Substituir por selects com busca que carregam opções reais, seguindo o
  padrão do repositório: `useAsyncOptions`
  (`src/hooks/use-async-options.ts`) + `fetchClassesPage` e
  `fetchComponentsPage` (`src/hooks/entity-fetchers.ts`) — exatamente como
  `src/routes/_app/meetings/$meetingId/index.tsx` faz para staff/roles
  (componente de select do DS: `EntitySelect` ou `SearchableSelect`,
  whichever o restante do app usa nesse contexto).
- Opção vazia = "Sem filtro" (value ""); manter `hideStudentFilters`,
  `defaultValues`, nomes de campos e assinatura de `onSubmit` INTACTOS —
  os dois call sites (histórico do estudante e da turma) não mudam.
- Manter `FormMessage` acoplado ao campo (id/aria-describedby).
- Novo teste `src/components/history/history-search-form.test.tsx`:
  simular `fetch` (ou `useAsyncOptions`), asserting:
  - renderiza selects (sem input de texto com placeholders "ID da turma"/"ID do componente");
  - selecionar uma turma e submeter chama `onSubmit` com o `turmaId` correto.

**Write set**: `src/components/history/history-search-form.tsx`,
`src/components/history/history-search-form.test.tsx` (novo).
**Validação**: `bun test src/components/history/` + `bun test src/routes/_app/students src/routes/_app/classes` (call sites) e `bun run typecheck`.

---

### Task 6 —  /students/import: input de arquivo nativo

`src/routes/_app/students/import.tsx` (step de upload, ~linhas 164–182):
`<input type="file">` cru → botão default do browser "Choose File" (inglês)
em UI 100% pt-BR, sem label/aria-label.

- Pattern: `<input type="file" className="hidden" ref={inputRef} accept=".csv,.xlsx,.xls,.ods">`
  + `<Button variant="outline" type="button" onClick={() => inputRef.current?.click()}>Selecionar arquivo</Button>`
  + exibição do nome do arquivo escolhido ao lado (ex.: `text-sm text-muted-foreground`).
  `onChange` mantém o MESMO comportamento atual (`void handleUpload(file)`).
- Não alterar fluxo de steps, mensagens de erro nem o step de confirmação.
- Teste: criar `src/routes/_app/students/import.test.tsx` (mínimo, seguindo
  mocks de outros route tests): na etapa de upload, botão "Selecionar arquivo"
  presente; clicar no botão chama `click()` no input oculto; input oculto não é
  visível/renderizado com estilos nativos.

**Write set**: `src/routes/_app/students/import.tsx`,
`src/routes/_app/students/import.test.tsx` (novo).
**Validação**: `bun test "src/routes/_app/students/import.test.tsx"` e `bun run typecheck`.

---

### Task 7 —  scripts/db-seed.ts: descoberta dinâmica do arquivo do banco

`scripts/db-seed.ts` (~linhas 101–102) hard-coda
`a4926725177bf51d2522ff30e24d859c3d392a5068faab53e3951d5df4f2664c.sqlite`,
mas o banco local do dev é outro hash (o seed é silent no-op — gotcha
confirmado na auditoria).

- Substituir por descoberta: listar
  `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` excluindo
  `metadata.sqlite` (mesmo pattern de `scripts/e2e-setup`, linha 16).
  - exatamente 1 arquivo → usar;
  - 0 → error com mensagem clara (caminho esperado e dica para rodar
    `bun run build`/`pre-dev` antes para criar o state);
  - >1 → error listando os candidatos e instruindo a apagar
    `.wrangler/state/v3/d1` para resetar.
- Não rodar o seed com escrita neste trabalho (o checkout isolado não tem
  `.wrangler` com banco); validar o caminho de erro ausente:
  `bun run scripts/db-seed.ts` deve falhar com a mensagem clara e NÃO
  escrever nada.
- `AGENTS.md` (seção `## Gotchas`): adicionar uma linha:
  `db:seed descobre o arquivo do banco dinamicamente; se existirem múltiplos
  `.sqlite` em .wrangler/state/v3/d1, apague o diretório e rode pre-dev.`
  (textual pode variar; manter a seção e o formato da lista intactos).

**Write set**: `scripts/db-seed.ts`, `AGENTS.md`.
**Validação**: `bun run typecheck` + rodar `bun run scripts/db-seed.ts` no
checkout isolado (espera: erro claro de "banco não encontrado",
exit != 0, nenhum efeito colateral) + `python3 scripts/docs-check`
(AGENTS.md continua válido).

---

### Task 8 —  Links "Voltar" em staff/new e classes/enroll

Páginas de criação sem rota de retorno (auditoria: sem breadcrumb/Voltar).

- `src/routes/_app/staff/new.tsx`: logo acima do PageHeader,
  `<Link to="/staff"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" aria-hidden /> Voltar</Button></Link>`
  (importar `ArrowLeft` de `lucide-react`; manter o restante da página).
- `src/routes/_app/classes/enroll.tsx`: idêntico, para `/classes`.
- Testes: se existirem tests dessas rotas, estender; caso contrário criar
  testes mínimos asserting o link "Voltar" com href correto.

**Write set**: `src/routes/_app/staff/new.tsx`, `src/routes/_app/classes/enroll.tsx`
+ testes mínimos correspondentes.
**Validação**: `bun test src/routes/_app/staff src/routes/_app/classes` e `bun run typecheck`.

---

### Task 9 —  Remover dependência morta `sonner`

`src/components/ui/sonner.tsx` define `<Toaster>` que nunca é montado e
`toast()` nunca é chamada (feedback hoje é inline — padrão mantido).

- Remover `src/components/ui/sonner.tsx` (+ qualquer test/story associado).
- Remover `"sonner"` de `package.json` (dependencies) e rodar `bun install`
  (regenera `bun.lock`; nenhuma outra dependência deve mudar — verificar
  diff do lock contendo apenas sonner/dependências exclusivas dele).
- Confirmar com busca que nenhuma import de `#/components/ui/sonner` restou.

**Write set**: `package.json`, `bun.lock`, remoção de `src/components/ui/sonner.tsx`.
**Validação**: `bun run typecheck` + `bun run check` + grep sem referências.

---

## Validação final do plano (branch)

```bash
bun run typecheck
bun run check
bun run test
bun run test:coverage
bun run build
python3 scripts/docs-check
```

(`bun run e2e` apenas na validação final do controller, com a ressalva de
porta 3001 compartilhada — ver rulings no ledger.)

## Notas de escopo (rulings do controller)

1. Sem endpoints DELETE de ofertas/vínculos/participações neste plano
   (feature de produto — precisa de spec/ADR; registrar no BACKLOG).
2. `retry: false` global do QueryClient (Task 3) — ver justificativa na task.
3. Sidebar trigger → `size-9` (36px), não 44px (harmoniza com o header).
4. Itens de dados (nomes duplicados de template/turma) fora de escopo.
5. Dashboard "Abrir" já resolvido a jusante — não mexer em `src/routes/_app/index.tsx`.
