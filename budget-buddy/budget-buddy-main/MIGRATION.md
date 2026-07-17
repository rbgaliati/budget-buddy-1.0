# MIGRATION.md — Guia de Arquitetura para Migração ao VS Code

Este documento descreve a arquitetura do aplicativo para permitir sua
continuidade fora do ambiente Lovable, em um editor local como o VS Code.

## 1. Visão geral

Aplicativo web para **gestão de orçamento e execução de obra**, contendo
módulos de Cadastros, Lançamentos (despesas), Cotações, Inventário e
Gerenciamento. Toda a persistência atual acontece **no navegador**
(`localStorage`) — não há backend próprio. A migração para uma API real
está prevista no `API_CONTRACT.md`.

## 2. Stack e principais bibliotecas

| Camada             | Tecnologia                                                |
| ------------------ | --------------------------------------------------------- |
| Framework          | **TanStack Start v1** (SSR/SSG sobre React 19)            |
| Roteamento         | **TanStack Router** (file-based em `src/routes/`)         |
| Build              | **Vite 7**                                                |
| Data fetching      | **TanStack Query 5** (configurado no root)                |
| UI                 | **shadcn/ui** + **Radix UI** + **Tailwind CSS v4**        |
| Formulários        | **react-hook-form** + **zod** (`@hookform/resolvers`)     |
| Ícones             | **lucide-react**                                          |
| Gráficos           | **recharts**                                              |
| Datas              | **date-fns**, **react-day-picker**                        |
| PDF                | **jspdf** + **jspdf-autotable** (relatórios de cotações)  |
| Toasts             | **sonner**                                                |
| Server functions   | `createServerFn` de `@tanstack/react-start` (edge Worker) |
| Package manager    | **bun** (mas `npm`/`pnpm` funcionam)                      |

## 3. Estrutura de pastas

```
src/
├── routes/                # rotas file-based (TanStack Router)
│   ├── __root.tsx         # shell HTML, providers, Toaster, <Outlet/>
│   ├── index.tsx          # / (dashboard/inicial)
│   ├── cadastros.tsx      # /cadastros — contas, cartões, fornecedores
│   ├── lancamentos.tsx    # /lancamentos — despesas, parcelas, estágios
│   ├── cotacoes.tsx       # /cotacoes — cotações e propostas
│   ├── inventario.tsx     # /inventario — materiais/estoque
│   └── gerenciamento.tsx  # /gerenciamento — visão consolidada
├── components/ui/         # componentes shadcn/ui
├── hooks/
│   └── use-mobile.tsx     # detecção de viewport mobile
├── lib/
│   ├── budget-store.ts    # STORE GLOBAL — estado do app (useSyncExternalStore + localStorage)
│   ├── quotation-pdf.ts   # geração de PDF de cotações (jspdf)
│   ├── error-capture.ts   # captura de erros globais
│   ├── error-page.ts      # UI de erro
│   ├── config.server.ts   # leitura de process.env (server-only)
│   ├── utils.ts           # helpers (cn, etc.)
│   └── api/
│       └── example.functions.ts  # exemplo de createServerFn
├── router.tsx             # instância do router + QueryClient
├── start.ts               # entrypoint/middleware TanStack Start
├── server.ts              # entry SSR
├── styles.css             # Tailwind v4 + tema (design tokens)
└── routeTree.gen.ts       # GERADO — não editar
```

## 4. Roteamento

Convenção **flat com pontos** (ex.: `settings.profile.tsx` → `/settings/profile`).
Hoje o app tem apenas rotas simples de primeiro nível. Cada rota é um arquivo
que exporta `Route = createFileRoute("/xxx")({ component })`.

O `src/routeTree.gen.ts` é regenerado automaticamente pelo plugin do Vite —
**nunca editar manualmente**.

## 5. Estado da aplicação (crítico!)

Não existe Redux, Zustand ou Context tradicional. Todo o domínio da obra
vive em **`src/lib/budget-store.ts`**, que expõe:

- Tipos: `Stage`, `Account`, `Expense`, `Installment`, `ExpenseItem`,
  `Supplier`, `Quotation`, `Proposal`, `InventoryItem`, etc.
- Uma store baseada em `useSyncExternalStore` que persiste tudo em
  `localStorage` na chave **`obra-budget-v2`**.
- Sincronização entre abas via evento `storage` do `window`.
- Hooks/seletores consumidos diretamente pelas páginas em `src/routes/*.tsx`.

**Toda página lê/escreve o estado através desse módulo.** Ao migrar para
backend, este é o ponto único de substituição (ver `API_CONTRACT.md`).

## 6. Como as páginas se comunicam

- Não há props drilling nem event bus entre rotas.
- Rotas são independentes; compartilham dados **via `budget-store.ts`**.
- Navegação entre páginas: `<Link to="/rota" />` do `@tanstack/react-router`.
- Notificações cross-página: `toast()` do **sonner** (Toaster no `__root.tsx`).

## 7. Componentes reutilizáveis

- `src/components/ui/*` — biblioteca **shadcn/ui** completa (Button, Dialog,
  Select, Table, Form, Sonner, etc.). Editáveis livremente.
- Não há componentes de domínio compartilhados hoje — cada rota implementa
  seus próprios formulários e tabelas. Refatorar em componentes reutilizáveis
  é uma melhoria natural pós-migração (`cotacoes.tsx` tem ~1.2k linhas e
  `lancamentos.tsx` ~1.8k linhas).

## 8. Hooks

- `src/hooks/use-mobile.tsx` — booleano indicando viewport <768px.
- Hooks de domínio ficam inline em `budget-store.ts` (seletores memoizados).

## 9. Server functions

O template suporta `createServerFn` (RPC tipado client→server) e rotas HTTP
em `src/routes/api/`. Atualmente **apenas o exemplo `getGreeting`** existe
em `src/lib/api/example.functions.ts`. Nada do domínio usa server functions
ainda — tudo é client-side.

## 10. Estilos e tema

- Tailwind v4 via `@tailwindcss/vite`, configurado em `src/styles.css`
  usando `@theme` e tokens CSS (não há `tailwind.config.js`).
- Fontes remotas devem ser incluídas via `<link>` no `head()` de
  `__root.tsx`, não `@import` no CSS.

## 11. Deploy atual

TanStack Start compilado para **edge Worker** (Cloudflare-compatível) via
plugin `@lovable.dev/vite-tanstack-config`. Localmente `vite dev` basta.
Para produção em VS Code, `vite build` gera `.output/` executável em Node
ou em runtimes edge.

## 12. Pontos de atenção para a migração

1. **Persistência**: hoje 100% em `localStorage`. Substituir `budget-store.ts`
   por chamadas a um backend (ver `API_CONTRACT.md`).
2. **Autenticação**: inexistente. Nenhuma noção de usuário.
3. **`routeTree.gen.ts`**: manter no `.gitignore` **não** é recomendado — o
   plugin do TanStack Router precisa dele em dev; mantenha versionado.
4. **`@lovable.dev/vite-tanstack-config`**: dependência específica do
   ambiente Lovable. Se quiser desacoplar totalmente, troque por a
   configuração padrão do TanStack Start (`@tanstack/react-start/plugin`).
5. **Node ≥ 20** obrigatório (React 19 + Vite 7).
