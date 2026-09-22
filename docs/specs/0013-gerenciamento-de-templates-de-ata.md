---
status: implemented
date: 2026-09-10
builds-on:
  - ADR-0014
  - SPEC-0009
implemented-by:
  - src/components/app-sidebar.tsx
  - src/components/minutes/minute-template-form.tsx
  - src/routes/_app/minutes/templates/index.tsx
  - src/routes/_app/minutes/templates/$id.tsx
  - src/db/minutes-schema.ts
  - src/lib/minutes/repository.ts
  - src/routes/api/meetings/$meetingId/minutes/content.ts
  - src/components/minutes/minute-content-editor.tsx
  - src/hooks/minutes/use-minute-content.ts
  - src/hooks/minutes/use-update-minute-content.ts
  - src/routes/_app/minutes/$meetingId.tsx
  - src/routes/_app/meetings/$meetingId/index.tsx
---

# Gerenciamento de modelos de ata

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir que o operador encontre modelos de ata em uma tabela padronizada e
abra um modelo existente em uma página própria para editar e salvar seu
conteúdo inicial. Cada reunião recebe uma cópia que pode ser personalizada.

## Fluxo

1. O operador acessa a lista de modelos de ata.
2. O sistema apresenta os modelos na tabela padrão da aplicação, com nome e
   conteúdos personalizados.
3. Ao selecionar uma linha, o sistema abre a página do modelo correspondente.
4. A página carrega os valores persistidos no formulário de edição.
5. O operador salva as alterações e recebe confirmação de atualização.

## Contrato

- A lista usa `DataTable`, com estados de carregamento, vazio e erro e
  paginação local.
- Cada linha navegável aponta para `/minutes/templates/:id`.
- `GET /api/minute-templates/:id` retorna o modelo solicitado; retorna `404`
  quando ele não existe.
- `PATCH /api/minute-templates/:id` atualiza nome, textos de cabeçalho/rodapé e
  blocos booleanos do template; retorna o template atualizado.
- Uma edição de modelo altera apenas o conteúdo inicial de novas aplicações;
  atas de reuniões já configuradas e versões já geradas permanecem inalteradas.
- `GET /api/meetings/:id/minutes/content` e
  `PATCH /api/meetings/:id/minutes/content` leem e salvam o conteúdo próprio da
  reunião, permitido apenas em reunião `open`.

## Casos de borda

| # | QUANDO ⟨gatilho⟩ | o sistema DEVE ⟨resposta⟩ |
| --- | --- | --- |
| 1 | a lista estiver carregando | exibir o estado de carregamento da tabela padrão |
| 2 | não houver modelos cadastrados | exibir empty-state com CTA para cadastrar um modelo |
| 3 | o operador clicar ou ativar por teclado uma linha | navegar para a página de edição daquele template |
| 4 | o modelo solicitado não existir | exibir mensagem de falha de carregamento sem renderizar formulário vazio |
| 5 | uma edição do modelo for salva | confirmar a atualização sem alterar atas já configuradas ou versões existentes |
| 6 | o operador editar a ata de uma reunião | salvar cópia local de cabeçalho, corpo e rodapé |
| 7 | a reunião estiver encerrada e o operador editar seu conteúdo | rejeitar e orientar a reabrir a reunião |

## Questões em aberto

Nenhuma.

## Definition of Done

```bash
bun run test src/components/minutes/minute-template-form.test.tsx src/routes/_app/minutes/templates.test.tsx src/routes/_app/minutes/templates/$id.test.tsx src/routes/api/minute-templates/$id/index.test.ts # casos 1–5
bun run e2e e2e/spec-0009-minutes.spec.ts # fluxo de edição de template
bun run test:visual # estados visuais da lista e edição
bun run typecheck # exit 0
bun run check # exit 0
scripts/docs-check # exit 0
bun run build # exit 0
```

## Revisão humana

- Conferir que a tabela e a página de edição mantêm o padrão visual das demais
  telas de configuração.

## Verificação

DoD executado em 2026-09-17. O fluxo de lista, criação e edição de modelos,
Atualização 2026-09-22 (ADR-0021): o bloqueio do conteúdo ocorre com a reunião `closed`. DoD original: isolamento da cópia por reunião, editor rico e bloqueio após encerramento foi
validado por testes focados (87 aprovados, 1 ignorado), `bun run typecheck`,
`bun run check`, `bun run build` e pelos 14 cenários E2E de atas e modelos
(14 aprovados).
