---
status: accepted
date: 2026-09-08
builds-on:
  - ADR-0011
superseded-by: null
deciders: []
---

# Adota ciclo de vida Rascunho/Em andamento/Finalizada/Reaberta para reuniões

## Contexto e problema

O sistema registra informações durante o conselho de classe. É preciso distinguir momentos de preparação, registro, encerramento e correção. Com a decisão de permitir registros de aluno independentes de reunião (ADR-0013), o ciclo de vida passa a controlar principalmente **o que pode ser alterado dentro daquela reunião**, e não a criação de registros do aluno em geral.

## Direcionadores da decisão

- RF-012, RF-016: criar reunião e controlar estados.
- RF-017, RF-018 (antigo): reabertura e restrição de criação de registros — **RF-018 revogado**.
- RN-012, RN-013 (antigo): regras temporais de edição de registros — **RN-012 e RN-013 ajustados**.
- CA-008: reabertura preserva versões anteriores.
- ADR-0013: registros de aluno podem existir sem reunião.

## Opções consideradas

### Opção 1 — Apenas "Aberta/Fechada"

**Prós:** simples de implementar.
**Contras:** não separa preparação da reunião do registro efetivo; impede revisão antes do início.

### Opção 2 — Rascunho / Em andamento / Finalizada / Reaberta

**Prós:** reflete o fluxo real de preparação, conselho, encerramento e correção.
**Contras:** requer validações de transição de estado.

### Opção 3 — Máquina de estados com aprovação integrada

**Prós:** rígida e rastreável.
**Contras:** mistura aprovação da ata com ciclo de vida da reunião, aumentando complexidade.

## Decisão

Adotar **Opção 2** com quatro estados principais: **Rascunho**, **Em andamento**, **Finalizada** e **Reaberta**. Transições permitidas: Rascunho → Em andamento → Finalizada; Finalizada → Reaberta → Em andamento → Finalizada.

- Em **Rascunho**, a reunião pode ser preparada (turmas, participantes, papéis, template), mas não se vinculam novos registros exclusivos a ela.
- Em **Em andamento**, a reunião consome/associa registros já existentes do aluno e permite criar novos registros vinculados diretamente à reunião. O status de acompanhamento dos alunos é controlado.
- Em **Finalizada**, os registros vinculados à reunião não podem mais ser editados nem novos registros vinculados àquela reunião podem ser criados. A ata pode assumir caráter oficial.
- **Reaberta** permite retornar a Em andamento para correções, gerando nova versão da ata ao finalizar novamente.

Registros independentes de aluno (sem reunião) podem ser criados a qualquer tempo e continuam acessíveis; sua inclusão na ata de uma reunião específica é controlada por reunião.

## Consequências

- **Positivas:** fluxo claro; auditabilidade; separa edição vinculada à reunião do registro geral do aluno.
- **Negativas:** toda mutação de reunião precisa verificar estado; reabertura exige preservação de versões.
- **Obrigatório:** coluna `status` na tabela `reuniao`; validação de transição na camada de API; reabertura como operação explícita.
- **Proibido:** editar registros vinculados a uma reunião Finalizada sem reabertura; criar registros vinculados a uma reunião Finalizada; apagar versões/PDFs ao reabrir.

## Confirmação

```bash
grep -E "status.*(draft|rascunho|em_andamento|finalizada|reaberta)" src/db/schema.ts >/dev/null && \
grep -E "Rascunho|Em andamento|Finalizada|Reaberta" src/lib/ 2>/dev/null && \
echo "ciclo de vida presente"
```

## Notas

Verdade atual: RF-018, RN-012 e RN-013 (edição de registros apenas durante conselho) foram revogados no escopo de registros independentes; ainda valem para registros vinculados exclusivamente a uma reunião Finalizada.
