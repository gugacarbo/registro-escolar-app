---
status: accepted
date: 2026-09-10
builds-on:
  - ADR-0014
  - SPEC-0009
implemented-by: []
---

# Gerenciamento de templates de ata

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir que o operador encontre templates de ata em uma tabela padronizada e
abra um template existente em uma página própria para editar e salvar seus
campos e blocos.

## Fluxo

1. O operador acessa a lista de modelos de ata.
2. O sistema apresenta os modelos na tabela padrão da aplicação, com nome e
   blocos habilitados.
3. Ao selecionar uma linha, o sistema abre a página do template correspondente.
4. A página carrega os valores persistidos no formulário de edição.
5. O operador salva as alterações e recebe confirmação de atualização.

## Contrato

- A lista usa `DataTable`, com estados de carregamento, vazio e erro e
  paginação local.
- Cada linha navegável aponta para `/minutes/templates/:id`.
- `GET /api/minute-templates/:id` retorna o template solicitado; retorna `404`
  quando ele não existe.
- `PATCH /api/minute-templates/:id` atualiza nome, textos de cabeçalho/rodapé e
  blocos booleanos do template; retorna o template atualizado.
- Uma edição de template afeta somente prévias e versões geradas posteriormente;
  dados de reunião e versões já geradas permanecem inalterados.

## Casos de borda

| # | QUANDO ⟨gatilho⟩ | o sistema DEVE ⟨resposta⟩ |
| --- | --- | --- |
| 1 | a lista estiver carregando | exibir o estado de carregamento da tabela padrão |
| 2 | não houver templates cadastrados | exibir empty-state com CTA para cadastrar um modelo |
| 3 | o operador clicar ou ativar por teclado uma linha | navegar para a página de edição daquele template |
| 4 | o template solicitado não existir | exibir mensagem de falha de carregamento sem renderizar formulário vazio |
| 5 | uma edição for salva | confirmar a atualização e refletir as alterações em prévias futuras, sem alterar versões existentes |

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

Pendente da implementação e execução do DoD.
