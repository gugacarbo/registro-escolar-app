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

# Gerenciamento de presets de ata

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir que o operador encontre presets de ata em uma tabela padronizada e
abra um preset existente em uma página própria para editar e salvar seu
conteúdo inicial. Cada reunião recebe uma cópia que pode ser personalizada.

## Fluxo

1. O operador acessa a lista de presets de ata.
2. O sistema apresenta os presets na tabela padrão da aplicação, com nome e
   conteúdos personalizados.
3. Ao selecionar uma linha, o sistema abre a página do preset correspondente.
4. A página carrega os valores persistidos no formulário de edição.
5. O operador salva as alterações e recebe confirmação de atualização.

## Contrato

- A lista usa `DataTable`, com estados de carregamento, vazio e erro e
  paginação local.
- Cada linha navegável aponta para `/minutes/templates/:id`.
- `GET /api/minute-templates/:id` retorna o preset solicitado; retorna `404`
  quando ele não existe.
- `PATCH /api/minute-templates/:id` atualiza nome, textos de cabeçalho/rodapé e
  blocos booleanos do template; retorna o template atualizado.
- Uma edição de preset altera apenas o conteúdo inicial de novas aplicações;
  atas de reuniões já configuradas e versões já geradas permanecem inalteradas.
- `GET /api/meetings/:id/minutes/content` e
  `PATCH /api/meetings/:id/minutes/content` leem e salvam o conteúdo próprio da
  reunião, permitido em Rascunho, Em andamento e Reaberta.

## Casos de borda

| # | QUANDO ⟨gatilho⟩ | o sistema DEVE ⟨resposta⟩ |
| --- | --- | --- |
| 1 | a lista estiver carregando | exibir o estado de carregamento da tabela padrão |
| 2 | não houver presets cadastrados | exibir empty-state com CTA para cadastrar um preset |
| 3 | o operador clicar ou ativar por teclado uma linha | navegar para a página de edição daquele template |
| 4 | o preset solicitado não existir | exibir mensagem de falha de carregamento sem renderizar formulário vazio |
| 5 | uma edição do preset for salva | confirmar a atualização sem alterar atas já configuradas ou versões existentes |
| 6 | o operador editar a ata de uma reunião | salvar cópia local de cabeçalho, corpo e rodapé |
| 7 | a reunião estiver finalizada e o operador editar seu conteúdo | rejeitar e orientar a reabrir a reunião |

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

Implementado com cópia por reunião, editor rico e bloqueio de edição após finalização. A verificação final está registrada após a execução do DoD.
