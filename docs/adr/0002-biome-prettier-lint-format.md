---
status: proposed
date: 2026-09-08
builds-on:
  - ADR-0001
superseded-by: null
deciders: []
---

# Adota Biome e Prettier para lint, formatação e padronização de código

## Contexto e problema

O projeto precisa de ferramentas de qualidade de código rápidas, consistentes e integradas ao CI. A escolha afeta a legibilidade, a velocidade do feedback em PRs e a manutenção do style guide.

## Direcionadores da decisão

- Velocidade de execução no CI e localmente.
- Regras claras de lint e formatação para TypeScript, TSX e JSON.
- Separação de responsabilidades entre lint de código e formatação de Markdown/YAML/shell.
- Integração com hooks e CI sem custo excessivo.

## Opções consideradas

### Opção 1 — ESLint + Prettier + plugins

**Prós:** ecossistema maduro, plugins para React, TypeScript e acessibilidade.
**Contras:** configuração fragmentada, dependências numerosas, performance inferior em repositórios pequenos.

### Opção 2 — Biome + Prettier

**Prós:** Biome unifica lint e format em Rust (rápido); Prettier cobre arquivos não suportados pelo Biome (Markdown, YAML, shell).
**Contras:** Biome ainda evolui no suporte a algumas regras específicas; Prettier é mais lento que Biome.

### Opção 3 — Rome (antigo) / Deno fmt

**Prós:** formatador integrado.
**Contras:** Rome foi descontinuado; Deno fmt não se integra naturalmente ao ecossistema Vite/React do projeto.

## Decisão

Adotar **Biome 2.x** para lint e formatação de TypeScript, TSX e JSON, complementado por **Prettier** para Markdown, YAML e shell. A combinação mantém o CI rápido e cobre todos os tipos de arquivo do repositório sem multiplicar configurações.

## Consequências

- **Positivas:** feedback rápido no CI; configuração mínima; formatação consistente em todos os arquivos.
- **Negativas:** dois formatadores exigem `biome.json` e `.prettierrc` separados; alguns padrões de React exigem ajustes de regras Biome.
- **Obrigatório:** todo código deve passar em `bun run check`.
- **Proibido:** formatar arquivos fora do escopo de cada ferramenta; ignorar erros de lint em CI.

## Confirmação

```bash
bun run check
```

## Notas
