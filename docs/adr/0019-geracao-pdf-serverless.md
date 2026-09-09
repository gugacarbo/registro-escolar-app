---
status: proposed
date: 2026-09-08
builds-on:
  - ADR-0014
  - ADR-0007
superseded-by: null
deciders: []
---

# Adota geração de PDF das atas em pipeline serverless/edge

## Contexto e problema

As atas precisam ser geradas como PDF oficiais a partir dos dados da reunião e do template escolhido. A arquitetura escolhida é Cloudflare Workers (ADR-0007), então a geração de PDF deve ser compatível com runtime edge, sem depender de serviços externos obrigatórios ou binários pesados.

## Direcionadores da decisão

- RF-040, RF-041, RF-042: geração, versionamento e preservação de PDF.
- ADR-0007: Cloudflare Workers como runtime.
- ADR-0014: ata com versões e PDF.
- CA-008, CA-009: versões preservadas; template não altera dados.

## Opções consideradas

### Opção 1 — Geração no cliente com browser print-to-PDF

**Prós:** nenhuma dependência server; simples.
**Contras:** inconsistente entre navegadores; difícil de versionar e armazenar; não atende "ata oficial" com controle de versão.

### Opção 2 — Serviço externo de geração de PDF

**Prós:** renderização sofisticada.
**Contras:** dependência de rede e custo; dados sensíveis saem da infraestrutura.

### Opção 3 — Geração serverless/edge com biblioteca compatível com Workers

**Prós:** controle total; versionamento; não expõe dados fora; aproveita runtime escolhido.
**Contras:** limitações de bibliotecas no Workers; templates precisam ser projetados para renderização programática.

## Decisão

Adotar **Opção 3**: gerar PDF das atas dentro do runtime serverless/edge (Cloudflare Workers) usando biblioteca compatível com o ambiente (ex.: `@react-pdf/renderer` ou similar validado). Cada versão da ata gera e armazena seu próprio PDF.

## Consequências

- **Positivas:** dados não saem da infraestrutura; PDFs versionados; integração com pipeline de deploy.
- **Negativas:** restrições de runtime exigem testes reais de renderização; tamanho do bundle a monitorar.
- **Obrigatório:** função/endpoint de geração de PDF no Worker; PDF vinculado à `ataVersao`; template determina layout; não altera registros.
- **Proibido:** gerar PDF apenas no cliente como única versão oficial; sobrescrever PDF de uma versão já gerada.

## Confirmação

```bash
grep -E "pdf|PDF|ataVersao" src/ 2>/dev/null && \
grep -q "@react-pdf\|pdf-lib\|puppeteer" package.json && \
echo "geração de PDF presente"
```

## Notas
