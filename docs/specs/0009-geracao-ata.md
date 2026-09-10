---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0014
  - ADR-0019
implemented-by:
  - src/db/minutes-schema.ts
  - src/lib/minutes/schema.ts
  - src/lib/minutes/repository.ts
  - src/lib/minutes/render.ts
  - src/lib/minutes/pdf.ts
  - src/routes/api/minute-templates/index.ts
  - src/routes/api/meetings/$meetingId/minutes/index.ts
---

# Geração de ata com templates

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir gerar a ata formal de uma reunião a partir de template, dados da reunião, registros e relatos selecionados, sem alterar os registros originais.

## Fluxo

1. Na preparação da reunião, o operador seleciona um template de ata.
2. A qualquer momento em andamento ou após finalização, o operador solicita prévia da ata.
3. O sistema renderiza a ata aplicando o template aos dados filtrados (apenas registros/relatos marcados para inclusão).
4. Após finalização, uma versão oficial da ata é gerada com PDF.

## Contrato

- `GET /api/meetings/:id/minutes/preview` — retorna prévia da ata.
- `POST /api/meetings/:id/minutes/generate` — gera versão oficial e PDF.
- `POST /api/minute-templates` — cadastra template.
- Template define blocos: cabeçalho, reunião, turmas, participantes, registros por estudante, relatos gerais, assinaturas, rodapé.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                            | o sistema DEVE ⟨resposta⟩                                           |
| --- | ------------------------------------------- | ------------------------------------------------------------------- |
| 1   | não houver registros marcados para inclusão | gerar ata mínima com cabeçalho e relatos gerais                     |
| 2   | o template for alterado após prévia         | próxima prévia refletir novo template; dados permanecem inalterados |
| 3   | a reunião ainda estiver em Rascunho         | permitir prévia, mas não gerar versão oficial                       |
| 4   | houver registros internos                   | omiti-los da ata e do PDF                                           |
| 5   | a reunião possuir múltiplas turmas          | agrupar registros por turma e por estudante conforme template       |

## Questões em aberto

Nenhuma — os casos de borda estão cobertos por testes de repositório.

## Definition of Done

```bash
bun run db:local:migrate ............ exit 0
bun run typecheck .................. exit 0
bun run check ...................... exit 0 (299 arquivos)
bun run test --run ................. 58 arquivos, 460 testes verdes
bun run test:coverage .............. 98,45% stmts/linhas, 99,20% funcs, 95,09% branches
scripts/docs-check ................ exit 0
bun run build ..................... exit 0
```

## Revisão humana

- Resolvido no fechamento: comportamento validado por testes automatizados; ajustes visuais finais podem ser feitos sem alterar contrato.

## Verificação

DoD executado em 2026-09-09. Templates são persistidos em `minute_templates`;
as atas ficam 1:1 com a reunião (`minutes`) e cada versão guarda conteúdo e PDF
em `minute_versions`. Prévia funciona inclusive em rascunho; geração oficial é
rejeitada em rascunho; registros/relatos internos são omitidos; a renderização
agrupa registros por turma e estudante; sem registros a ata mínima continua gerável.
PDF é gerado com `pdf-lib` (A4, paginação e quebra por largura real de fonte) e
persistido em BLOB D1. Gates conforme DoD.
