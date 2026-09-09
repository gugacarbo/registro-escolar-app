---
status: draft
date: 2026-09-08
spec: docs/specs/0001-cadastro-alunos.md
builds-on:
  - ADR-0011
  - ADR-0017
  - ADR-0018
implemented-by: []
---

# Plano de implementação — Cadastro e importação em lote de alunos

> Especificação: [docs/specs/0001-cadastro-alunos.md](0001-cadastro-alunos.md)
> Convenções: `docs/context/CONVENTIONS.md`

## Global Constraints

- **Stack:** TanStack Start (React + Vite) + Cloudflare Workers + D1 (SQLite) + Drizzle ORM + Better Auth + shadcn/ui + Tailwind CSS v4.
- **Runtime:** bun como gerenciador de pacotes e runtime de build; código deve rodar em Cloudflare Workers (evitar APIs Node-only em rotas API).
- **Validação:** schemas Zod derivados do Drizzle (`insertSchema`, `selectSchema`) para modelos persistidos.
- **Formulários:** react-hook-form + wrappers de `src/components/ui/form.tsx`.
- **Requisições assíncronas:** TanStack Query com invalidação explícita de cache.
- **Banco de dados:** migrations geradas pelo Drizzle Kit com `--name=<descritivo-kebab>`.
- **Qualidade:** `bun run check` e `bunx tsc --noEmit --skipLibCheck` devem passar.
- **Testes:** testes unitários/integração com Vitest; e2e com Playwright para fluxos críticos.
- **Idioma:** nomes de entidades/campos em inglês no código (`students`, `name`, etc.); labels da UI, docs e mensagens de erro em português.
- **Autenticação:** rotas protegidas exigem sessão ativa do Better Auth; modelo single-tenant/operador único (ADR-0017).
- **Importação:** detecção de duplicidade com decisão manual obrigatória; nunca merge automático nem vinculação automática a turma.

## Resumo executivo

Implementar o cadastro de alunos como entidade independente (ADR-0011), com
criação manual e importação em lote via CSV/planilha (ADR-0018), em ambiente
single-tenant e operador único (ADR-0017). A importação deve detectar
possíveis duplicidades e apresentar uma etapa de resolução de conflitos antes
de persistir.

## Escopo

### Dentro do escopo

- Entidade `students` no banco de dados.
- Três endpoints de API:
  - `POST /api/students` — cadastro manual.
  - `POST /api/students/import` — upload e pré-visualização com conflitos.
  - `POST /api/students/import/resolve` — confirmação da resolução.
- Tela de listagem/cadastro de alunos.
- Wizard de importação em lote (upload → revisão de conflitos → confirmação).
- Testes unitários, de integração da API e e2e do fluxo crítico.
- Migration do banco nomeada via Drizzle Kit.

### Fora do escopo deste plano

- Vínculo de alunos a turmas (especificação 0002).
- Autenticação/RBAC granular (já coberto por ADR-0008/ADR-0017).
- Integração automática com sistemas externos (fora do escopo, conforme ADR-0018).
- Geração de PDF ou relatórios.

## Decisões técnicas

| Tópico | Decisão | Racional |
| --- | --- | --- |
| Banco de dados | Tabela `students` em D1/SQLite via Drizzle ORM | ADR-0003, ADR-0004, ADR-0011 |
| Aluno como entidade independente | Sem coluna `turmaId`; vínculo separado futuro | ADR-0011, ADR-0018 |
| Validação | Zod derivado do schema Drizzle (`insertSchema`, `selectSchema`) | CONVENTIONS.md — schemas derivados |
| API | Rotas do TanStack Start em `src/routes/api/students/*.ts` | ADR-0006, ADR-0007 |
| Autenticação | Proteger rotas via middleware de sessão (Better Auth) | ADR-0008, ADR-0017 |
| Formulários | react-hook-form + componentes `src/components/ui/form.tsx` | CONVENTIONS.md — formulários |
| Requisições assíncronas | TanStack Query + invalidação explícita | CONVENTIONS.md — requisições/cache |
| CSV/Planilha | Biblioteca leve de parse (ex.: `papaparse` para CSV; `xlsx` para planilhas) | Runtime Workers — avaliar bundle/compatibilidade |
| Matching de duplicidade | Normalização de nome + documento opcional; nunca merge automático | ADR-0018, caso de borda #2 |
| Armazenamento temporário de importação | Estado somente no cliente durante o wizard (pré-visualização retornada pelo servidor) | Evita estado server-side complexo; fluxo síncrono de confirmação |

