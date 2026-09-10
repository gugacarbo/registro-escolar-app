---
status: accepted
date: 2026-09-08
builds-on:
  - ADR-0011
  - ADR-0017
superseded-by: null
deciders: []
---

# Adota importação em lote de estudantes via CSV/planilha com detecção de duplicidade

## Contexto e problema

Cadastrar estudantes um a um é inviável para turmas grandes. A importação em lote acelera o setup inicial, mas duplicar silenciosamente estudantes compromete o histórico e a geração de atas.

## Direcionadores da decisão

- RF-003, RF-004: cadastro manual e importação em lote.
- RN-002: estudante existe independentemente da turma.
- Seção 33: importação com posterior vínculo às turmas.
- Seção 52: fora do escopo integração automática com sistemas externos.

## Opções consideradas

### Opção 1 — Importação simples sem detecção de duplicidade

**Prós:** rápida de implementar.
**Contras:** cria duplicados silenciosos; histórico fica fragmentado.

### Opção 2 — Importação com merge automático por nome ou documento

**Prós:** menos intervenção do operador.
**Contras:** merge automático pode unir estudantes distintos; perda de dados se errado.

### Opção 3 — Importação com detecção de duplicidade e apresentação de conflitos

**Prós:** operador decide; sem perda silenciosa; estudante permanece entidade única.
**Contras:** interface de resolução de conflitos mais elaborada.

## Decisão

Adotar **Opção 3**: a importação em lote detecta possíveis duplicidades e apresenta conflitos ao operador para decisão. O operador pode confirmar criação, vincular a estudante existente ou revisar. A importação não vincula automaticamente às turmas; o vínculo é feito em passo posterior.

## Consequências

- **Positivas:** integridade do histórico; operador no controle; importação incremental segura.
- **Negativas:** fluxo de importação em duas etapas (estudantes, depois vínculos); necessidade de algoritmo de matching.
- **Obrigatório:** endpoint/rota de importação aceitar CSV ou planilha; etapa de revisão de conflitos; vínculo em etapa separada.
- **Proibido:** criar estudante duplicado sem alertar; vincular automaticamente a turma durante a importação inicial.

## Confirmação

```bash
grep -E "import.*csv\|import.*planilha\|upload.*estudantes" src/ 2>/dev/null && \
echo "importação de estudantes presente"
```

## Notas
