# Gestão de Obra

Aplicativo web para acompanhamento de orçamento, despesas, cotações e
inventário de uma obra. Construído com **TanStack Start + React 19 +
Tailwind v4 + shadcn/ui**.

> Persistência atual: **`localStorage` do navegador** (chave
> `obra-budget-v2`). Ainda não há backend. Consulte `API_CONTRACT.md`
> para o contrato REST proposto e `MIGRATION.md` para a arquitetura.

## Pré-requisitos

- **Node.js ≥ 20** (recomendado 20 LTS ou 22)
- **Bun ≥ 1.1** *(recomendado — o lockfile é `bun.lock`)*
  Alternativa: `npm ≥ 10` ou `pnpm ≥ 9`
- Git

Extensões sugeridas no VS Code:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar) *(opcional)*

## Instalação

```bash
git clone <URL-DO-SEU-REPO>
cd <pasta-do-projeto>

# com Bun (recomendado)
bun install

# ou com npm
npm install
```

## Rodando em desenvolvimento

```bash
bun run dev        # ou: npm run dev
```

Abra <http://localhost:5173> (Vite avisa a porta no terminal).

Hot reload de rotas: basta criar/editar arquivos em `src/routes/`; o
`src/routeTree.gen.ts` é regenerado automaticamente.

## Scripts disponíveis

| Script              | O que faz                                         |
| ------------------- | ------------------------------------------------- |
| `dev`               | Servidor de desenvolvimento (Vite + SSR)          |
| `build`             | Build de produção                                 |
| `build:dev`         | Build com modo `development` (mais debugável)     |
| `preview`           | Serve o build de produção localmente              |
| `lint`              | Roda ESLint                                       |
| `format`            | Formata todo o projeto com Prettier               |

## Variáveis de ambiente

O app **não requer variáveis de ambiente** para funcionar hoje —
tudo roda client-side.

Quando adicionar backend/integrações, crie um arquivo **`.env`** na raiz
com o seguinte modelo (nenhuma dessas chaves é obrigatória agora):

```dotenv
# .env — exemplo. Nada aqui é obrigatório hoje.

# Ambiente (dev | production)
NODE_ENV=development

# Variáveis expostas ao browser precisam do prefixo VITE_
VITE_API_BASE_URL=http://localhost:3000/api

# Variáveis SERVER-ONLY (lidas apenas dentro de createServerFn / rotas /api)
# NUNCA prefixe com VITE_ — elas vazariam ao bundle client.
# DATABASE_URL=postgres://user:pass@localhost:5432/obra
# JWT_SECRET=troque-me
```

Regras:
- `VITE_*` → disponíveis no navegador via `import.meta.env.VITE_*`.
- Sem prefixo → **server-only**, lidas via `process.env.X` **dentro** do
  `.handler()` de um `createServerFn` (ver `src/lib/config.server.ts`).
- Nunca commite o `.env` — deixe apenas um `.env.example` no repo.

## Estrutura de pastas (resumo)

```
src/
├── routes/           # páginas (file-based, TanStack Router)
├── components/ui/    # componentes shadcn/ui
├── hooks/            # hooks utilitários
├── lib/
│   ├── budget-store.ts   # STORE central (localStorage)
│   ├── quotation-pdf.ts  # geração de PDF de cotações
│   └── api/              # createServerFn (exemplos)
├── router.tsx        # instância do router + QueryClient
├── start.ts          # middleware TanStack Start
├── server.ts         # entry SSR
└── styles.css        # Tailwind v4 + tema
```

Detalhes completos em [`MIGRATION.md`](./MIGRATION.md).

## Build de produção

```bash
bun run build
bun run preview   # testa o build localmente
```

O output em `.output/` pode ser executado em Node (`node .output/server/index.mjs`)
ou implantado em runtime edge (Cloudflare Workers, Netlify Edge, etc.).

## Solução de problemas

- **Página em branco após criar rota**: verifique que a string em
  `createFileRoute("/x")` combina exatamente com o nome do arquivo.
- **Erros em `routeTree.gen.ts`**: **não edite** — apague o arquivo e
  rode `bun run dev` para regerar.
- **Estilos não aplicam**: confirme que `src/styles.css` está importado
  no `__root.tsx` (`import appCss from "../styles.css?url"`).
- **`process.env.X` undefined**: leia sempre **dentro** do `.handler()`
  de um `createServerFn` — não em escopo de módulo.

## Documentação relacionada

- [`MIGRATION.md`](./MIGRATION.md) — arquitetura, stack, decisões
- [`API_CONTRACT.md`](./API_CONTRACT.md) — contrato REST proposto para backend
