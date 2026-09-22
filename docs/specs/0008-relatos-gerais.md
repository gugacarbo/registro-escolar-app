---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0013
  - ADR-0016
  - ADR-0012
implemented-by:
  - src/db/general-reports-schema.ts
  - src/lib/general-reports/schema.ts
  - src/lib/general-reports/repository.ts
  - src/lib/general-reports/errors.ts
  - src/lib/general-reports/types.ts
  - src/routes/api/meetings/$meetingId/general-reports/index.ts
  - src/routes/api/meetings/$meetingId/general-reports/$reportId.ts
  - src/hooks/general-reports/use-general-reports.ts
  - src/components/meetings/general-report-form.tsx
---

# Relatos gerais da reunião

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir registrar observações gerais sobre a reunião, independentes de estudantes, com categoria, autor e controle de inclusão na ata.

## Fluxo

1. Em uma reunião `open`, o operador acessa a seção de relatos gerais.
2. Preenche o texto livre.
3. Opcionalmente seleciona categoria, autor participante e inclusão na ata.
4. Salva o relato.
5. Relatos podem ser editados enquanto a reunião estiver `open`.

## Contrato

- `POST /api/meetings/:id/general-reports` — cria relato geral.
- `GET /api/meetings/:id/general-reports` — lista relatos.
- `PATCH /api/meetings/:id/general-reports/:reportId` — edita relato.
- Payload: `texto` obrigatório; `categoriaId`, `origemId`, `incluirNaAta` opcionais.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                       | o sistema DEVE ⟨resposta⟩                    |
| --- | ------------------------------------------------------ | -------------------------------------------- |
| 1   | o relato tiver autor que não é participante da reunião | rejeitar com erro de autoria inválida        |
| 2   | o relato for marcado como interno                      | armazenar e omitir na ata/PDF                |
| 3   | a reunião não estiver `open`                           | rejeitar criação/edição                      |
| 4   | o texto estiver vazio                                  | rejeitar com erro de validação               |
| 5   | todos os relatos forem removidos da ata                | ata ainda deve ser gerável com demais blocos |

## Questões em aberto

Nenhuma — os casos de borda estão cobertos por testes.

## Definition of Done

```bash
bun run db:local:migrate ............ exit 0
bun run typecheck .................. exit 0
bun run check ...................... exit 0 (276 arquivos)
bun run test --run ................. 53 arquivos, 408 testes verdes
bun run test:coverage .............. 98,24% stmts/linhas, 99,02% funcs, 95,05% branches
scripts/docs-check ................ exit 0
```

## Revisão humana

- Resolvido no fechamento: API completa; a tela council consumirá o endpoint na integração final de UX sem alterar o contrato.

## Verificação

DoD executado em 2026-09-09. A migration nomeada 0007 cria `general_reports`
e foi aplicada localmente. Bordas: autor não participante → 422; relato interno
fica `includeInMinutes=false` e será omitido da ata/PDF; criação/edição exigem
reunião `open`; texto vazio → 400; ausência total de
relatos incluídos não impede a futura geração da ata (blocos opcionais).
Gates conforme DoD acima.
