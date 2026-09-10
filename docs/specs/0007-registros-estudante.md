---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0013
  - ADR-0016
  - ADR-0012
  - ADR-0011
implemented-by:
  - src/db/records-schema.ts
  - src/lib/records/schema.ts
  - src/lib/records/repository.ts
  - src/lib/records/errors.ts
  - src/lib/records/types.ts
  - src/routes/api/students/$id/records.ts
  - src/routes/api/meetings/$meetingId/students/$studentId/records/index.ts
  - src/routes/api/meetings/$meetingId/records/$recordId.ts
  - src/routes/api/meetings/$meetingId/students/$studentId/records/$recordId/include.ts
  - src/hooks/records/use-records.ts
  - src/routes/_app/meetings/$meetingId/council.tsx
  - src/components/meetings/record-form.tsx
  - src/routes/api/meetings/$meetingId/classes/index.ts
---

# Registros de estudante

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir criar múltiplos registros independentes sobre um estudante, com ou sem reunião, com campos opcionais de categoria, componente curricular, origem e inclusão na ata. Registros sem reunião devem aparecer automaticamente em reuniões onde o estudante é componente da turma.

## Fluxo

### Registro independente (sem reunião)

1. O operador acessa a ficha do estudante ou a tela de registros.
2. Cria um registro com texto livre e campos opcionais.
3. O registro é armazenado vinculado ao estudante e, opcionalmente, a uma turma/componente.
4. Em reuniões futuras em que o estudante for componente da turma, o registro aparece como "contexto do estudante".
5. O operador decide, por reunião, se inclui aquele registro independente na ata.

### Registro vinculado a uma reunião

1. Durante a discussão de um estudante em uma reunião Em andamento, o operador clica em adicionar registro.
2. Preenche texto livre obrigatório.
3. Opcionalmente seleciona categoria, componente curricular e origem (participante da reunião).
4. Define se o registro deve ser incluído na ata (padrão sim).
5. Salva e pode adicionar novos registros ao mesmo estudante na mesma reunião.

## Contrato

- `POST /api/students/:id/records` — cria registro independente do estudante.
- `POST /api/meetings/:id/students/:studentId/records` — cria registro vinculado à reunião.
- `GET /api/meetings/:id/students/:studentId/records` — lista registros do estudante na reunião, incluindo independentes aplicáveis.
- `PATCH /api/meetings/:id/records/:recordId` — edita registro vinculado à reunião (só se reunião Em andamento/Reaberta).
- `PATCH /api/meetings/:id/students/:studentId/records/:recordId/include` — define se registro independente entra na ata desta reunião.
- Payload independente: `texto` obrigatório; `turmaId`, `categoriaId`, `componenteId`, `origemId` (servidor), `incluirNaAta` opcionais.
- Payload vinculado: `texto` obrigatório; `categoriaId`, `componenteId`, `origemId`, `incluirNaAta` opcionais. `origemId` deve ser participante da reunião.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                                                                 | o sistema DEVE ⟨resposta⟩                                             |
| --- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1   | o texto estiver vazio                                                                            | rejeitar com erro de validação                                        |
| 2   | a origem de um registro vinculado a reunião for um servidor que não participa da reunião         | rejeitar com erro de autoria inválida (CA-005)                        |
| 3   | o componente não for oferecido para a turma do estudante na data                                 | permitir, mas opcionalmente sinalizar desencontro                     |
| 4   | o registro for marcado como não incluir na ata                                                   | armazenar normalmente e omitir na ata/PDF (CA-004)                    |
| 5   | a reunião estiver Finalizada e o operador tentar criar/editar registro vinculado à reunião       | rejeitar e informar necessidade de reabertura                         |
| 6   | o operador criar quatro registros para o mesmo estudante na mesma reunião                        | manter os quatro como registros independentes (CA-003)                |
| 7   | existir registro independente do estudante e a reunião incluir a turma à qual ele está vinculado | exibir o registro como contexto e permitir inclusão na ata            |
| 8   | existir registro independente do estudante mas a reunião não envolver a turma referenciada       | não exibir o registro como contexto nesta reunião                     |
| 9   | o operador desmarcar a inclusão de um registro independente na ata de uma reunião                | manter o registro original intacto; afetar apenas a ata desta reunião |

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

- Resolvido no fechamento: API e hooks prontos; a tela council continuará a consumir esses hooks na integração final de UX sem alterar o contrato.

## Verificação

DoD executado em 2026-09-09. Modelos `student_records` e
`record_meeting_inclusions` criam as migrations 0006 (nomeada) e estão aplicadas
localmente. Bordas: texto vazio → 400; origem não participante → 422; componente
fora da oferta é permitido; incluirNaAta=false é persistido; reunião finalizada
→ 409 pedindo reabertura; múltiplos registros coexistem; contexto independente é
filtrado pelas turmas da reunião; toggle de inclusão grava somente a decisão por
reunião, preservando o registro original. Gates conforme DoD acima.
