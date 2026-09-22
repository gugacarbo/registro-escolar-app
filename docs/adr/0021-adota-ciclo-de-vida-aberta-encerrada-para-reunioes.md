---
status: accepted
date: 2026-09-22
builds-on:
  - ADR-0013
  - ADR-0014
superseded-by: null
deciders: []
---

# Adota ciclo de vida Aberta/Encerrada para reuniões

## Contexto e problema

O ciclo de quatro estados (Rascunho, Em andamento, Finalizada, Reaberta) e as
transições `start`/`finalize`/`reopen` separavam a preparação da reunião do
registro efetivo e exigiam duas operações para retomar uma reunião corrigida.
Na prática, o operador trabalha a reunião em um único momento: monta a reunião,
registra o conselho e emite a ata. É preciso simplificar o ciclo de vida sem
perder a garantia de que a ata oficial congela os dados que a originaram.

## Direcionadores da decisão

- A reunião deve existir em um estado único de trabalho (**Aberta**) até a
  emissão da ata.
- A geração da ata é o marco que congela a reunião (**Encerrada**), evitando
  alterar registros já publicados no PDF.
- Reabertura continua sendo operação explícita para corrigir dados e emitir
  nova versão da ata, preservando as versões anteriores.
- ADR-0013: registros de estudante são entidades independentes; o estado da
  reunião controla apenas o que pode ser alterado dentro dela.
- ADR-0014: a ata é entidade separada, versionada, com PDF imutável.

## Opções consideradas

### Opção 1 — Manter Rascunho/Em andamento/Finalizada/Reaberta

**Prós:** separa preparação de registro efetivo; permite revisar antes de iniciar.
**Contras:** quatro estados e três transições para um fluxo de um único
operador; obriga "iniciar" e depois "retomar" uma reunião reaberta.

### Opção 2 — Aberta/Encerrada com encerramento disparado pela ata

**Prós:** um único estado de trabalho; o encerramento coincide com o documento
oficial; reabertura reusa a mesma máquina de estados.
**Contras:** a geração da ata passa a alterar o estado da reunião e precisa ser
atômica em relação à versão gerada; exige migração de dados e remoção das rotas
`start`/`finalize`.

## Decisão

Adotar **Opção 2**. A reunião tem dois estados: **Aberta** (`open`) e
**Encerrada** (`closed`). Toda reunião nasce **Aberta** e permanece editável
(dados gerais, turmas, participantes, acompanhamento, registros vinculados,
relatos gerais e conteúdo da ata). A geração de uma versão oficial da ata
muda a reunião para **Encerrada** na mesma operação. Em **Encerrada**,
dados, turmas, registros vinculados, relatos e conteúdo da ata ficam
bloqueados. A operação explícita de reabertura volta a reunião para **Aberta**,
permitindo correções; a próxima geração cria a versão seguinte da ata e
encerra novamente.

## Consequências

- **Positivas:** ciclo de vida de dois estados; o encerramento tem um gatilho
  observável (a ata emitida); reabertura simples, sem "retomar" intermediário.
- **Negativas:** `generateMinuteVersion` acumula duas responsabilidades
  (produzir a versão e encerrar a reunião); toda leitura de status de reunião
  precisa usar `open`/`closed`.
- **Obrigatório:** coluna `status` com valores `open`/`closed`; todo insert
  grava `status` explicitamente (`open` por padrão); migração que remapeia os
  valores antigos; geração da ata encerra a reunião; reabertura é a única
  transição.
- **Divergência conhecida:** o default físico da coluna no D1 continua
  `'draft'`. O drizzle-kit gera o rebuild da tabela pai, que o D1 rejeita por
  FK (ver `AGENTS.md > Gotchas`); corrigir exigiria reconstruir `meetings` e
  suas 7 filhas na mesma migration. Como `createMeeting` e
  `createMeetingWithRelations` sempre gravam `status`, o valor legado nunca é
  aplicado. O `drizzle/meta/0018_snapshot.json` declara `open` (fonte do
  schema), mas o banco carrega o default antigo.
- **Proibido:** editar dados, turmas, registros vinculados, relatos gerais ou
  conteúdo da ata em reunião Encerrada sem reabertura; apagar versões ou PDFs
  ao reabrir; aprovar ata de reunião Aberta.

## Confirmação

```bash
grep -E "status.*(open|closed)" src/db/meetings-schema.ts >/dev/null && \
grep -E "\"open\"|\"closed\"" src/lib/meetings/schema.ts >/dev/null && \
grep -q "closed" src/lib/minutes/repository.ts && \
echo "ciclo de vida aberta/encerrada presente"
```

## Notas

Sobre o default físico residual (`'draft'`) ver a consequência "Divergência
conhecida" e o gotcha do D1 em `AGENTS.md`.

A geração da ata e o encerramento da reunião não rodam em transação única
porque `DB` é a união `DrizzleD1Database | BetterSQLite3Database`, cujas
assinaturas de transação divergem (mesmo motivo registrado em
`createMeetingWithRelations`). A versão é inserida e, em seguida, a reunião é
encerrada; o PDF é derivado do conteúdo recém-gerado, então uma falha após a
inserção deixa a versão criada e a reunião aberta, estado recuperável pela
próxima geração.
