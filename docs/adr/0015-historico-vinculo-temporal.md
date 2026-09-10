---
status: accepted
date: 2026-09-08
builds-on:
  - ADR-0011
superseded-by: null
deciders: []
---

# Adota histórico baseado em vínculo temporal sem snapshots

## Contexto e problema

Para responder perguntas do tipo "esse estudante estava nessa turma naquela reunião?", o sistema precisa saber a composição histórica da turma sem depender de snapshots feitos em cada reunião. Snapshots facilitam consultas pontuais, mas duplicam dados e dificultam análise longitudinal.

## Direcionadores da decisão

- RF-006, RF-007: vínculos com início e fim.
- RN-004: composição histórica determinada pelos vínculos e datas.
- CA-001, CA-007: histórico contínuo entre turmas e períodos.
- Seção 5.4: regra temporal do vínculo.

## Opções consideradas

### Opção 1 — Snapshot da lista de estudantes por reunião

**Prós:** fácil de recuperar participação em uma reunião específica.
**Contras:** duplicação; histórico do estudante fica fragmentado; conflita com RN-004.

### Opção 2 — Vínculo temporal com consulta por data

**Prós:** única fonte de verdade; histórico contínuo; reutiliza regra de matrícula.
**Contras:** queries com intervalos de data; performance a observar em longo prazo.

## Decisão

Adotar **Opção 2**. A composição da turma em uma data qualquer é derivada dos vínculos estudante-turma: `startDate <= data` e (`endDate` é nulo ou `endDate >= data`). Não serão criados snapshots de estudantes por reunião.

## Consequências

- **Positivas:** histórico imutável; análise longitudinal; menos redundância.
- **Negativas:** queries de histórico exigem joins com condição temporal; cargas muito grandes podem exigir índices específicos.
- **Obrigatório:** toda consulta de estudantes de uma turma em data específica usar a regra temporal; vínculos nunca serem excluídos fisicamente.
- **Proibido:** criar tabela de snapshot de estudantes por reunião; usar turma atual do estudante como proxy para composição histórica.

## Confirmação

```bash
grep -E "startDate|endDate|dataReuniao|meetingDate" src/db/schema.ts >/dev/null && \
! grep -q "snapshot.*reuniao\|reuniao.*snapshot" src/db/schema.ts && \
echo "histórico temporal sem snapshot"
```

## Notas
