---
status: proposed
date: 2026-09-08
builds-on:
  - ADR-0012
  - ADR-0013
superseded-by: null
deciders: []
---

# Adota ata como entidade separada da reunião com template, versionamento e PDF

## Contexto e problema

Reunião e ata têm naturezas diferentes: a reunião contém os registros brutos; a ata é um documento formal construído a partir deles. É preciso separar dados de apresentação, permitir múltiplas versões e gerar PDF sem alterar os registros originais.

## Direcionadores da decisão

- RF-036, RF-037, RF-038, RF-039, RF-040: ata 1:1, templates, prévia, PDF.
- RF-041, RF-042, RF-043, RF-044, RF-045: versionamento e aprovação.
- RN-017, RN-018, RN-019: separação conceitual, pertencimento e controle de apresentação.
- CA-008, CA-009: reabertura e template não alteram dados.

## Opções consideradas

### Opção 1 — Ata como view/ephemeral gerada on-the-fly

**Prós:** sempre reflete dados atuais.
**Contras:** não permite versionamento nem aprovação formal; reabertura apagaria documento anterior.

### Opção 2 — Ata como entidade persistente com versões e PDFs

**Prós:** rastreabilidade; aprovação; regeneração controlada; separação de dados e apresentação.
**Contras:** mais tabelas e storage de PDFs.

## Decisão

Adotar **Opção 2**: cada reunião possui uma única ata lógica (`1 reunião → 1 ata`). A ata tem template selecionado, status de aprovação e versões numeradas. Cada versão armazena data/hora de geração, PDF, flag de atual e observação de alteração.

## Consequências

- **Positivas:** documento formal rastreável; alteração de template não afeta versões anteriores; reunião pode ter dados corrigidos sem perder histórico documental.
- **Negativas:** gestão de arquivos PDF; necessidade de armazenamento imutável.
- **Obrigatório:** tabelas `ata`, `ataVersao`, `ataTemplate`; coluna `templateId` na ata; FK 1:1 de ata para reunião.
- **Proibido:** alterar registros da reunião para mudar apresentação da ata; sobrescrever PDF de versão anterior; vincular uma ata a mais de uma reunião.

## Confirmação

```bash
grep -E "ata|minutes|ataTemplate|ataVersao" src/db/schema.ts >/dev/null && \
grep -E "reuniaoId|meetingId" src/db/schema.ts >/dev/null && \
echo "ata e versões presentes"
```

## Notas
