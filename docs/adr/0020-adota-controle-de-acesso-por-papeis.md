---
status: accepted
date: 2026-09-11
builds-on:
  - ADR-0008
  - ADR-0003
superseded-by: null
deciders: []
---

# Adota controle de acesso por papéis

## Contexto e problema

A aplicação deixou de operar com uma única conta. Precisa distinguir a
administração de contas do uso normal do sistema sem confundir usuários de
acesso com os papéis de participantes de reunião.

## Direcionadores da decisão

- O primeiro usuário cadastrado deve permanecer o administrador da instância.
- Apenas os papéis de acesso `admin` e `user` são permitidos nesta etapa.
- Rotas e APIs administrativas devem ser protegidas no servidor, além da
  interface.
- Usuários comuns mantêm o acesso às funcionalidades existentes.
- A gestão administrativa não pode excluir contas administrativas nem permitir
  autoexclusão ou alteração do próprio papel.

## Opções consideradas

### Opção 1 — Controle de acesso no cliente

**Prós:** implementação inicial curta.
**Contras:** não protege APIs nem URLs acessadas diretamente.

### Opção 2 — Papel persistido no usuário e autorização no servidor

**Prós:** uma fonte de verdade para sessões, páginas e APIs; bloqueia acesso
mesmo fora da interface.
**Contras:** requer migration, regras de integridade e cobertura de autorização.

### Opção 3 — Usar o cadastro de papéis de servidores como acesso

**Prós:** reutiliza uma tabela existente.
**Contras:** mistura participantes do domínio escolar com contas de acesso e
não representa privilégios administrativos.

## Decisão

Adotar a opção 2. Cada usuário terá papel persistido `user` ou `admin` e um
marcador de administrador permanente. O primeiro usuário de uma instância é
promovido a `admin` e marcado como permanente; em bases existentes, a conta com
menor `created_at` recebe esse marcador. A migration e a persistência devem
impedir valores de papel fora do conjunto permitido e preservar exatamente um
administrador permanente.

A autorização administrativa é verificada a partir da sessão no servidor.
Somente `admin` acessa `/admin/*` e `/api/admin/*`; a interface apenas reflete
essa mesma regra. Usuários `user` preservam o acesso atual fora desse espaço.

A página administrativa gerencia contas distintas da entidade `staff` e da
tabela `roles`, que continuam representando participantes e funções de
reuniões. Um admin pode promover ou rebaixar outros usuários, mas não pode
alterar seu próprio papel, rebaixar o administrador permanente, excluir a si
mesmo nem excluir qualquer admin. Exclusão é permitida somente para outro
usuário com papel `user`.

## Consequências

- **Positivas:** acesso administrativo verificável no servidor; evolução futura
  pode acrescentar permissões sem reutilizar entidades de domínio.
- **Negativas:** sessões, migrations e testes passam a carregar o papel do
  usuário.
- **Obrigatório:** usar `admin` e `user` como únicos valores; validar as regras
  de alteração e exclusão no endpoint; invalidar sessões excluídas por cascade.
- **Proibido:** autorizar `/admin/*` apenas por navegação condicional; alterar
  ou excluir o administrador permanente; permitir que um admin altere o próprio
  papel ou exclua qualquer admin.

## Confirmação

```bash
bun run test src/lib/auth.test.ts src/routes/api/admin/users/index.test.ts src/routes/api/admin/users/$id.test.ts # autorização, promoção, rebaixamento e exclusão
bun run typecheck # exit 0
```

## Notas

A mudança substitui o modelo de operador único da ADR-0017, mas mantém a
separação entre contas de acesso e servidores escolares.
