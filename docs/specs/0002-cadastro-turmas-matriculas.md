---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0015
implemented-by:
  - src/db/classes-schema.ts
  - src/db/enrollments-schema.ts
  - src/lib/classes/schema.ts
  - src/lib/classes/repository.ts
  - src/lib/enrollments/schema.ts
  - src/lib/enrollments/repository.ts
  - src/routes/api/classes/index.ts
  - src/routes/api/enrollments/index.ts
  - src/routes/api/classes/$id/students.ts
  - src/components/classes/class-form.tsx
  - src/components/enrollments/enrollment-form.tsx
  - src/components/enrollments/enrollment-dialog.tsx
  - src/hooks/classes/use-classes.ts
  - src/hooks/classes/use-create-class.ts
  - src/hooks/enrollments/use-class-students.ts
  - src/hooks/enrollments/use-create-enrollment.ts
  - src/routes/_app/classes/index.tsx
  - src/components/classes/create-class-dialog.tsx
  - src/routes/_app/classes/enroll.tsx
  - src/routes/_app/classes/$id/students.tsx
---

# Cadastro de turmas e vínculos de matrícula

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir criar turmas vinculadas a períodos letivos e registrar o vínculo histórico de estudantes com cada turma, preservando mudanças de série/curso/período.

## Fluxo

1. O operador cadastra uma turma informando nome, período letivo e campos opcionais (curso, série, turno).
2. Na visualização da turma, o operador pode selecionar vários estudantes ainda não vinculados ativamente e definir a data de início e o término opcional para matriculá-los em lote como vínculos ativos.
3. Na visualização do estudante, o operador pode escolher uma turma ainda não vinculada ativamente, definir a data de início e matriculá-lo diretamente como vínculo ativo.
4. O sistema exibe vínculos ativos e históricos.
5. Mudanças de turma encerram o vínculo anterior e abrem novo vínculo sem apagar histórico.

## Contrato

- `POST /api/classes` — cria turma.
- `GET /api/classes` — lista turmas.
- `POST /api/enrollments` — cria/encerra vínculo estudante-turma.
- `GET /api/classes/:id/students?date=YYYY-MM-DD` — retorna estudantes da turma na data informada.
- A matrícula em lote da visualização da turma reutiliza `POST /api/enrollments` para cada estudante selecionado.
- A matrícula direta da visualização do estudante reutiliza `POST /api/enrollments` com o estudante já definido.
- Payload de turma: `nome`, `periodoLetivo`, campos opcionais `curso`, `serie`, `turno`.
- Payload de vínculo: `estudanteId`, `turmaId`, `dataInicio`, `dataTermino` opcional, `status`.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                                           | o sistema DEVE ⟨resposta⟩                        |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | duas turmas equivalentes de períodos diferentes forem criadas              | tratá-las como entidades distintas               |
| 2   | um estudante for transferido para outra turma                              | encerrar vínculo antigo e preservar histórico    |
| 3   | uma reunião consultar estudantes da turma em data fora de qualquer vínculo | não incluir o estudante na lista daquela reunião |
| 4   | houver vínculos sobrepostos para o mesmo estudante na mesma turma          | rejeitar ou sinalizar inconsistência             |
| 5   | o vínculo não possuir data de término                                      | considerá-lo ativo até nova data de término      |
| 6   | o estudante já tiver vínculo ativo na turma                                | não oferecê-lo para nova seleção na matrícula em lote |
| 7   | o estudante já tiver vínculo ativo em uma turma                             | não oferecê-la para matrícula direta             |

## Questões em aberto

Nenhuma — os sete casos de borda estão cobertos por testes.

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
bun run test src/components/enrollments/enrollment-dialog.test.tsx src/hooks/enrollments/use-create-enrollment.test.tsx 'src/routes/_app/classes/$id/students.test.tsx' 'src/routes/_app/students/$id.test.tsx' --run # novos fluxos verdes
```

## Revisão humana

- Regra de negócio para sobreposição de vínculos e UX de encerramento.

## Verificação

```text
bun run db:local:migrate ............ exit 0 (No migrations to apply)
bunx tsc --noEmit --skipLibCheck .... exit 0
bun run check ....................... exit 0 (190 files)
bun run test ........................ 30 files, 200 tests, tudo verde
bun run test:coverage ............... All files 98.48% (teto >= 95%)
bun run e2e ......................... 1 falha pré-existente em e2e/home.spec.ts
                                      ("Carregando" — spec não tocado pela spec 0002)
Bordas: 1 duplicatas coexistem; 2 transferência encerra anterior
  (endDate = novaStart − 1 dia, status transferida); 3 fora de vínculo → 200 [];
  4 sobreposição mesma turma → 409; 5 endDate null ativo em data futura;
  6 e 7 vínculos ativos são excluídos das opções de matrícula.

Validação adicional executada em 2026-09-14: o diálogo reutilizável permite
selecionar múltiplos estudantes e dispara uma matrícula por estudante; o detalhe
do estudante fixa o estudante e oferece turmas elegíveis. A invalidação cobre
listas e detalhes de estudantes e turmas. Suíte completa: 161 arquivos e 1.044
testes verdes; `bun run build` e `scripts/docs-check` devem permanecer verdes.
```
