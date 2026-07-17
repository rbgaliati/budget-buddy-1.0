import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Orçamento de Obra" },
      { name: "description", content: "Controle de orçamento previsto x realizado por etapa da construção" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Orçamento de Obra" },
      { property: "og:description", content: "Controle de orçamento previsto x realizado por etapa da construção" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const navLink =
    "px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors";
  const activeLink = "bg-accent text-foreground";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <Link to="/" className="text-lg font-semibold">
              Orçamento de Obra
            </Link>
            <nav className="flex gap-1">
              <Link to="/" className={navLink} activeProps={{ className: `${navLink} ${activeLink}` }} activeOptions={{ exact: true }}>
                Dashboard
              </Link>
              <Link to="/lancamentos" className={navLink} activeProps={{ className: `${navLink} ${activeLink}` }}>
                Lançamentos
              </Link>
              <Link to="/inventario" className={navLink} activeProps={{ className: `${navLink} ${activeLink}` }}>
                Inventário
              </Link>
              <Link to="/cotacoes" className={navLink} activeProps={{ className: `${navLink} ${activeLink}` }}>
                Cotações
              </Link>
              <Link to="/gerenciamento" className={navLink} activeProps={{ className: `${navLink} ${activeLink}` }}>
                Gerenciamento
              </Link>
              <Link to="/cadastros" className={navLink} activeProps={{ className: `${navLink} ${activeLink}` }}>
                Cadastros
              </Link>
              <Link to="/import" className={navLink} activeProps={{ className: `${navLink} ${activeLink}` }}>
                Importar
              </Link>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <Outlet />
        </main>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
