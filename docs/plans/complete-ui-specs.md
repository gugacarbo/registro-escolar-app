---
status: in_progress
date: 2026-09-10
---

# Completar integração de UI das especificações implementadas

## Global Constraints

- Siga `AGENTS.md`, `docs/context/CONVENTIONS.md` e `docs/context/TESTS.md`.
- Use Bun; nunca npm/pnpm/yarn.
- Todas as requisições assíncronas em React usam TanStack Query, com `staleTime`/`gcTime` explícitos e invalidação correta.
- Todo formulário React usa React Hook Form com os wrappers em `src/components/ui/form.tsx`.
- Reutilize componentes existentes de `src/components/ui/` e `src/components/`; não crie duplicatas.
- Não altere contratos de API já publicados sem necessidade estrita; implemente a UI consumindo os contratos existentes.
- Testes em português, ao lado do código (`*.test.tsx`), com consultas acessíveis.
- Cada rota de UI alterada/criada precisa de teste de componente/hook cobrindo estados de carregamento, sucesso e erro quando aplicável; e2e deve continuar verde.
- Não escreva/edita migrations manualmente; este plano não exige novas migrations.
- Commits convencionais, pequenos e completos; um commit por task.
- Não use `@ts-ignore`, `any` desnecessário, `console.log` ou testes vazios.

## Task 1 — Council: integração completa das telas de reunião

Implemente em `src/routes/_app/meetings/$meetingId/council.tsx` (e componentes/hook files conforme necessário):

1. Remova todos os textos de placeholder (“disponível após spec 0007”, etc.) e o botão desabilitado.
2. Apresente as turmas da reunião e seus estudantes usando os endpoints/hooks existentes de meeting class students.
3. Permita selecionar um estudante e, no painel correspondente:
   - listar registros vinculados e registros independentes aplicáveis (contexto), consumindo `useMeetingStudentRecords`;
   - criar registro vinculado com texto obrigatório e opcionais categoria/componente/origem/inclusão na ata, consumindo `useCreateLinkedRecord`;
   - editar registro vinculado quando a reunião estiver `Em andamento` ou `Reaberta`, via endpoint `PATCH /api/meetings/:meetingId/records/:recordId`;
   - alternar inclusão de registro independente na ata desta reunião, consumindo `useSetRecordInclusion`;
   - desabilitar ações conforme status da reunião, com mensagem explicativa quando necessário.
4. Resolva nomes legíveis para categoria/componente/origem em vez de IDs crus, quando os dados estiverem disponíveis nos contratos/hooks existentes.
5. Adicione/ajuste testes de componente/hook para carregamento, listagem, criação, edição, toggle e bloqueio por reunião finalizada.
6. Atualize as specs afetadas apenas se a descrição de integração mudar (não altere status).

## Task 2 — General reports: hook e UI

Implemente suporte completo a relatos gerais na tela da reunião:

1. Crie hooks TanStack Query para:
   - `GET /api/meetings/:meetingId/general-reports`;
   - - `POST /api/meetings/:meetingId/general-reports`;
   - `PATCH /api/meetings/:meetingId/general-reports/:reportId`;
   - remova endpoint não existente da UI se aplicável.
2. Adicione seção/aba `Relatos gerais` na tela apropriada da reunião, com listagem, criação, edição, autoria por participante e inclusão na ata conforme contrato da SPEC-0008.
3. Respeite ciclo de vida da reunião (criação/edição apenas em `Rascunho`, `Em andamento` ou `Reaberta`, conforme API real).
4. Invalidações corretas de query keys.
5. Testes cobrindo carregamento/sucesso/erro e bloqueio por status.

## Task 3 — Históricos: telas de estudante e turma

Consuma os hooks já existentes de histórico:

1. Na rota do estudante, inclua uma seção/aba `Histórico` com filtros suportados pelo hook/API e timeline clara.
2. Na rota de turma, inclua uma seção/aba `Histórico` com filtros suportados e eventos relevantes.
3. Adicione acesso a partir das páginas de detalhe/lista sem mudanças de contrato.
4. Estados de loading/erro/vazio; nomes legíveis; reutilize componentes visuais.
5. Testes cobrindo renderização e filtros.

## Task 4 — Navegação e formulários incompletos

Corrija acessibilidade e formulários órfãos:

1. Adicione links para `/meetings/:meetingId/students` no detalhe da reunião.
2. Adicione link/aba para `/classes/:id/offers` na lista de turmas e/ou detalhe da turma.
3. Habilite seleção real de `templateId` no `MeetingForm` consumindo templates existentes; remova o placeholder “após spec 0009”.
4. Implemente edição de reunião consumindo `useUpdateMeeting`, a partir da tela de detalhe, sem criar fluxo redundante.
5. Exiba nomes legíveis de servidor/papel na lista de participantes (pode combinar dados carregados).
6. Atualize/remova comentários e TODOs obsoletos sobre spec 0009.
7. Testes para links/fluxos alterados.

## Task 5 — Cadastros: histórico e exclusão

1. Exiba vínculos ativos e históricos na tela de estudantes da turma, conforme SPEC-0002.
2. Implemente remoção (soft delete) de servidor na UI, consumindo `DELETE /api/staff/:id`, com confirmação e invalidação.
3. Corrija seletores truncados em `pageSize: 100`: adicione busca dinâmica/paginação apropriada ou carregue todas as opções sem quebrar contratos existentes.
4. Testes para histórico de vínculos, remoção de servidor e seletores.

## Task 6 — Documentação e verificação final

1. Atualize `docs/specs/*` afetadas com integração real de UI; mantenha precisão sem reescrever escopo.
2. Rode `scripts/docs-check --emit-index` apenas se necessário.
3. Confirme que todos os placeholders/TODOs identificados foram removidos ou justificados.
4. Rode e garanta exit 0:
   - `bun run check`
   - `bun run typecheck`
   - `bun run test`
   - `bun run test:coverage`
   - `bun run e2e`
   - `scripts/docs-check`
5. Gere um relatório final com telas completadas e restrições conhecidas.
