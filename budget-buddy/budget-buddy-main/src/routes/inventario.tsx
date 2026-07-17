import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBudget, formatBRL, type ExpenseItem, type Expense } from "@/lib/budget-store";
import { Download, Package } from "lucide-react";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventário | Orçamento de Obra" },
      { name: "description", content: "Inventário de itens e serviços lançados no projeto." },
    ],
  }),
  component: Inventario,
});

function formatISODateBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

interface FlatItem {
  expenseDate: string;
  expense: Expense;
  item: ExpenseItem;
}

function Inventario() {
  const state = useBudget();

  const rows: FlatItem[] = state.expenses.flatMap((expense) =>
    (expense.items ?? []).map((item) => ({
      expenseDate: expense.date,
      expense,
      item,
    }))
  );

  rows.sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));

  const totalGeral = rows.reduce((sum, r) => sum + r.item.quantity * r.item.unitValue, 0);

  function exportCSV() {
    const header = ["Data", "Item", "Tipo", "Unidade", "Quantidade", "Valor Unitario", "Valor Total", "Fornecedor"];
    const lines = rows.map((r) => {
      const lineTotal = r.item.quantity * r.item.unitValue;
      return [
        formatISODateBR(r.expenseDate),
        r.item.description,
        r.item.kind === "material" ? "Material" : "Servico",
        r.item.unit,
        String(r.item.quantity).replace(".", ","),
        String(r.item.unitValue.toFixed(2)).replace(".", ","),
        String(lineTotal.toFixed(2)).replace(".", ","),
        r.expense.supplier || "",
      ];
    });

    const csvContent = [header, ...lines]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Inventário de Itens</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Itens Lançados
          </CardTitle>
          {rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum item lançado ainda. Vá até a aba Lançamentos para adicionar itens às despesas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor Unitário</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Fornecedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => {
                    const lineTotal = r.item.quantity * r.item.unitValue;
                    return (
                      <TableRow key={`${r.expense.id}-${r.item.id}-${idx}`}>
                        <TableCell>{formatISODateBR(r.expenseDate)}</TableCell>
                        <TableCell className="font-medium">{r.item.description}</TableCell>
                        <TableCell className="capitalize">
                          {r.item.kind === "material" ? "Material" : "Serviço"}
                        </TableCell>
                        <TableCell>{r.item.unit}</TableCell>
                        <TableCell className="text-right">
                          {r.item.quantity.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">{formatBRL(r.item.unitValue)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatBRL(lineTotal)}</TableCell>
                        <TableCell>{r.expense.supplier || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-end gap-4 border-t pt-4">
                <span className="text-sm text-muted-foreground">Total Geral</span>
                <span className="text-lg font-bold">{formatBRL(totalGeral)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
