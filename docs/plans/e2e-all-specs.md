# Plano: testes e2e para todas as SPECs

## Objetivo

Criar testes end-to-end (Playwright) cobrindo os requisitos e casos de borda de
cada uma das 12 SPECs implementadas do registro-escolar-app.

## Global Constraints

- Todo teste e2e deve ser determinístico e isolado: usar banco sqlite de teste
  (não D1 local compartilhado) e seed/factory por teste.
- Autenticação: criar usuário de teste via better-auth no setup do teste; nunca
  depender de estado pré-existente.
- Page Objects/fixtures compartilhados podem ser criados em `e2e/fixtures/` e
  `e2e/pages/` quando reduzirem duplicação entre SPECs.
- Cada spec deve ter seu próprio arquivo de teste `e2e/<spec>.spec.ts`.
- Os comandos `bun run typecheck`, `bun run check` e `bun run e2e` devem passar
  no final do plano.

## Tarefas

### Task 1: Infraestrutura base de e2e

Criar a base compartilhada usada por todas as outras tarefas.

- Criar `e2e/fixtures/auth.ts`: signup/login de usuário de teste via API
  (`better-auth`) retornando sessão/cookies para Playwright.
- Criar `e2e/fixtures/db.ts`: helper para resetar banco sqlite de teste
  (`better-sqlite3` abrindo o caminho configurado em `.env.test` ou
  `wrangler.toml` local) e aplicar migrations.
- Criar `e2e/fixtures/factories.ts`: factories para criar estudantes, turmas,
  matrículas, servidores, papéis, reuniões, componentes, ofertas, registros,
  relatos e templates de ata via API (fetch contra `http://localhost:3001/api`).
- Criar `e2e/fixtures/test.ts` estendendo `test` do Playwright com fixture
  `authenticatedPage` (página logada + banco limpo).
- Criar `e2e/pages/` com Page Objects mínimos: `LoginPage`, `StudentsPage`,
  `ClassesPage`, `MeetingsPage`, `CouncilPage`.
- Atualizar `playwright.config.ts` para usar `.env.test` (se necessário) e
  garantir que o webServer inicie com sqlite de teste.
- Adicionar script `e2e:ci` no `package.json` se útil.
- Validar: `bun run typecheck`, `bun run check`, `bun run e2e` (pelo menos
  `home.spec.ts` continua passando).

### Task 2: e2e para SPEC-0001 — Cadastro e importação em lote de estudantes

- Testar redirecionamento para login quando não autenticado.
- Testar cadastro manual de estudante (`/students/new`) com nome obrigatório.
- Testar validação: nome vazio rejeitado.
- Testar importação em lote (`/students/import`) com CSV válido.
- Testar importação com conflito de nome/documento: pré-visualização mostra
  conflito e resolução vincula a estudante existente.
- Testar arquivo inválido: rejeitado com mensagem.
- Testar CSV com linha sem nome: aparece como inválida na pré-visualização.
- Validar: `bun run e2e -- e2e/spec-0001-students.spec.ts` passa.

### Task 3: e2e para SPEC-0002 — Cadastro de turmas e vínculos de matrícula

- Criar turma via UI (`/classes/new`).
- Listar turmas (`/classes`).
- Matricular estudante em turma (`/classes/:id/enroll`) com data de início.
- Transferir estudante para outra turma: encerrar vínculo antigo e criar novo.
- Testar endpoint `GET /api/classes/:id/students?date=YYYY-MM-DD` via UI/API
  integrada.
- Testar sobreposição de vínculos: rejeitada/sinalizada.
- Testar vínculo sem data de término permanece ativo.
- Validar: `bun run e2e -- e2e/spec-0002-classes.spec.ts` passa.

### Task 4: e2e para SPEC-0003 — Servidores e papéis de reunião

- Cadastrar servidor (`/staff/new`).
- Listar servidores (`/staff`).
- Cadastrar papel (`/roles/new`).
- Garantir papel padrão `Professor` na lista.
- Adicionar participante a reunião com papel.
- Testar servidor duplicado: reutiliza existente.
- Testar papel duplicado: normalizado/rejeitado.
- Testar soft delete preservando participações históricas.
- Testar papel inexistente em participação: rejeitado.
- Validar: `bun run e2e -- e2e/spec-0003-staff-roles.spec.ts` passa.

### Task 5: e2e para SPEC-0004 — Componentes curriculares e ofertas por turma

- Cadastrar componente (`/components/new`).
- Listar componentes.
- Criar oferta de componente para turma (`/classes/:id/offers`).
- Testar componente duplicado: rejeitado.
- Testar oferta sem professor: permitida.
- Testar professor não cadastrado/soft-deleted: rejeitado.
- Testar mesmo componente ofertado duas vezes na mesma turma: rejeitado.
- Validar: `bun run e2e -- e2e/spec-0004-components-offers.spec.ts` passa.

### Task 6: e2e para SPEC-0005 — Ciclo de vida de reunião

