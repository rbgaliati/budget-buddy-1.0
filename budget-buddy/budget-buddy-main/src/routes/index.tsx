import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget, formatBRL, type BudgetState } from "@/lib/budget-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Orçamento de Obra" },
      { name: "description", content: "Acompanhe o previsto x realizado em cada etapa da obra." },
    ],
  }),
  component: Dashboard,
});

function getStageBreakdown(s: BudgetState, stageId: string) {
  let paid = 0;
  let open = 0;
  for (const e of s.expenses) {
    if (e.stageId !== stageId) continue;
    for (const i of e.installments) {
      if (i.paid) paid += i.amount;
      else open += i.amount;
    }
  }
  return { paid, open };
}

function StackedBar({
  planned,
  paid,
  open,
}: {
  planned: number;
  paid: number;
  open: number;
}) {
  const spent = paid + open;
  const over = spent > planned;
  const denom = Math.max(planned, spent, 1);
  const paidPct = (paid / denom) * 100;
  const openPct = (open / denom) * 100;
  const unusedPct = Math.max(0, ((planned - spent) / denom) * 100);

  return (
    <div className="space-y-1">
      <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {paidPct > 0 && (
          <div
            className="h-full bg-red-500"
            style={{ width: `${paidPct}%` }}
            title={`Pago: ${formatBRL(paid)}`}
          />
        )}
        {openPct > 0 && (
          <div
            className="h-full bg-orange-500"
            style={{ width: `${openPct}%` }}
            title={`Em aberto: ${formatBRL(open)}`}
          />
        )}
        {unusedPct > 0 && !over && (
          <div
            className="h-full bg-green-500"
            style={{ width: `${unusedPct}%` }}
            title={`Não utilizado: ${formatBRL(planned - spent)}`}
          />
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const state = useBudget();
  const totals = state.stages.reduce(
    (acc, s) => {
      const { paid, open } = getStageBreakdown(state, s.id);
      acc.planned += s.planned;
      acc.paid += paid;
      acc.open += open;
      return acc;
    },
    { planned: 0, paid: 0, open: 0 },
  );
  const totalSpent = totals.paid + totals.open;
  const unused = Math.max(0, totals.planned - totalSpent);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{state.projectName}</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do orçamento previsto x realizado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Previsto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBRL(totals.planned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{formatBRL(totals.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">{formatBRL(totals.open)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Não utilizado</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                totals.planned - totalSpent < 0 ? "text-destructive" : "text-green-600"
              }`}
            >
              {formatBRL(totals.planned - totalSpent)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Etapas</CardTitle>
          <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-red-500" /> Pago
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-orange-500" /> Em aberto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-green-500" /> Não utilizado
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {state.stages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma etapa cadastrada. Vá em Cadastros para começar.
            </p>
          )}
          {state.stages.map((s) => {
            const { paid, open } = getStageBreakdown(state, s.id);
            const spent = paid + open;
            const over = spent > s.planned;
            return (
              <div key={s.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className={over ? "text-destructive" : "text-muted-foreground"}>
                    {formatBRL(spent)} / {formatBRL(s.planned)}
                  </span>
                </div>
                <StackedBar planned={s.planned} paid={paid} open={open} />
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    <span className="text-red-500">Pago:</span> {formatBRL(paid)}
                  </span>
                  <span>
                    <span className="text-orange-500">Em aberto:</span> {formatBRL(open)}
                  </span>
                  <span>
                    <span className={over ? "text-destructive" : "text-green-600"}>
                      {over ? "Excedido:" : "Não utilizado:"}
                    </span>{" "}
                    {formatBRL(Math.abs(s.planned - spent))}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
