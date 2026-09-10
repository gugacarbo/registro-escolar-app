---
status: accepted
date: 2026-09-08
builds-on:
  - ADR-0013
  - ADR-0012
  - ADR-0011
superseded-by: null
deciders: []
---

# Adota restrição de autoria de registros a participantes da reunião

## Contexto e problema

Os registros podem indicar quem originou a informação (professor, coordenação etc.). Se a autoria for livre, registros podem ser atribuídos a servidores ausentes do conselho, comprometendo a ata e a confiança no histórico.

## Direcionadores da decisão

- RF-024, RF-025: autoria opcional e restrição a participantes.
- RN-008, RN-009: autoria opcional; quando existe, servidor deve ser participante.
- CA-005: autoria inválida deve ser rejeitada.
- Seções 17 e 21: regra aplicada a registros de estudante e relatos gerais.

## Opções consideradas

### Opção 1 — Autoria livre vinculada a Servidor

**Prós:** flexível; permite citar qualquer servidor cadastrado.
**Contras:** permite atribuir registros a quem não participou da reunião; quebra a ata formal.

### Opção 2 — Autoria restrita a participantes da reunião

**Prós:** consistência com a ata e com os papéis declarados.
**Contras:** exige que participantes estejam cadastrados antes dos registros.

### Opção 3 — Sem autoria

**Prós:** simplifica interface e validação.
**Contras:** perde rastreabilidade desejada nos registros e na ata.

## Decisão

Adotar **Opção 2** com autoria opcional. Registros de estudante e relatos gerais podem indicar um autor; quando indicado, o autor deve obrigatoriamente constar como participante daquela reunião.

## Consequências

- **Positivas:** ata consistente; autoria confiável; histórico auditável.
- **Negativas:** validação adicional na API e no formulário; participantes devem estar definidos antes do registro.
- **Obrigatório:** FK de `registroEstudante.origemId` e `relatoGeral.origemId` para `participacaoReuniao` (não para `servidor` diretamente).
- **Proibido:** permitir autoria de servidor que não participa da reunião; exigir autoria em todos os registros.

## Confirmação

```bash
grep -E "participacaoReuniao|meetingParticipant" src/db/schema.ts >/dev/null && \
grep -E "origemId|authorId" src/db/schema.ts >/dev/null && \
echo "autoria vinculada a participação"
```

## Notas