- Criar reunião em Rascunho (`/meetings/new`).
- Iniciar reunião (`PATCH /api/meetings/:id/start`).
- Finalizar reunião.
- Reabrir reunião finalizada.
- Testar início sem turmas: rejeitado.
- Testar iniciar reunião já em andamento: transição inválida.
- Testar edição de registro vinculado em reunião finalizada: rejeitado.
- Testar criação de registro independente durante reunião finalizada: permitido.
- Validar: `bun run e2e -- e2e/spec-0005-meeting-lifecycle.spec.ts` passa.

### Task 7: e2e para SPEC-0006 — Acompanhamento dos estudantes durante a reunião

- Na reunião em andamento, selecionar turma e listar estudantes vinculados.
- Marcar estudante como `em_discussao`, depois `concluido`.
- Testar estudante não vinculado à turma na data: não aparece.
- Testar progresso 100% quando todas as turmas concluídas.
- Testar conclusão sem registros: permitida.
- Testar alternância entre turmas mantendo estado independente.
- Testar mesmo estudante em duas turmas da reunião: tratado independentemente.
- Validar: `bun run e2e -- e2e/spec-0006-meeting-tracking.spec.ts` passa.

### Task 8: e2e para SPEC-0007 — Registros de estudante

- Criar registro independente na ficha do estudante.
- Criar registro vinculado à reunião em andamento.
- Listar registros na reunião: mostra independentes aplicáveis como contexto.
- Editar registro vinculado (somente reunião em andamento/reaberta).
- Marcar inclusão de registro independente na ata da reunião.
- Testar texto vazio: rejeitado.
- Testar origem não participante: rejeitado.
- Testar múltiplos registros para mesmo estudante na mesma reunião: mantidos.
- Testar registro independente de turma não envolvida na reunião: não exibido.
- Validar: `bun run e2e -- e2e/spec-0007-student-records.spec.ts` passa.

### Task 9: e2e para SPEC-0008 — Relatos gerais da reunião

- Criar relato geral em reunião em andamento.
- Editar relato geral.
- Listar relatos.
- Testar autor não participante: rejeitado.
- Testar relato interno (`incluirNaAta=false`): armazenado.
- Testar criação/edição fora de `in_progress`: rejeitado.
- Testar texto vazio: rejeitado.
- Testar reunião sem relatos incluídos na ata: ainda gera ata.
- Validar: `bun run e2e -- e2e/spec-0008-general-reports.spec.ts` passa.

### Task 10: e2e para SPEC-0009 — Geração de ata com templates

- Cadastrar template de ata (`/api/minute-templates`).
- Gerar prévia da ata em reunião rascunho (`/api/meetings/:id/minutes/preview`).
- Gerar versão oficial e PDF após finalização
  (`POST /api/meetings/:id/minutes/generate`).
- Testar ata sem registros marcados: gera ata mínima.
- Testar template alterado após prévia: próxima prévia reflete novo template.
- Testar reunião rascunho: prévia permitida, oficial rejeitada.
- Testar registros internos omitidos na ata/PDF.
- Testar múltiplas turmas: agrupamento por turma/estudante.
- Validar: `bun run e2e -- e2e/spec-0009-minutes.spec.ts` passa.

### Task 11: e2e para SPEC-0010 — Versionamento e aprovação de ata

- Finalizar reunião gera versão v1.
- Reabrir e finalizar gera v2 mantendo v1/PDF acessível.
- Listar versões (`/api/meetings/:id/minutes/versions`).
- Aprovar ata atual (`PATCH /api/meetings/:id/minutes/approve`).
- Testar nova versão após aprovação: volta para `pendente_aprovacao`.
- Testar aprovação sem versão atual: rejeitado.
- Testar aprovação sem data: preenche automaticamente.
- Testar apenas uma versão marcada como atual.
- Validar: `bun run e2e -- e2e/spec-0010-minute-versions.spec.ts` passa.

### Task 12: e2e para SPEC-0011 — Histórico do estudante

- Consultar histórico do estudante (`/students/:id/history` ou API equivalente).
- Ver turmas, períodos, reuniões e registros agrupados.
- Aplicar filtros por turma, período, reunião, categoria, componente, busca
  textual.
- Testar estudante que mudou de turma: registros de ambas aparecem.
- Testar filtro sem resultados: empty-state com limpar filtros.
- Testar registro interno aparece no histórico.
- Testar reunião antiga: contexto da turma naquela data.
- Validar: `bun run e2e -- e2e/spec-0011-student-history.spec.ts` passa.

### Task 13: e2e para SPEC-0012 — Histórico da turma

- Consultar histórico da turma (`/classes/:id/history`).
- Ver dados cadastrais, estudantes ativos/históricos, reuniões e registros.
- Aplicar filtros por período, reunião, categoria, componente, estudante, busca
  textual.
- Testar turma sem reuniões: empty-state com lista de estudantes.
- Testar estudantes com vínculos encerrados: indicador de status.
- Testar busca textual sem resultados: mensagem e ajuste de filtros.
- Testar turma equivalente de outro período: não mistura registros.
- Testar registro interno aparece no histórico da turma.
- Validar: `bun run e2e -- e2e/spec-0012-class-history.spec.ts` passa.

## Validação final

Após todas as tarefas:

```bash
bun run typecheck        # exit 0
bun run check            # exit 0
bun run e2e              # tudo verde
```
