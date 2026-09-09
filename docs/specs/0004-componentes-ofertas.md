---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0011
implemented-by: []
---

# Cadastro de componentes curriculares e ofertas por turma

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir cadastrar componentes curriculares reutilizáveis e relacioná-los a turmas e professores, para apoiar filtro e autoria de registros.

## Fluxo

1. O operador cadastra componentes curriculares (Matemática, Programação etc.).
2. Na configuração da turma, o operador seleciona quais componentes são oferecidos.
3. Para cada componente oferecido, o operador seleciona um ou mais professores (servidores).
4. Durante a reunião, o sistema apresenta componentes e professores relacionados à turma.

## Contrato

- `POST /api/components` — cria componente curricular.
- `GET /api/components` — lista componentes.
- `POST /api/classes/:id/offers` — cria oferta de componente na turma.
- `GET /api/classes/:id/offers` — lista ofertas da turma.
- Payload de oferta: `componenteId`, lista de `professorIds`.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                | o sistema DEVE ⟨resposta⟩               |
| --- | ----------------------------------------------- | --------------------------------------- |
| 1   | um componente for cadastrado com nome duplicado | reutilizar ou sinalizar duplicidade     |
| 2   | uma oferta não possuir professor atribuído      | permitir oferta sem professor           |
| 3   | um professor não for servidor cadastrado        | rejeitar vinculação                     |
| 4   | a turma já tiver o mesmo componente ofertado    | rejeitar duplicidade de oferta na turma |

## Questões em aberto

- [ ]

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- Nomenclatura dos componentes padrão; UX de múltiplos professores por componente.

## Verificação

```text
(preencher no fechamento)
```
