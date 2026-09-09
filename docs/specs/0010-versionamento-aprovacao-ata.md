---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0014
implemented-by:
  - src/db/minutes-schema.ts
  - src/lib/minutes/repository.ts
  - src/routes/api/meetings/$meetingId/minutes/versions/index.ts
  - src/routes/api/meetings/$meetingId/minutes/versions/$version/pdf.ts
  - src/routes/api/meetings/$meetingId/minutes/approve.ts
---

# Versionamento e aprovação de ata

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir versionar a ata de uma reunião, preservar PDFs anteriores e registrar aprovação simples.

## Fluxo

1. Ao finalizar uma reunião, é criada a versão v1 da ata com PDF.
2. Se a reunião for reaberta, corrigida e finalizada novamente, é criada a v2.
3. A v1 e seu PDF permanecem acessíveis.
4. A versão mais recente é marcada como atual.
5. O operador pode aprovar a ata, registrando data e observação opcional.

## Contrato

- `GET /api/meetings/:id/minutes/versions` — lista versões.
- `GET /api/meetings/:id/minutes/versions/:version/pdf` — retorna PDF da versão.
- `PATCH /api/meetings/:id/minutes/approve` — aprova ata atual.
- Estados de aprovação: `pendente_aprovacao`, `aprovada`.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                   | o sistema DEVE ⟨resposta⟩                               |
| --- | -------------------------------------------------- | ------------------------------------------------------- |
| 1   | uma nova versão for gerada                         | manter versões anteriores e seus PDFs (CA-008)          |
| 2   | a ata já estiver aprovada e a reunião for reaberta | nova versão voltar para `pendente_aprovacao`            |
| 3   | não existir versão atual                           | não permitir aprovação                                  |
| 4   | o operador tentar aprovar sem data                 | preencher data automaticamente com momento da aprovação |
| 5   | duas versões forem marcadas como atual             | garantir que apenas uma seja atual por ata              |

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

DoD executado em 2026-09-09. Cada geração cria v(n+1), desmarca a anterior e
garante uma única versão atual; versões/PDFs anteriores permanecem acessíveis.
Regeneração após aprovação volta o status para `pendente_aprovacao`. Aprovação
exige versão atual, preenche automaticamente a data quando ausente e registra
observação opcional. O endpoint de PDF retorna `application/pdf` por versão.
Gates conforme DoD.
