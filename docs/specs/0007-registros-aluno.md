---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0013
  - ADR-0016
  - ADR-0012
  - ADR-0011
implemented-by: []
---

# Registros de aluno

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir criar múltiplos registros independentes sobre um aluno, com ou sem reunião, com campos opcionais de categoria, componente curricular, origem e inclusão na ata. Registros sem reunião devem aparecer automaticamente em reuniões onde o aluno é componente da turma.

## Fluxo

### Registro independente (sem reunião)

1. O operador acessa a ficha do aluno ou a tela de registros.
2. Cria um registro com texto livre e campos opcionais.
3. O registro é armazenado vinculado ao aluno e, opcionalmente, a uma turma/componente.
4. Em reuniões futuras em que o aluno for componente da turma, o registro aparece como "contexto do aluno".
5. O operador decide, por reunião, se inclui aquele registro independente na ata.

### Registro vinculado a uma reunião

1. Durante a discussão de um aluno em uma reunião Em andamento, o operador clica em adicionar registro.
2. Preenche texto livre obrigatório.
3. Opcionalmente seleciona categoria, componente curricular e origem (participante da reunião).
4. Define se o registro deve ser incluído na ata (padrão sim).
5. Salva e pode adicionar novos registros ao mesmo aluno na mesma reunião.

## Contrato

- `POST /api/students/:id/records` — cria registro independente do aluno.
- `POST /api/meetings/:id/students/:studentId/records` — cria registro vinculado à reunião.
- `GET /api/meetings/:id/students/:studentId/records` — lista registros do aluno na reunião, incluindo independentes aplicáveis.
- `PATCH /api/meetings/:id/records/:recordId` — edita registro vinculado à reunião (só se reunião Em andamento/Reaberta).
- `PATCH /api/meetings/:id/students/:studentId/records/:recordId/include` — define se registro independente entra na ata desta reunião.
- Payload independente: `texto` obrigatório; `turmaId`, `categoriaId`, `componenteId`, `origemId` (servidor), `incluirNaAta` opcionais.
- Payload vinculado: `texto` obrigatório; `categoriaId`, `componenteId`, `origemId`, `incluirNaAta` opcionais. `origemId` deve ser participante da reunião.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                                                             | o sistema DEVE ⟨resposta⟩                                             |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | o texto estiver vazio                                                                        | rejeitar com erro de validação                                        |
| 2   | a origem de um registro vinculado a reunião for um servidor que não participa da reunião     | rejeitar com erro de autoria inválida (CA-005)                        |
| 3   | o componente não for oferecido para a turma do aluno na data                                 | permitir, mas opcionalmente sinalizar desencontro                     |
| 4   | o registro for marcado como não incluir na ata                                               | armazenar normalmente e omitir na ata/PDF (CA-004)                    |
| 5   | a reunião estiver Finalizada e o operador tentar criar/editar registro vinculado à reunião   | rejeitar e informar necessidade de reabertura                         |
| 6   | o operador criar quatro registros para o mesmo aluno na mesma reunião                        | manter os quatro como registros independentes (CA-003)                |
| 7   | existir registro independente do aluno e a reunião incluir a turma à qual ele está vinculado | exibir o registro como contexto e permitir inclusão na ata            |
| 8   | existir registro independente do aluno mas a reunião não envolver a turma referenciada       | não exibir o registro como contexto nesta reunião                     |
| 9   | o operador desmarcar a inclusão de um registro independente na ata de uma reunião            | manter o registro original intacto; afetar apenas a ata desta reunião |

## Questões em aberto

- [ ]

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- Rótulos e ordem dos campos opcionais; fluidez da adição de múltiplos registros; UX de registros independentes durante o conselho.

## Verificação

```text
(preencher no fechamento)
```
