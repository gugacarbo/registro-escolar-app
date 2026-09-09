---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0013
  - ADR-0016
  - ADR-0012
implemented-by: []
---

# Relatos gerais da reunião

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir registrar observações gerais sobre a reunião, independentes de alunos, com categoria, autor e controle de inclusão na ata.

## Fluxo

1. Em uma reunião em andamento, o operador acessa a seção de relatos gerais.
2. Preenche o texto livre.
3. Opcionalmente seleciona categoria, autor participante e inclusão na ata.
4. Salva o relato.
5. Relatos podem ser editados enquanto a reunião estiver em andamento.

## Contrato

- `POST /api/meetings/:id/general-reports` — cria relato geral.
- `GET /api/meetings/:id/general-reports` — lista relatos.
- `PATCH /api/meetings/:id/general-reports/:reportId` — edita relato.
- Payload: `texto` obrigatório; `categoriaId`, `origemId`, `incluirNaAta` opcionais.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                                       | o sistema DEVE ⟨resposta⟩                    |
| --- | ------------------------------------------------------ | -------------------------------------------- |
| 1   | o relato tiver autor que não é participante da reunião | rejeitar com erro de autoria inválida        |
| 2   | o relato for marcado como interno                      | armazenar e omitir na ata/PDF                |
| 3   | a reunião não estiver Em andamento                     | rejeitar criação/edição                      |
| 4   | o texto estiver vazio                                  | rejeitar com erro de validação               |
| 5   | todos os relatos forem removidos da ata                | ata ainda deve ser gerável com demais blocos |

## Questões em aberto

- [ ]

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- UX de acesso rápido aos relatos gerais durante o conselho.

## Verificação

```text
(preencher no fechamento)
```
