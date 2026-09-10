---
status: accepted
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0012
superseded-by: null
deciders: []
---

# Adota registros de estudante como entidades independentes e reutilizáveis entre reuniões

## Contexto e problema

As observações pedagógicas sobre um estudante podem surgir fora do momento do conselho (reunião pedagógica, contato com responsável, acompanhamento de classe). Restringir registros apenas ao conselho impede que informações relevantes sejam lançadas no momento em que ocorrem e aproveitadas em reuniões futuras. É necessário decidir se registros podem existir independentemente de uma reunião e como eles aparecem nas reuniões posteriores.

## Direcionadores da decisão

- RF-020, RF-021: múltiplos registros com texto livre.
- RF-022 a RF-026: campos opcionais, autoria, inclusão na ata.
- RN-005: um estudante pode possuir vários registros.
- CA-006, CA-007: histórico do estudante atravessa reuniões e turmas.
- Novo requisito do produto: registros podem ser criados fora de uma reunião e reutilizados nas reuniões em que o estudante participa.

## Opções consideradas

### Opção 1 — Registros sempre vinculados a uma reunião

**Prós:** simples; reforça o fluxo do conselho.
**Contras:** impede registro de informações ocorridas entre conselhos; exige que tudo seja digitado durante a reunião.

### Opção 2 — Registros independentes do estudante, replicados/vinculados às reuniões

**Prós:** informações podem ser registradas no momento certo; histórico rico; reutilização automática em reuniões futuras.
**Contras:** maior complexidade: visibilidade por reunião, controle de inclusão na ata por reunião, autoria em contexto sem reunião.

## Decisão

Adotar **Opção 2**. Cada registro de estudante é uma entidade própria vinculada ao **Estudante** (e opcionalmente a uma **Turma** e/ou **Componente Curricular**), contendo texto livre obrigatório e campos opcionais: categoria, componente curricular, servidor de origem e flag `incluirNaAta` (padrão `true`). Um registro pode ou não estar vinculado a uma Reunião:

- **Registro vinculado a uma Reunião:** criado durante o conselho; visível e incluível na ata daquela reunião.
- **Registro independente (sem Reunião):** criado a qualquer momento; aparece automaticamente como "registro contextual" em todas as Reuniões em que o estudante for componente da turma na data da reunião. O operador decide, por reunião, se o registro independente deve ser incluído na ata daquela reunião.

A autoria de um registro independente pode ser um Servidor cadastrado (não precisa ser participante de reunião específica). Para registros criados dentro de uma reunião, a autoria — quando informada — deve ser participante daquela reunião (ADR-0016).

## Consequências

- **Positivas:** histórico contínuo do estudante; registros podem ser feitos no momento da observação; reuniões futuras se beneficiam de informações acumuladas.
- **Negativas:** controle de inclusão na ata passa a ser por registro **e** por reunião; UI precisa mostrar registros independentes como candidatos durante o conselho; mais tabelas/estados.
- **Obrigatório:** tabela `registroEstudante` com FK obrigatória para `estudante` e FK opcional para `reuniao` e `turma`; `incluirNaAta` default true quando criado dentro de reunião; tabela ou flag de `inclusaoReuniao` para controlar quais registros independentes entram na ata de cada reunião.
- **Proibido:** limitar a um único registro por estudante por reunião; exigir categoria, componente ou autoria; apagar registros independentes ao encerrar ou reabrir uma reunião.

## Confirmação

```bash
grep -E "registro.*Estudante|studentRecord" src/db/schema.ts >/dev/null && \
grep -E "reuniaoId|meetingId|turmaId|classId" src/db/schema.ts >/dev/null && \
grep -E "incluirNaAta|includeInMinutes|inclusaoReuniao" src/db/schema.ts >/dev/null && \
echo "registros de estudante independentes presentes"
```

## Notas

A regra de que "registros só podem ser criados durante reunião Em andamento" foi revogada. Verdade atual: registros de estudante podem ser criados a qualquer momento, com ou sem reunião.
