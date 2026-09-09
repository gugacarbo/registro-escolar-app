---
status: accepted
date: 2026-09-08
builds-on:
  - ADR-0008
superseded-by: null
deciders: []
---

# Adota modelo single-tenant com operador único e sem permissões granulares

## Contexto e problema

A primeira versão será usada por uma única pessoa em uma única instituição. Professores e servidores são entidades do domínio, mas não são usuários do sistema. A decisão impacta escopo de autenticação, multi-tenancy e RBAC.

## Direcionadores da decisão

- RF-001, RF-002: operador único, instituição única.
- Seção 4: usuário da primeira versão.
- Seção 52: fora do escopo — múltiplos usuários, múltiplas instituições, RBAC.
- Seção 49: dados não podem ser públicos.

## Opções consideradas

### Opção 1 — Multi-tenant com RBAC desde o início

**Prós:** escalável; prepara futuras permissões.
**Contras:** complexidade desnecessária para a primeira versão; atrasa entrega do cenário principal.

### Opção 2 — Single-tenant com um único operador autenticado

**Prós:** simples; atende cenário de uso inicial; ainda exige autenticação para proteger dados.
**Contras:** precisará evoluir quando surgirem múltiplos operadores ou instituições.

### Opção 3 — Sem autenticação (dados locais isolados)

**Prós:** máxima simplicidade.
**Contras:** viola seção 49; dados escolares não podem ficar acessíveis sem autorização.

## Decisão

Adotar **Opção 2**: aplicação single-tenant, uma única conta de operador por instância de deploy, autenticação via Better Auth (ADR-0008), sem RBAC granular na primeira versão. Servidores cadastrados no domínio não possuem contas de acesso.

## Consequências

- **Positivas:** escopo enxuto; autenticação já prevista; transição para multi-operador/instituição fica isolada em futuras ADRs.
- **Negativas:** não há distinção de permissões; todas as ações são do operador autenticado.
- **Obrigatório:** autenticação Better Auth ativa; tabela/configuração sem tenantId/organizationId no schema inicial; servidor é entidade do domínio separada de usuário.
- **Proibido:** adicionar RBAC, multi-tenancy ou convites de professor sem superseder esta ADR; expor dados sem sessão ativa.

## Confirmação

```bash
grep -q "better-auth" package.json && \
! grep -q "tenantId\|organizationId" src/db/schema.ts && \
echo "single-tenant e operador único"
```

## Notas
