---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0012
  - ADR-0011
  - ADR-0013
implemented-by: []
---

# Criação e ciclo de vida de reunião

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir criar e gerenciar o ciclo de vida de uma reunião de conselho de classe, desde a preparação até a finalização e reabertura, distinguindo registros vinculados à reunião de registros independentes do aluno.

## Fluxo

1. O operador cria uma reunião informando nome e data.
2. Em Rascunho, seleciona turmas participantes, servidores participantes, papéis e template de ata.
3. O operador inicia a reunião (Rascunho → Em andamento).
4. Durante o conselho, o operador visualiza alunos das turmas, seus registros independentes pré-existentes, e pode criar novos registros vinculados àquela reunião.
5. O operador finaliza a reunião (Em andamento → Finalizada).
6. Se necessário, reabre a reunião para correções (Finalizada → Reaberta → Em andamento → Finalizada).

## Contrato

- `POST /api/meetings` — cria reunião em Rascunho.
- `PATCH /api/meetings/:id/start` — inicia reunião.
- `PATCH /api/meetings/:id/finalize` — finaliza reunião.
- `PATCH /api/meetings/:id/reopen` — reabre reunião finalizada.
- Payload de criação: `nome`, `data`, `turmaIds[]`, `participantes[]` com `servidorId` e `papelId`, `templateId`.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                                                     | o sistema DEVE ⟨resposta⟩                                    |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 1   | a reunião estiver Finalizada e o operador tentar editar registro vinculado à reunião | rejeitar e informar necessidade de reabertura                |
| 2   | a reunião estiver Finalizada e houver registro independente do aluno                 | permitir visualizar, mas não permitir novo vínculo exclusivo |
| 3   | a reunião não tiver turmas selecionadas ao iniciar                                   | rejeitar início                                              |
| 4   | a reunião for reaberta                                                               | manter versões anteriores da ata e seus PDFs                 |
| 5   | o operador tentar iniciar uma reunião já em andamento                                | rejeitar transição inválida                                  |
| 6   | um registro independente for criado enquanto a reunião está em qualquer estado       | permitir, pois não depende do estado da reunião              |

## Questões em aberto

- [ ]

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- Estados e transições; mensagens de erro apresentadas ao operador.

## Verificação

```text
(preencher no fechamento)
```
