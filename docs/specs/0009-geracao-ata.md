---
status: draft
date: 2026-09-08
builds-on:
  - ADR-0014
  - ADR-0019
implemented-by: []
---

# Geração de ata com templates

> Convenções compartilhadas: `docs/context/CONVENTIONS.md`.

## Objetivo

Permitir gerar a ata formal de uma reunião a partir de template, dados da reunião, registros e relatos selecionados, sem alterar os registros originais.

## Fluxo

1. Na preparação da reunião, o operador seleciona um template de ata.
2. A qualquer momento em andamento ou após finalização, o operador solicita prévia da ata.
3. O sistema renderiza a ata aplicando o template aos dados filtrados (apenas registros/relatos marcados para inclusão).
4. Após finalização, uma versão oficial da ata é gerada com PDF.

## Contrato

- `GET /api/meetings/:id/minutes/preview` — retorna prévia da ata.
- `POST /api/meetings/:id/minutes/generate` — gera versão oficial e PDF.
- `POST /api/minute-templates` — cadastra template.
- Template define blocos: cabeçalho, reunião, turmas, participantes, registros por aluno, relatos gerais, assinaturas, rodapé.

## Casos de borda

| #   | QUANDO ⟨gatilho⟩                            | o sistema DEVE ⟨resposta⟩                                           |
| --- | ------------------------------------------- | ------------------------------------------------------------------- |
| 1   | não houver registros marcados para inclusão | gerar ata mínima com cabeçalho e relatos gerais                     |
| 2   | o template for alterado após prévia         | próxima prévia refletir novo template; dados permanecem inalterados |
| 3   | a reunião ainda estiver em Rascunho         | permitir prévia, mas não gerar versão oficial                       |
| 4   | houver registros internos                   | omiti-los da ata e do PDF                                           |
| 5   | a reunião possuir múltiplas turmas          | agrupar registros por turma e por aluno conforme template           |

## Questões em aberto

- [ ]

## Definition of Done

```bash
bunx tsc --noEmit --skipLibCheck        # exit 0
bun run check                            # exit 0
```

## Revisão humana

- Layout da prévia e do PDF; tipografia e identidade visual do template.

## Verificação

```text
(preencher no fechamento)
```
