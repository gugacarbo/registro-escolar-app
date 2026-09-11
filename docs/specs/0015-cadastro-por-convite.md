---
status: accepted
date: 2026-09-11
builds-on:
  - ADR-0008
  - ADR-0020
implemented-by: []
---

# Cadastro por convite

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Restringir o cadastro público a convites após o primeiro usuário, mantendo o
cadastro inicial aberto e permitindo que qualquer usuário autenticado convide
novos usuários por e-mail.

## Fluxo

1. O primeiro usuário cadastra-se pelo fluxo atual em instância vazia e recebe
   `admin` com `isPermanentAdmin: true`.
2. Um usuário autenticado envia um convite informando o e-mail do destinatário.
3. O sistema cria o convite com validade de 7 dias e envia o e-mail pelo Resend.
4. O destinatário abre `/register?token=...`, o sistema valida o token e
   pré-preenche o e-mail do convite.
5. O cadastro com token válido cria a conta como `user` e marca o convite como
   aceito.

## Contrato

- `GET /api/invitations/status` retorna se o cadastro inicial está aberto ou se
  o registro exige convite.
- `GET /api/invitations` exige sessão e retorna os convites enviados pelo
  usuário mais a contagem pendente e o limite.
- `POST /api/invitations` exige sessão, valida o e-mail, limita a 10 convites
  pendentes por emissor e envia o convite pelo Resend.
- `GET /api/invitations/verify?token=...` valida o token e retorna o e-mail do
  convite quando válido.
- `DELETE /api/invitations/:id` exige sessão do emissor e cancela convites
  pendentes.
- `POST /api/auth/sign-up/email` permanece aberto em instância vazia; com
  usuário existente, exige token válido no cabeçalho `x-invite-token`, no corpo
  ou nos parâmetros da URL.
- Cada convite expira após 7 dias; convites expirados, aceitos ou cancelados não
  permitem novo cadastro.
- Falha no envio pelo Resend é registrada no log sem invalidar o convite
  criado.

## Casos de borda

| # | QUANDO ⟨gatilho⟩ | o sistema DEVE ⟨resposta⟩ |
| --- | --- | --- |
| 1 | a instância estiver vazia | permitir cadastro sem convite e promover a conta a administrador permanente |
| 2 | já existir usuário e o cadastro chegar sem token | rejeitar com `403` e código `INVITE_REQUIRED` |
| 3 | o token for inexistente, expirado, aceito ou cancelado | rejeitar com `400` e código `INVALID_INVITATION` |
| 4 | o e-mail do cadastro divergir do e-mail convidado | rejeitar com `400` e código `INVALID_INVITATION` |
| 5 | o e-mail convidado já possuir conta | rejeitar a criação com `409` |
| 6 | o emissor atingir 10 convites pendentes | rejeitar a criação com `400` |
| 7 | o Resend falhar no envio | manter o convite pendente e registrar o erro no log |
| 8 | a página `/register` abrir sem token após o cadastro inicial | exibir mensagem de cadastro restrito e orientar login |
| 9 | a página `/register` abrir com token inválido ou expirado | exibir mensagem de convite inválido e orientar novo convite |

## Questões em aberto

Nenhuma.

## Definition of Done

```bash
bun run test src/lib/invitations/repository.test.ts src/lib/email/resend.test.ts src/routes/api/auth/$.test.ts src/routes/api/invitations/index.test.ts src/routes/api/invitations/verify.test.ts src/routes/api/invitations/$id/index.test.ts src/routes/auth-pages.test.tsx # casos 1–9
bun run typecheck # exit 0
bun run check # exit 0
scripts/docs-check # exit 0
bun run build # exit 0
```

## Revisão humana

- Conferir que `/register` diferencia cadastro inicial, convite válido, convite
  inválido e cadastro restrito.
- Conferir que o diálogo de convite limita pendências e permite cancelamento.

## Verificação

Pendente da implementação e execução do DoD.