## Entregáveis e estrutura de arquivos

### Backend

```text
src/
  db/
    schema.ts                     # adicionar tabela students
    migrations/                   # gerado por drizzle-kit generate --name=cria-tabela-alunos
  routes/
    api/students/
      index.ts                    # POST /api/students (create)
      import.ts                   # POST /api/students/import (preview)
      import.resolve.ts           # POST /api/students/import/resolve (confirm)
  lib/
    students/
      schema.ts                   # Zod derivado do Drizzle
      repository.ts               # acesso a dados (create, findById, findByNameDoc, list)
      matching.ts                 # algoritmo de detecção de duplicidade
      csv-parser.ts               # parser de CSV/planilha para preview
      types.ts                    # tipos compartilhados
      import.test.ts              # testes de matching e parser
      repository.test.ts          # testes do repository (mock/in-memory)
```

### Frontend

```text
src/
  routes/
    app/
      students/
        index.tsx                 # /app/students — listagem + botões
        new.tsx                     # /app/students/new — formulário manual
        import.tsx                  # /app/students/import — wizard de importação
  components/
    students/
      student-form.tsx            # formulário reutilizável (create/edit)
      import-preview-table.tsx    # tabela de pré-visualização com conflitos
      conflict-resolver.tsx       # linha de resolução de conflito
  hooks/
    students/
      use-students.ts             # queries TanStack Query
      use-create-student.ts       # mutation create
      use-import-students.ts      # mutations import + resolve
```

> Os caminhos de rotas seguem a convenção de file-based routing do TanStack Start.
> O prefixo `/app` protegido pode ser implementado via layout de autenticação.

## Modelo de dados

### Tabela `students` (src/db/schema.ts)

```ts
export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  document: text("document"),       // opcional — RG/CPF ou documento da escola
  registrationNumber: text("registration_number"), // opcional — número de matrícula
  email: text("email"),
  phone: text("phone"),
  birthDate: integer("birth_date", { mode: "timestamp_ms" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});
```

#### Índices recomendados

- `students_name_idx` em `name` — acelera busca por duplicidade.
- `students_document_idx` em `document` — matching por documento.

> Campos adicionais (responsável, endereço, etc.) podem ser adicionados em
> especificações futuras. Nesta entrega, mantém-se o mínimo exigido pela spec.

## Contratos de API

### 1. `POST /api/students`

Cria um aluno manualmente.

**Request body (Zod / insertSchema):**

```json
{
  "name": "João Silva",
  "document": "12345678900",
  "registrationNumber": "20260001",
  "email": "joao@escola.edu.br",
  "phone": "(11) 99999-9999",
  "birthDate": "2010-05-20",
  "notes": ""
}
```

**Response 201:**

```json
{
  "id": "uuid",
  "name": "João Silva",
  ...
}
```

**Response 400:** erro de validação detalhado (Zod error map).

**Response 409:** aluno já existe (matching por nome/documento) — retorna
`existingStudent` para o operador decidir.

### 2. `POST /api/students/import`

Faz upload de arquivo e retorna pré-visualização com conflitos.

**Request:** `multipart/form-data` com campo `file`.

**Response 200:**

```json
{
  "rows": [
    { "index": 1, "name": "João Silva", "document": "123", "status": "conflict", "existingStudentId": "uuid", "existingStudentName": "João Silva" },
    { "index": 2, "name": "Maria Souza", "document": "", "status": "valid" },
    { "index": 3, "name": "", "document": "", "status": "invalid", "errors": ["nome é obrigatório"] }
  ],
  "summary": { "total": 3, "valid": 1, "conflicts": 1, "invalid": 1 }
}
```

**Response 400:** formato de arquivo inválido ou arquivo ausente.

### 3. `POST /api/students/import/resolve`

Confirma a resolução dos conflitos.

**Request body:**

```json
{
  "rows": [
    { "index": 1, "action": "link", "existingStudentId": "uuid" },
    { "index": 2, "action": "create", "data": { "name": "Maria Souza" } },
    { "index": 3, "action": "skip" }
  ]
}
```

**Ações permitidas:** `create`, `link`, `skip`.

**Response 200:**

