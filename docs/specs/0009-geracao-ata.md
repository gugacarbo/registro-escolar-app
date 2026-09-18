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
  - src/lib/meetings/repository.ts
  - src/routes/api/minute-templates/index.ts
  - src/routes/api/meetings/$meetingId/minutes/index.ts
  - src/routes/api/meetings/$meetingId/minutes/content.ts
  - src/components/minutes/minute-content-editor.tsx
  - src/hooks/minutes/use-minute-content.ts
  - src/hooks/minutes/use-update-minute-content.ts
  - src/routes/_app/minutes/$meetingId.tsx
  - src/routes/_app/meetings/$meetingId/index.tsx
---

# Geração de ata com presets

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir gerar a ata formal de uma reunião a partir de um preset inicial, dados da reunião, registros e relatos selecionados, sem alterar os registros originais. Depois de aplicado, o conteúdo da ata pertence à reunião e pode ser editado localmente.

## Fluxo

1. Na preparação da reunião, o operador seleciona um preset de ata.
2. O sistema copia cabeçalho, corpo e rodapé do preset para a ata lógica da reunião.
3. Enquanto a reunião estiver editável, o operador pode ajustar esses três campos sem alterar o preset compartilhado.
4. A qualquer momento em andamento ou após finalização, o operador solicita prévia da ata.
5. O sistema renderiza a ata aplicando o conteúdo local aos dados filtrados (apenas registros/relatos marcados para inclusão).
6. Após finalização, uma versão oficial da ata é gerada com PDF.

## Contrato

- `GET /api/meetings/:id/minutes` — retorna prévia e conteúdo editável efetivo da ata.
- `GET /api/meetings/:id/minutes/content` — retorna a cópia editável da reunião.
- `PATCH /api/meetings/:id/minutes/content` — salva cabeçalho, corpo e rodapé locais.
- `POST /api/meetings/:id/minutes` — gera versão oficial e PDF.
- `POST /api/minute-templates` — cadastra preset.
- O preset define o conteúdo inicial; a ata da reunião mantém sua própria cópia.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                            | o sistema DEVE ⟨resposta⟩                                           |
| --- | ------------------------------------------- | ------------------------------------------------------------------- |
| 1   | não houver registros marcados para inclusão | gerar ata mínima com cabeçalho e relatos gerais                     |
| 2   | o preset for alterado após uma reunião receber sua cópia | atas já configuradas manterem seu conteúdo local; novas reuniões usarem o preset atualizado |
| 3   | a reunião ainda estiver em Rascunho         | permitir prévia, mas não gerar versão oficial                       |
| 4   | houver registros internos                   | omiti-los da ata e do PDF                                           |
| 5   | a reunião possuir múltiplas turmas          | agrupar registros por turma e por estudante conforme template       |
| 6   | o operador editar conteúdo de reunião finalizada | rejeitar com conflito e exigir reabertura da reunião                 |

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

DoD executado em 2026-09-17. Presets são persistidos em `minute_templates`;
ao selecionar um preset, a reunião recebe uma cópia local em `minutes`, que
pode ser editada sem alterar o preset ou outras reuniões. Prévia funciona
inclusive em rascunho; geração oficial é rejeitada em rascunho;
registros/relatos internos são omitidos; a renderização agrupa registros por
turma e estudante; sem registros a ata mínima continua gerável. O conteúdo
local é bloqueado após finalização e volta a ser editável somente após
reabertura. Gates executados: `bunx drizzle-kit check`, `bun run check`,
`bun run typecheck`, testes focados (87 aprovados, 1 ignorado), `bun run build`
e E2E dos cenários de atas e presets (14 aprovados).
