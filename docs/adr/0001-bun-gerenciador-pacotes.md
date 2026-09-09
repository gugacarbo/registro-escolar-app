---
status: accepted
date: 2026-09-08
builds-on: []
superseded-by: null
deciders: []
---

# Adota Bun como gerenciador de pacotes e runtime de build

## Contexto e problema

O projeto precisa de uma ferramenta de gerenciamento de pacotes que seja rápida, com lockfile determinístico e compatível com o ecossistema Node.js. A escolha impacta a velocidade do CI, a reprodutibilidade local e a experiência dos desenvolvedores no dia a dia.

## Direcionadores da decisão

- Velocidade de instalação e execução de scripts.
- Lockfile confiável e compatível com CI (`--frozen-lockfile`).
- Suporte a workspaces monorepo no futuro.
- Compatibilidade com scripts do Vite, Wrangler e Drizzle.

## Opções consideradas

### Opção 1 — npm

**Prós:** padrão do Node.js, amplamente conhecido, nenhuma dependência extra.
**Contras:** instalação lenta, lockfile menos estruturado, workspaces verbosos.

### Opção 2 — pnpm

**Prós:** economia de disco, resolução rigorosa, bom suporte a workspaces.
**Contras:** adiciona uma ferramenta extra; o time já tem familiaridade com Bun.

### Opção 3 — Bun

**Prós:** runtime e package manager unificado, lockfile binário compacto, scripts rápidos, workspace nativo.
**Contras:** compatibilidade ocasional com pacotes que dependem de APIs específicas do Node.js; exige validação contínua.

## Decisão

Adotar **Bun** como gerenciador de pacotes e runtime de execução de scripts do projeto. A escolha unifica instalação, execução e lockfile em uma única ferramenta, reduzindo atrito no CI e garantindo `bun install --frozen-lockfile` como verificação de reprodutibilidade.

## Consequências

- **Positivas:** builds e instalações mais rápidos; lockfile `bun.lock` centralizado; scripts unificados em `package.json`.
- **Negativas:** alguns pacotes podem precisar de validação extra de compatibilidade; contribuidores precisam instalar Bun.
- **Obrigatório:** todo script de build/test/lint deve ser executado via `bun run <script>`.
- **Proibido:** usar `npm install`, `pnpm install` ou `yarn install` no repositório; alterar manualmente `bun.lock`.

## Confirmação

```bash
grep -q '"name": "registro-escolar-app"' package.json && \
  grep -q 'bun.lock' .gitignore || test -f bun.lock
```

## Notas