```json
{
  "created": 1,
  "linked": 1,
  "skipped": 1,
  "students": [ { "id": "...", "name": "..." } ]
}
```

**Response 400:** resolução inconsistente (ex.: `link` sem `existingStudentId`).

## Algoritmo de matching de duplicidade

1. Normalizar `name`: trim, lowercase, remover acentos e espaços extras.
2. Se `document` estiver preenchido no arquivo e no banco, comparar documento
   normalizado (apenas dígitos).
3. Se documento ausente, comparar nome normalizado com distância exata ou
   limiar de similaridade (ex.: Levenshtein ≤ 1 para nomes curtos).
4. Retornar candidatos ordenados por similaridade; marcar como `conflict` os
   que atingirem o limiar.
5. Nunca criar automaticamente como duplicado; sempre exigir decisão do
   operador (caso de borda #2).

> O critério exato de similaridade deve ser validado na revisão humana, conforme
> a especificação.

## Fluxo de telas

### Tela `/app/students`

- Listagem paginada de alunos (TanStack Table).
- Botões: "Novo aluno" e "Importar alunos".
- Ação de busca por nome/documento.

### Tela `/app/students/new`

- Formulário manual com `name` obrigatório e campos opcionais.
- Ao salvar, chama `useCreateStudent` e invalida a listagem.
- Se API retornar 409, apresentar modal/link para o aluno existente.

### Tela `/app/students/import`

Wizard em passos:

1. **Upload:** drag-and-drop ou input de arquivo; valida extensão
   (`.csv`, `.xlsx`, `.xls`, `.ods`).
2. **Pré-visualização:** tabela com todas as linhas, status (`valid`,
   `conflict`, `invalid`) e ações por conflito:
   - "Criar novo" — mantém ação `create`.
   - "Vincular a existente" — abre seleção do aluno existente; ação `link`.
   - "Ignorar" — ação `skip`.
3. **Confirmação:** resumo das ações; botão "Confirmar importação".
4. **Resultado:** contador de criados/vinculados/ignorados; botão para listagem.

# Task 1: Infra e modelo de dados de alunos

Criar a entidade `students` no banco e seus schemas Zod derivados, sem expor
API nem UI. Esta tarefa é base para todas as demais.

### Critérios de aceite

- Tabela `students` em `src/db/schema.ts` com campos: `id`, `name` (notNull),
  `document`, `registrationNumber`, `email`, `phone`, `birthDate`, `notes`,
  `createdAt`, `updatedAt`.
- Índices: `students_name_idx`, `students_document_idx`.
- Migration gerada com `bun run db:generate --name=cria-tabela-alunos`.
- Schemas Zod derivados em `src/lib/students/schema.ts`: `createStudentSchema`,
  `updateStudentSchema`, `selectStudentSchema`.
- Repository em `src/lib/students/repository.ts` com funções:
  `createStudent(db, data)`, `findStudentById(db, id)`,
  `findStudentsByNameOrDocument(db, opts)`, `listStudents(db, opts)`.
- Testes unitários do repository usando D1 mockado (sem depender de banco real).
- `bun run check` e `bunx tsc --noEmit --skipLibCheck` passam.

### Write set esperado

- `src/db/schema.ts`
- `src/db/index.ts` (se necessário exportar `students`)
- `src/lib/students/schema.ts`
- `src/lib/students/repository.ts`
- `src/lib/students/repository.test.ts`
- `src/lib/students/types.ts` (opcional)
- `drizzle/` (migration gerada)
- `package.json` se novas dependências forem adicionadas

# Task 2: API de cadastro manual de alunos

Implementar `POST /api/students` com validação, criação e detecção de
duplicidade. Proteger rota com sessão ativa do Better Auth.

### Critérios de aceite

- Rota `POST /api/students` em `src/routes/api/students/index.ts`.
- Recebe JSON validado por `createStudentSchema`.
- Retorna 201 com o aluno criado.
- Retorna 400 se validação falhar (nome vazio, etc.).
- Retorna 409 se `name` normalizado e/ou `document` normalizado coincidirem
  com aluno existente; corpo inclui `existingStudent`.
- Requer sessão ativa (Better Auth); 401/403 sem sessão.
- Testes de integração da rota (mock de auth e DB).
- `bun run check`, `bunx tsc --noEmit --skipLibCheck` e `bun run test` passam.

### Write set esperado

- `src/routes/api/students/index.ts`
- `src/lib/students/repository.ts` (pode adicionar helpers)
- `src/lib/students/matching.ts` (função de normalização/duplicidade)
- Testes da rota (ex.: `src/routes/api/students/index.test.ts` ou em `src/lib/students/`)

# Task 3: Parser e matching de importação em lote

Implementar o parser de CSV/planilha e o algoritmo de detecção de duplicidade
para importação. Ainda sem expor endpoint HTTP.

### Critérios de aceite

- Parser em `src/lib/students/csv-parser.ts` que aceita `File`/`Blob` e
  retorna array de `{ index, name, document, ...outros campos, errors }`.
  Suportar CSV obrigatoriamente; XLSX/ODS desejável (escolher biblioteca
  compatível com Workers ou fallback para CSV se necessário).
- Rejeitar arquivos que não sejam CSV/XLSX/XLS/ODS.
- Linhas sem `name` devem ser marcadas como `invalid` com mensagem em
  português.
- Matching em `src/lib/students/matching.ts`: receber linha parseada + alunos
  existentes e retornar `conflict` com candidatos ordenados por similaridade,
  ou `valid`.
- Normalização de nome (trim, lowercase, sem acentos, espaços colapsados) e
  documento (apenas dígitos).
- Critério: (a) documento exato quando ambos preenchidos; (b) nome exato após
  normalização se documento ausente; (c) similaridade opcional desativada por
  padrão (limiar 1.0 = exato).
- Testes unitários cobrindo: CSV válido, CSV com colunas extras, linha sem nome,
  arquivo inválido, matching por documento, matching por nome, não-conflicto.
- `bun run check`, `bunx tsc --noEmit --skipLibCheck` e `bun run test` passam.

### Write set esperado

- `src/lib/students/csv-parser.ts`
- `src/lib/students/matching.ts`
- `src/lib/students/import.test.ts`
- `package.json` (dependências de parse CSV/planilha)

# Task 4: API de importação em lote

Implementar `POST /api/students/import` (pré-visualização) e
`POST /api/students/import/resolve` (confirmação). Proteger rotas com sessão.

### Critérios de aceite

- `POST /api/students/import` recebe `multipart/form-data` com campo `file`,
  chama parser e matching, retorna `rows` + `summary`.
- `POST /api/students/import/resolve` recebe array de resoluções (`create`,
  `link`, `skip`); valida consistência; executa ações; retorna contadores e
  alunos afetados.
- `link` vincula a `existingStudentId` (sem criar novo aluno, mas sem alterar
  o aluno existente além disso).
- `create` insere novo aluno com os dados da linha.
- `skip` ignora a linha.
- 400 se ação `link` sem `existingStudentId` ou ação inválida.
- Testes de integração das rotas com auth e DB mockados.
- `bun run check`, `bunx tsc --noEmit --skipLibCheck` e `bun run test` passam.

### Write set esperado

- `src/routes/api/students/import.ts`
- `src/routes/api/students/import.resolve.ts`
- Testes das rotas
- `src/lib/students/repository.ts` (helpers adicionais se necessário)

# Task 5: Frontend — listagem e cadastro manual

Criar layout protegido `/app`, tela de listagem e formulário manual de alunos.

### Critérios de aceite

- Layout/rota protegida `/app` (redireciona para login se não autenticado).
- Tela `/app/students` listando alunos com busca por nome/documento e botões
  "Novo aluno" / "Importar alunos".
- Tela `/app/students/new` com formulário react-hook-form usando
  `createStudentSchema` e componentes `src/components/ui/form.tsx`.
- Hook `useCreateStudent` com mutation e invalidação de `students` query key.
- Exibir toast/erro em caso de 409/400.
- `bun run check` e `bunx tsc --noEmit --skipLibCheck` passam.

### Write set esperado

- `src/routes/app/__layout.tsx` ou `src/routes/app/route.tsx`
- `src/routes/app/students/index.tsx`
- `src/routes/app/students/new.tsx`
- `src/components/students/student-form.tsx`
- `src/hooks/students/use-students.ts`
- `src/hooks/students/use-create-student.ts`
- `src/routes/app/index.tsx` (dashboard/home pós-login, opcional)

# Task 6: Frontend — wizard de importação

Criar tela de importação em lote com upload, pré-visualização e resolução de
conflitos.

### Critérios de aceite

- Tela `/app/students/import` com wizard em passos.
- Passo 1: upload de arquivo com validação de extensão.
- Passo 2: pré-visualização das linhas com status (`valid`, `conflict`,
  `invalid`) e ações de resolução por conflito (`create`, `link`, `skip`).
- Passo 3: confirmação e chamada a `POST /api/students/import/resolve`.
- Passo 4: resumo do resultado.
- Hooks `useImportStudents` (preview) e `useResolveImportStudents`.
- Componente `ImportPreviewTable` e `ConflictResolver`.
- `bun run check` e `bunx tsc --noEmit --skipLibCheck` passam.

### Write set esperado

- `src/routes/app/students/import.tsx`
- `src/components/students/import-preview-table.tsx`
- `src/components/students/conflict-resolver.tsx`
- `src/hooks/students/use-import-students.ts`

# Task 7: Testes end-to-end e fechamento

Escrever testes e2e cobrindo os fluxos críticos e executar DoD global do repo.

### Critérios de aceite

- Testes e2e com Playwright:
  - cadastro manual de aluno;
  - importação em lote com resolução de conflito por vinculação;
  - rejeição de arquivo inválido;
  - validação de nome vazio.
- Cobertura ≥ 95% nos novos módulos (`bun run test:coverage`).
- `bun run check`, `bunx tsc --noEmit --skipLibCheck`, `bun run test`,
  `bun run build` e `scripts/docs-check` passam.
- Preencher seção "Verificação" da spec `docs/specs/0001-cadastro-alunos.md`.
- Atualizar plano de implementação com ajustes e lições aprendidas (se houver).

### Write set esperado

- `e2e/students.spec.ts` (ou similar)
- `docs/specs/0001-cadastro-alunos.md`
- `docs/specs/0001-cadastro-alunos-implementation-plan.md`

## Sequência de execução

Tarefas executadas sequencialmente:

1. Task 1 — Infra e modelo de dados.
2. Task 2 — API manual.
3. Task 3 — Parser e matching.
4. Task 4 — API de importação.
5. Task 5 — Frontend listagem/cadastro.
6. Task 6 — Frontend wizard de importação.
7. Task 7 — e2e e fechamento.

Não há waves paralelas: cada tarefa depende de interfaces geradas pela
anterior (schemas, repository, rotas, componentes). Write sets também
compartilham arquivos (`repository.ts`, `schema.ts`, rotas API).

## Riscos e mitigações

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Biblioteca de planilha não ser compatível com Workers | Alto | Testar `xlsx` ou `papaparse` no ambiente Workers; fallback para CSV apenas se bundle/compatibilidade falhar |
| Algoritmo de matching agressivo/conservador | Médio | Tornar limiar configurável; revisão humana obrigatória; testes com casos reais |
| Estado do wizard no cliente perder dados ao recarregar | Médio | Manter etapas rápidas; não persistir upload parcial; instruir operador a concluir em uma sessão |
| Autenticação não protege rotas corretamente | Alto | Reutilizar middleware Better Auth; testes e2e verificando redirecionamento |
| Fuga de responsabilidades entre repository e rota | Baixo | Repository lida com D1; rota lida com HTTP/Zod; matching em serviço separado |

## Definition of Done

- [ ] `bunx tsc --noEmit --skipLibCheck` passa.
- [ ] `bun run check` passa.
- [ ] `bun run test` passa com cobertura ≥ 95% nos novos módulos.
- [ ] Testes e2e cobrem: cadastro manual, importação com conflito, resolução
      por vinculação, rejeição de arquivo inválido, validação de nome vazio.
- [ ] Migration aplicada em ambiente local (`bun run db:local:migrate`).
- [ ] Rotas protegidas exigem sessão ativa (verificação manual via cookie).
- [ ] Documentação atualizada: plano de implementação, spec e ADRs se
      necessário.
- [ ] Revisão humana da UX de resolução de conflitos realizada.

## Questões em aberto

- [ ] Qual biblioteca de planilha será adotada (CSV obrigatório; XLSX/ODS desejável)?
- [ ] Critério final de similaridade de nomes (exato, Levenshtein, fuzzy)?
- [ ] Será necessário campo de número de matrícula na importação inicial?
- [ ] Layout `/app` protegido já existe ou será criado nesta entrega?
