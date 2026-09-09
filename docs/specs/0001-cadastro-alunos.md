---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0017
  - ADR-0018
implemented-by: []
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

- [ ]

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0 — tipos das rotas/validações
bun run check                            # exit 0 — lint/format
```

## Revisão humana

- UX da tela de resolução de conflitos; critério de matching de duplicidade.

## Verificação

```text
(preencher no fechamento)
```
