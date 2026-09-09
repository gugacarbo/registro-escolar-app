---
status: proposed
date: 2026-09-08
builds-on:
  - ADR-0007
superseded-by: null
deciders: []
---

# Adota Cloudflare D1 como banco de dados principal

## Contexto e problema

A aplicação precisa persistir dados de forma serverless, próxima ao edge e sem administrar servidores de banco. A escolha impacta custo, latência, modelo de concorrência e simplicidade operacional.

## Direcionadores da decisão

- Execução no edge (Cloudflare Workers).
- Modelo relacional com SQL padrão.
- Baixa sobrecarga operacional.
- Integração nativa com a runtime escolhida.

## Opções consideradas

### Opção 1 — PostgreSQL externo (Supabase, Neon, RDS)

**Prós:** banco relacional completo, ferramentas maduras.
**Contras:** latência de rede até o edge, custo operacional, configuração de conexões a partir de Workers.

### Opção 2 — Cloudflare D1

**Prós:** integração nativa com Workers, SQLite serverless, replicação regional, sem gestão de conexões.
**Contras:** SQLite tem limitações de concorrência escrita; ainda evolui alguns recursos de produção.

### Opção 3 — KV ou R2 com modelagem manual

**Prós:** simples para leituras de alta performance.
**Contras:** perde semântica relacional, joins e integridade referencial; aumenta complexidade de queries.

## Decisão

Adotar **Cloudflare D1** como banco de dados principal. A escolha aproveita a co-localização com Workers e o modelo SQL relacional via SQLite, reduzindo latência e operação para o domínio escolar do projeto.

## Consequências

- **Positivas:** binding nativo `DB` no Workers; migrations versionadas; SQL padrão com Drizzle ORM.
- **Negativas:** restrições de concorrência escrita do SQLite; backups e restore seguem a roadmap da Cloudflare.
- **Obrigatório:** toda interação com banco deve usar o binding `DB` via Drizzle.
- **Proibido:** usar PostgreSQL/MySQL ou bancos externos sem ADR futura que supersedes esta.

## Confirmação

```bash
grep -q '"d1_databases"' wrangler.jsonc && grep -q 'drizzle-orm/d1' src/db/index.ts
```

## Notas
