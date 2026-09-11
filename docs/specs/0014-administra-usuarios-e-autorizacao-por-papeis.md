---
status: accepted
date: 2026-09-11
builds-on:
  - ADR-0008
  - ADR-0020
implemented-by: []
---

# Administra usuários e autorização por papéis

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir que o administrador permanente controle contas de acesso com os
papéis `admin` e `user`, enquanto usuários comuns continuam usando todas as
funcionalidades escolares existentes.

## Fluxo

1. Uma conta se cadastra pelo fluxo atual.
2. A primeira conta da instância recebe `admin` e torna-se o administrador
   permanente; cada conta posterior recebe `user`.
3. Um administrador acessa `/admin/users` e visualiza as contas cadastradas.
4. Para outro usuário, o administrador pode alternar entre `user` e `admin`.
5. O administrador pode excluir outro usuário que tenha papel `user` após
   confirmar a ação.
6. O sistema bloqueia ações que alterem ou excluam a própria conta, o
   administrador permanente ou qualquer outra conta `admin`.

## Contrato

- O campo persistido `role` aceita exclusivamente `admin` ou `user`; o campo
  `isPermanentAdmin` identifica a primeira conta e não pode ser removido.
- `GET /api/admin/users` exige sessão com `role: "admin"` e retorna a lista
  paginada de contas com `id`, `name`, `email`, `role`, `isPermanentAdmin` e
  datas de criação e atualização.
- `PATCH /api/admin/users/:id` exige `role` igual a `admin` ou `user` e atualiza
  somente uma conta diferente do solicitante e que não seja o administrador
  permanente.
- `DELETE /api/admin/users/:id` exige `role: "admin"` e remove somente uma
  conta diferente do solicitante com papel `user`; sessões e credenciais da
  conta removida são excluídas em cascata.
- Rotas `/admin/*` e APIs `/api/admin/*` retornam ou apresentam acesso negado
  para sessão ausente ou com papel `user`; a verificação de API ocorre no
  servidor.
- As rotas e APIs existentes fora de `/admin/*` continuam acessíveis tanto por
  `user` quanto por `admin` autenticados.
- O cadastro de papéis de reunião em `/roles` e a entidade `staff` não
  representam papéis de acesso e não são migrados para `/admin/*`.

## Casos de borda

| # | QUANDO ⟨gatilho⟩ | o sistema DEVE ⟨resposta⟩ |
| --- | --- | --- |
| 1 | o primeiro usuário for cadastrado em uma instância vazia | persistir `admin` e `isPermanentAdmin: true` para essa conta |
| 2 | a migration encontrar usuários existentes | marcar como administrador permanente e `admin` a conta com menor `created_at`; definir `user` para as demais |
| 3 | um usuário `user` tentar acessar `/admin/*` ou `/api/admin/*` | negar o acesso sem expor dados administrativos |
| 4 | um admin tentar alterar o próprio papel, o administrador permanente ou enviar um papel fora do conjunto permitido | rejeitar a requisição e manter os dados inalterados |
| 5 | um admin tentar excluir a própria conta, o administrador permanente ou qualquer conta `admin` | rejeitar a requisição e manter a conta e suas sessões |
| 6 | um admin excluir outro usuário `user` | remover a conta e invalidar suas sessões e credenciais vinculadas |
| 7 | a lista administrativa estiver carregando, vazia ou falhar | exibir os estados padrão de carregamento, vazio ou erro da tabela |

## Questões em aberto

Nenhuma.

## Definition of Done

```bash
bun run test src/lib/auth.test.ts src/routes/_app/route.test.tsx src/routes/api/admin/users/index.test.ts src/routes/api/admin/users/$id.test.ts # casos 1–6
bun run e2e e2e/admin-users.spec.ts # casos 1–6
bun run test:visual # caso 7
bun run typecheck # exit 0
bun run check # exit 0
scripts/docs-check # exit 0
bun run build # exit 0
```

## Revisão humana

- Conferir que a tela administrativa torna claras as restrições de contas que
  não podem ser alteradas ou excluídas.

## Verificação

Pendente da implementação e execução do DoD.
