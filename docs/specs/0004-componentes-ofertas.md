---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0011
implemented-by:
  - src/db/components-schema.ts
  - src/lib/components/schema.ts
  - src/lib/components/repository.ts
  - src/lib/offers/schema.ts
  - src/lib/offers/repository.ts
  - src/routes/api/components/index.ts
  - src/routes/api/classes/$id/offers.ts
  - src/components/components/component-form.tsx
  - src/components/offers/offer-form.tsx
  - src/hooks/components/use-components.ts
  - src/hooks/components/use-create-component.ts
  - src/hooks/offers/use-offers.ts
  - src/hooks/offers/use-create-offer.ts
  - src/routes/_app/components/index.tsx
  - src/routes/_app/components/new.tsx
  - src/routes/_app/classes/$id/offers.tsx
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

Nenhuma — os quatro casos de borda estão cobertos por testes.

## Definition of Done

```bash
bun run db:local:migrate ............ exit 0 (migrations 0004/0005 aplicadas)
bun run typecheck .................. exit 0
bun run check ...................... exit 0 (250 arquivos)
bun run test --run ................. 44 arquivos, 317 testes verdes
bun run test:coverage .............. 98,13% stmts/linhas, 98,85% funcs, 95,07% branches
scripts/docs-check ................ exit 0
```

## Revisão humana

- Resolvido no fechamento: componentes são cadastrados livremente pelo operador;
  a UI usa seleção múltipla simples de servidores ativos (checkboxes) para a
  oferta, com estado vazio explicando que a oferta pode existir sem professor.

## Verificação

DoD executado em 2026-09-09. As tabelas `components`, `class_offers` e
`offer_professors` são criadas pelas migrations 0004/0005 já aplicadas localmente
(`bun run db:local:migrate` exit 0). Casos de borda: (1) componente duplicado é
sinalizado com 409 e `existingComponent` após normalização de nome; (2) oferta
com `professorIds: []` é criada com 201; (3) professor inexistente ou
soft-deleted é rejeitado com 400 (`InvalidProfessorError`); (4) a mesma tupla
turma+componente é rejeitada com 409 (`DuplicateOfferError`), enquanto o mesmo
componente pode ser ofertado em outra turma. UI entrega listagem/criação de
componentes em `/components` e ofertas em `/classes/:id/offers`, com navegação
habilitada. Gates finais no estado integrado: typecheck/check/test/coverage/docs
conforme DoD acima.
