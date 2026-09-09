# Plano de implementação: ajustes pós-auditoria

## Contexto

Auditoria dos SPECs e ADRs do registro-escolar-app identificou que toda a stack está implementada e funcional (typecheck, check, build, cobertura ≥95%), mas a suite de testes unitários tem falhas ambientais e os ADRs ainda estão `proposed`. Este plano corrige os problemas de teste, atualiza o e2e e promove os ADRs.

## Global Constraints

- Não alterar comportamento de produção sem spec/ADR correspondente.
- Manter `bun run typecheck`, `bun run check`, `bun run build` passando.
- Ao final, `bun run test` deve passar sem falhas (tudo verde) e `bun run e2e` deve passar.
- Cobertura deve continuar ≥95% em linhas/funções/statements/branches.
- `python3 scripts/docs-check` deve continuar passando.
- ADRs devem refletir `accepted` se a stack está adotada na codebase.

## Tarefas

### Task 1 — Corrigir ambiente de testes React/DOM

**Objetivo**: fazer com que testes que usam `@testing-library/react` (`renderHook`, `render`, `userEvent.setup`) executem sem `document is not defined`.

**Falhas atuais**:
- `src/hooks/history/use-history.test.tsx` (5 testes)
- `src/hooks/use-mobile.test.tsx` (2 testes)
- `src/components/students/student-form.test.tsx` (4 testes)

**Implementação**:
- Investigar por que `happy-dom` (declarado em `vitest.config.ts` como `environment: "happy-dom"`) não está disponível para `@testing-library/react`.
- Decidir entre:
  a) ajustar configuração do Vitest/happy-dom para inicializar `document`/`window` corretamente;
  b) migrar para `jsdom` se for mais estável com React Testing Library.
- Garantir que `src/test/setup.ts` importe corretamente matchers do jest-dom.
- Verificar compatibilidade entre versão do Vitest (`3.2.7` instalado vs `^3.2.4` no package.json) e happy-dom `20.14.0`.

**Arquivos esperados**: `vitest.config.ts`, `src/test/setup.ts`, possivelmente `package.json`/`bun.lock` se atualizar dependências.

**Validação**: `bun test src/hooks/history/use-history.test.tsx src/hooks/use-mobile.test.tsx src/components/students/student-form.test.tsx` passa.

---

### Task 2 — Corrigir testes de constraint UNIQUE no SQLite em memória

**Objetivo**: garantir que inserções duplicadas em tabelas com índice único sejam rejeitadas nos testes, conforme schema de produção.

**Falhas atuais**:
- `src/db/meetings-schema.test.ts` — "impede duplicidade de (meetingId, classId) em meeting_classes"
- `src/lib/meeting-student-status/repository.test.ts` — "impõe o índice único (meetingId, classId, studentId)"

**Implementação**:
- Revisar as funções `createTestDb()` que montam schema SQLite manualmente em memória (`better-sqlite3`).
- Garantir que as constraints `UNIQUE` estejam presentes nas tabelas criadas manualmente nos testes.
- Se o driver `drizzle-orm/better-sqlite3` não propagar o erro de constraint, ajustar as expectativas ou usar `insert().onConflictDoNothing()` / verificação manual.
- Preferir fidelidade com produção: manter a constraint e fazer o teste capturar o erro.

**Arquivos esperados**: `src/db/meetings-schema.test.ts`, `src/lib/meeting-student-status/repository.test.ts`.

**Validação**: `bun test src/db/meetings-schema.test.ts src/lib/meeting-student-status/repository.test.ts` passa.

---

### Task 3 — Corrigir `vi.hoisted` em testes de autenticação

**Objetivo**: eliminar `TypeError: vi.hoisted is not a function` em testes que usam mocks hoistados.

**Falhas atuais**:
- `src/routes/auth-pages.test.tsx`
- `src/routes/_app/route.test.tsx`

**Implementação**:
- Verificar conflito de versão do Vitest (`package.json` declara `^3.2.4`, `node_modules` tem `3.2.7`).
- Se necessário, padronizar versão do Vitest e regenerar lockfile, ou substituir `vi.hoisted()` por padrão equivalente (mocks via factory dentro de `vi.mock()` ou variável module-level).
- Garantir que mocks de `@tanstack/react-router`, `#/lib/auth-client`, `next-themes` continuem funcionando.

**Arquivos esperados**: `src/routes/auth-pages.test.tsx`, `src/routes/_app/route.test.tsx`, possivelmente `package.json`/`bun.lock`.

**Validação**: `bun test src/routes/auth-pages.test.tsx src/routes/_app/route.test.tsx` passa.

---

### Task 4 — Atualizar teste e2e da página inicial

**Objetivo**: fazer `e2e/home.spec.ts` passar refletindo o comportamento real da aplicação.

**Falha atual**: espera heading "Carregando", mas usuário não autenticado é redirecionado para `/login`.

**Implementação**:
- Ajustar o teste para:
  a) testar redirecionamento para `/login` quando não autenticado; ou
  b) realizar login no e2e e verificar heading "Registro Escolar" na home.
- Escolher (a) se não houver seed de usuário de teste no e2e; escolher (b) se for possível criar um fluxo mínimo de login.
- Atualizar `playwright.config.ts` se necessário (webServer já usa `bun run preview`).

**Arquivos esperados**: `e2e/home.spec.ts`.

**Validação**: `bun run e2e` passa.

---

### Task 5 — Promover ADRs de `proposed` para `accepted`

**Objetivo**: refletir na documentação que as decisões arquiteturais estão adotadas na codebase.

**Implementação**:
- Alterar `status: proposed` para `status: accepted` nos 19 ADRs (`docs/adr/0001*.md` a `docs/adr/0019*.md`).
- Garantir que ADRs com `superseded-by: null` e sem `VERDADE ATUAL` possam ser `accepted` (CASA aceita `accepted` sem supersessão; `superseded` é que exige bloco).
- Regenerar índices com `python3 scripts/docs-check --emit-index`.

**Arquivos esperados**: `docs/adr/*.md`, `docs/adr/README.md`, `docs/index.json`.

**Validação**: `python3 scripts/docs-check` passa.

---

### Task 6 — Ajustar ADR-0019 para refletir biblioteca de PDF real

**Objetivo**: alinhar documentação com implementação.

**Implementação**:
- No ADR-0019, substituir a menção exemplar de `@react-pdf/renderer` pela biblioteca real `pdf-lib`, ou generalizar a decisão para "biblioteca compatível com Workers (atualmente `pdf-lib`)".
- Manter `status: accepted` após Task 5.

**Arquivos esperados**: `docs/adr/0019-geracao-pdf-serverless.md`.

**Validação**: `python3 scripts/docs-check` passa.

---

## Validação final do plano

Após todas as tasks:
```bash
bun run typecheck
bun run check
bun run test
bun run test:coverage
bun run e2e
bun run build
python3 scripts/docs-check
```

## Decisões pendentes do controller

- A Task 1 pode exigir atualização de dependências (happy-dom → jsdom). Se isso for necessário, o controller deve aprovar a mudança de dependência.
- A Task 4 pode ser expandida para cobrir um fluxo mínimo de login; se for escolhido fluxo com autenticação, pode ser necessário expor/seed de usuário de teste.
- A Task 7 (finalizar UI do council) foi deixada fora deste plano por ser de escopo maior e opcional; o usuário pode pedir plano separado.
