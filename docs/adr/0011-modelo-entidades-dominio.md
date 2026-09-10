---
status: accepted
date: 2026-09-08
builds-on: []
superseded-by: null
deciders: []
---

# Adota modelo de entidades independentes para estudantes, turmas, vínculos, servidores e componentes

## Contexto e problema

O domínio do registro escolar exige separar pessoas, agrupamentos letivos, vínculos históricos, servidores e componentes curriculares. Modelar estudante como atributo da turma ou turma como atributo do estudante impossibilita histórico contínuo, transferências e conselhos envolvendo múltiplas turmas. É necessário decidir a granularidade das entidades antes de definir schemas e telas.

## Direcionadores da decisão

- RF-003, RF-005, RF-006: estudantes e turmas precisam ser cadastrados e reutilizados.
- RF-010, RF-011: componentes curriculares são reutilizáveis entre turmas.
- RF-008, RF-014: servidores participam de várias reuniões.
- RN-002, RN-003: histórico do estudante não pode ser apagado ao mudar de turma.
- CA-001, CA-007: linha do tempo do estudante atravessa turmas e períodos letivos.

## Opções consideradas

### Opção 1 — Estudante como subdocumento da Turma

**Prós:** simples de consultar estudantes de uma turma; relação 1-N direta.
**Contras:** perde histórico ao trocar de turma; duplica dados; impede conselhos multi-turma com o mesmo estudante.

### Opção 2 — Estudante e Turma como entidades independentes com Matrícula/vínculo

**Prós:** histórico contínuo; vínculos datados; turmas e estudantes reutilizáveis.
**Contras:** mais tabelas/joins; consulta de turma atual exige regra temporal.

### Opção 3 — Modelo documental com snapshots de turma por reunião

**Prós:** fácil de reconstruir estado histórico de uma reunião.
**Contras:** duplicação; conflita com RN-004 e com a manutenção de histórico pesquisável.

## Decisão

Adotar **Opção 2**: Estudante, Turma, ComponenteCurricular e Servidor são entidades independentes. O vínculo entre Estudante e Turma é uma entidade própria (Matrícula/Vínculo) com data de início, data de término opcional e status. Nenhuma alteração cadastral futura pode apagar vínculos anteriores.

## Consequências

- **Positivas:** histórico contínuo do estudante; turmas distintas por período letivo; servidores e componentes reutilizáveis; base para histórico de turma e de estudante.
- **Negativas:** maior complexidade de queries; necessidade de regra temporal para determinar estudantes de uma turma em uma data.
- **Obrigatório:** toda tabela de vínculo deve conter `startDate` e `endDate` (nullable); status do vínculo; chaves para entidades independentes.
- **Proibido:** deletar fisicamente vínculos históricos; modelar estudante como atributo de turma; modelar componente curricular como filho de uma única turma.

## Confirmação

```bash
grep -E "(matriculas|enrollments|vinculos|student_class)" src/db/schema.ts >/dev/null && \
grep -E "startDate|endDate" src/db/schema.ts >/dev/null && \
echo "modelo de entidades presente"
```

## Notas
