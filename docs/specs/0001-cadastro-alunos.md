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
  - src/routes/_app/students/index.tsx
  - src/routes/_app/students/new.tsx
  - src/routes/_app/students/import.tsx
  - src/components/students/student-form.tsx
  - src/components/students/import-preview-table.tsx
  - src/hooks/students/use-students.ts
  - src/hooks/students/use-create-student.ts
  - src/hooks/students/use-import-students.ts
---

# Cadastro e importação em lote de alunos

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir que o operador cadastre alunos individualmente e importe alunos em lote via CSV ou planilha, resolvendo duplicidades de forma explícita.

## Fluxo

1. O operador acessa a tela de alunos.
2. Escolhe cadastro manual ou importação em lote.
3. No cadastro manual, preenche os dados obrigatórios e salva.
4. Na importação, faz upload do arquivo, revisa os registros detectados como duplicidades e confirma ação (criar novo ou vincular a existente).
5. Alunos importados permanecem disponíveis para vínculo com turmas.

## Contrato

- `POST /api/students` — cria aluno manual.
- `POST /api/students/import` — inicia importação em lote; retorna pré-visualização com conflitos.
- `POST /api/students/import/resolve` — confirma resolução de conflitos.
- Payload mínimo manual: `nome`.
- Payload de importação: arquivo CSV ou planilha com coluna `nome` e colunas opcionais.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                             | o sistema DEVE ⟨resposta⟩                                 |
| --- | ------------------------------------------------------------ | --------------------------------------------------------- |
| 1   | o nome do aluno é enviado vazio                              | rejeitar com erro de validação                            |
| 2   | a importação detecta mesmo nome/documento de aluno existente | apresentar conflito e não criar duplicado silenciosamente |
| 3   | o arquivo enviado não é CSV nem planilha reconhecida         | rejeitar com mensagem de formato inválido                 |
| 4   | a importação contém linhas com dados mínimos ausentes        | listar linhas inválidas na pré-visualização               |
| 5   | o operador resolve um conflito vinculando a aluno existente  | reutilizar a entidade aluno existente                     |

## Questões em aberto

Nenhuma — os cinco casos de borda estão cobertos por testes (ver Verificação).

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0 — tipos das rotas/validações
bun run check                            # exit 0 — lint/format
bun run test --run                       # 200 testes verdes
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
`import/resolve` 409 "Aluno já existe"), (3) arquivo fora de CSV/planilha
rejeitado (`import` 400 "Formato de arquivo inválido"; parser fatal para
extensão não suportada), (4) linhas sem dados mínimos listadas como inválidas
na pré-visualização (`import` 200 com summary.invalid e warnings por linha),
(5) vínculo reutiliza a entidade existente (`import/resolve` 200 com linked e
nome armazenado retornado); `bun run test:coverage --run` atinge 95% nas
quatro métricas; `scripts/docs-check` exit 0 com SPEC-0001 como implemented.
