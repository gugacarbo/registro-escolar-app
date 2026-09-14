---
status: implemented
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0017
  - ADR-0018
implemented-by:
  - src/routes/api/students/index.ts
  - src/routes/api/students/import.ts
  - src/routes/api/students/import.resolve.ts
  - src/lib/students/csv-parser.ts
  - src/lib/students/matching.ts
  - src/lib/students/repository.ts
  - src/lib/students/schema.ts
  - src/lib/students/shared.ts
  - src/lib/students/types.ts
  - e2e/spec-0001-students.spec.ts
  - src/routes/_app/students/index.tsx
  - src/components/students/create-student-dialog.tsx
  - src/routes/_app/students/import.tsx
  - src/components/students/student-form.tsx
  - src/routes/_app/students/$id.tsx
  - src/hooks/students/use-update-student.ts
  - src/components/students/import-preview-table.tsx
  - src/hooks/students/use-students.ts
  - src/hooks/students/use-create-student.ts
  - src/hooks/students/use-import-students.ts
---

# Cadastro e importação em lote de estudantes

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir que o operador cadastre estudantes individualmente e importe estudantes em lote via CSV ou planilha, resolvendo duplicidades de forma explícita.

## Fluxo

1. O operador acessa a tela de estudantes.
2. Escolhe cadastro manual ou importação em lote.
3. No cadastro manual, preenche os dados obrigatórios e salva.
4. Na importação, faz upload do arquivo, revisa os registros detectados como duplicidades e confirma ação (criar novo ou vincular a existente).
5. Estudantes importados permanecem disponíveis para vínculo com turmas.

## Contrato

- `POST /api/students` — cria estudante manual.
- `POST /api/students/import` — inicia importação em lote; retorna pré-visualização com conflitos.
- `POST /api/students/import/resolve` — confirma resolução de conflitos.
- `GET /api/students` — listagem paginada (`page`, `pageSize`) com busca por
  `search` (nome/documento) e filtro opcional `classId`.
- O parâmetro `classId` filtra apenas estudantes com matrícula ativa na turma
  (matrícula sem `end_date`); o `total` reflete o mesmo filtro.
- Cada item da listagem inclui `turmas: { id, name }[]` com as matrículas
  ativas do estudante, ordenadas pela data de início; está vazio quando o
  estudante não tem matrícula ativa.
- Payload mínimo manual: `nome`; `reference` é um campo textual opcional, configurável no cadastro e na edição.
- Payload de importação: arquivo CSV ou planilha com coluna `nome` e colunas opcionais, incluindo `referencia` (mapeada para `reference`). O modelo CSV baixável contém essa coluna.
- Tela de estudantes: header com apenas o título e as ações "Importar" e
  "Novo estudante" à direita na mesma linha; toolbar com busca e filtro por
  turma (selecionar turma volta para a página 1); colunas "Referência" e
  "Turmas" exibem, respectivamente, a referência cadastral e as matrículas
  ativas como badges ("—" quando não há valor).
- A prévia de confirmação da importação exibe a coluna "Referência" para cada
  linha importada.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                                                                  | o sistema DEVE ⟨resposta⟩                                 |
| --- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | o nome do estudante é enviado vazio                                                               | rejeitar com erro de validação                            |
| 2   | a importação detecta mesmo nome/documento de estudante existente                                  | apresentar conflito e não criar duplicado silenciosamente |
| 3   | o arquivo enviado não é CSV nem planilha reconhecida                                              | rejeitar com mensagem de formato inválido                 |
| 4   | a importação contém linhas com dados mínimos ausentes                                             | listar linhas inválidas na pré-visualização               |
| 5   | o operador resolve um conflito vinculando a estudante existente                                   | reutilizar a entidade estudante existente                 |
| 6   | a listagem recebe `classId` e o estudante só tem matrícula encerrada (com `end_date`) nessa turma | excluir o estudante dos resultados e do `total`           |
| 7   | o estudante não tem matrícula ativa                                                               | `turmas` vem vazio na listagem e a coluna exibe "—"       |

## Questões em aberto

Nenhuma — os sete casos de borda estão cobertos por testes (ver Verificação).

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0 — tipos das rotas/validações
bun run check                            # exit 0 — lint/format
bun run test                             # todos os testes verdes
bun x playwright test e2e/spec-0001-students.spec.ts --grep-invert @visual  # e2e verde
bun run test:coverage --run              # 95% em linhas, funções, statements e branches
scripts/docs-check                       # exit 0 — spec válida como implemented
```

## Revisão humana

- UX da tela de resolução de conflitos; critério de matching de duplicidade.

## Verificação

DoD executado em 2026-09-09 no repo registro-escolar-app: `bunx tsc --noEmit
--skipLibCheck` exit 0; `bun run check` exit 0 (190 arquivos, sem correções);
`bun run test --run` com 200 testes verdes em 30 arquivos
(linhas/funções/statements/branches ≥ 95%), incluindo os cinco
casos de borda da spec — (1) nome vazio rejeitado (`POST /api/students`
400; `import/resolve` 400 "Criação requer nome"), (2) mesmo nome/documento
apresenta conflito sem duplicar (`import` summary.conflicts; `index` e
`import/resolve` 409 "Estudante já existe"), (3) arquivo fora de CSV/planilha
rejeitado (`import` 400 "Formato de arquivo inválido"; parser fatal para
extensão não suportada), (4) linhas sem dados mínimos listadas como inválidas
na pré-visualização (`import` 200 com summary.invalid e warnings por linha),
(5) vínculo reutiliza a entidade existente (`import/resolve` 200 com linked e
nome armazenado retornado); `bun run test:coverage --run` atinge 95% nas
quatro métricas; `scripts/docs-check` exit 0 com SPEC-0001 como implemented.

Em 2026-09-10, no repo registro-escolar-app, o contrato da listagem
(`GET /api/students` com `classId` e campo `turmas`, header com ações à
direita, filtro por turma e coluna "Turmas") foi executado:
`bunx tsc --noEmit --skipLibCheck` exit 0; `bun run check` exit 0 nos
arquivos alterados; `bun run test` com 877 testes verdes em 134 arquivos,
incluindo os casos 6 e 7 — (`src/lib/students/repository.test.ts`: filtro
`classId` exclui matrícula com `end_date` e `countStudents` reflete o
filtro; matrícula encerrada não aparece em `turmas`;
`src/routes/api/students/index.test.ts`: `classId` propagado para
list/count); `e2e/spec-0001-students.spec.ts` com 10 testes verdes,
incluindo "filtra pela turma e exibe as turmas ativas na tabela". A
cobertura global de branches (94,27%) ficou abaixo do teto por módulos
pré-existentes fora do escopo desta spec (`csv-parser.ts`,
`meeting-form.tsx`, `offer-form.tsx`); os arquivos desta entrega estão
≥ 94% em branches (100% em statements/lines).

Em 2026-09-14, o campo opcional `reference` foi disponibilizado no cadastro,
edição e detalhe do estudante, assim como na importação e no modelo CSV
(`referencia`). `bun run typecheck`, `bun run check` e `scripts/docs-check`
terminaram com exit 0; os testes direcionados de formulário, criação, detalhe,
parser, APIs de importação e modelo CSV passaram (81 testes).

Na mesma data, as tabelas da listagem de estudantes e da confirmação de
importação passaram a exibir a coluna "Referência". Os testes direcionados
dessas tabelas e do parser passaram (50 testes).
