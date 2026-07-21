import { Fragment, useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, Download, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Expense, ExpenseItem, ItemKind, Quotation } from "@/lib/budget-store";
import {
  useBudget,
  budgetActions,
  useLoading,
  formatBRL,
  isExpensePaid,
  paymentMethodLabel,
  receiptTypeLabel,
  type PaymentMethod,
  type Installment,
  type ReceiptType,
} from "@/lib/budget-store";
import { crudToasts, toastError } from "@/lib/toast-helper";

export const Route = createFileRoute("/lancamentos")({
  head: () => ({
    meta: [
      { title: "Lançamentos | Orçamento de Obra" },
      { name: "description", content: "Registre as despesas individuais por etapa da construção." },
    ],
  }),
  component: Lancamentos,
});

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatISODateBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function makeReceiptTypeChangeHandler(
  setReceiptType: (v: ReceiptType) => void,
  setInvoiceNumber: (v: string) => void,
) {
  return (v: string) => {
    setReceiptType(v as ReceiptType);
    if (v !== "nota_fiscal") setInvoiceNumber("");
  };
}

function Lancamentos() {
  const state = useBudget();
  const loading = useLoading();
  const [stageId, setStageId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("avista");
  const [receiptType, setReceiptType] = useState<ReceiptType>("nota_fiscal");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [paidNow, setPaidNow] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Expense | null>(null);
  const [itemsExpense, setItemsExpense] = useState<Expense | null>(null);
  const [pendencyExpenses, setPendencyExpenses] = useState<Expense[] | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splits, setSplits] = useState<Array<{ stageId: string; amount: number }>>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ expenseIds: string[]; description: string } | null>(null);


  const reset = () => {
    setDescription("");
    setSupplier("");
    setAmount("");
    setPaidNow(false);
    setInstallmentsCount("1");
    setReceiptType("nota_fiscal");
    setInvoiceNumber("");
    setSplits([]);
  };

  const buildInstallments = (value: number): Installment[] => {
    if (!accountId) return [];
    const useInstallments = paymentMethod === "cartao" || paymentMethod === "parcelado";
    if (useInstallments) {
      const n = Math.max(1, parseInt(installmentsCount, 10) || 1);
      const each = +(value / n).toFixed(2);
      return Array.from({ length: n }, (_, i) => ({
        id: crypto.randomUUID(),
        dueDate: addMonths(firstDueDate, i),
        amount: i === n - 1 ? +(value - each * (n - 1)).toFixed(2) : each,
        paid: false,
        accountId,
      }));
    }
    return [
      {
        id: crypto.randomUUID(),
        dueDate: firstDueDate,
        amount: value,
        paid: paidNow,
        accountId,
      },
    ];
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!accountId || !description.trim() || isNaN(value) || value <= 0) {
      toastError("Preencha todos os campos corretamente");
      return;
    }

    const hasSplits = splits.length > 0;
    if (!hasSplits && !stageId) {
      toastError("Selecione uma etapa ou crie um rateio");
      return;
    }

    try {
      if (hasSplits) {
        const total = +splits.reduce((s, x) => s + x.amount, 0).toFixed(2);
        if (Math.abs(total - value) > 0.01) {
          toastError("A soma dos rateios não corresponde ao valor total");
          return;
        }
        await Promise.all(
          splits.map(
            (sp) =>
              sp.amount > 0 &&
              crudToasts.create(
                Promise.resolve(
                  budgetActions.addExpense({
                    stageId: sp.stageId,
                    description: description.trim(),
                    supplier: supplier.trim(),
                    amount: sp.amount,
                    date,
                    paymentMethod,
                    receiptType,
                    invoiceNumber: receiptType === "nota_fiscal" ? invoiceNumber.trim() : undefined,
                    installments: buildInstallments(sp.amount),
                  })
                ),
                "Despesa"
              )
          )
        );
      } else {
        await crudToasts.create(
          Promise.resolve(
            budgetActions.addExpense({
              stageId: stageId!,
              description: description.trim(),
              supplier: supplier.trim(),
              amount: value,
              date,
              paymentMethod,
              receiptType,
              invoiceNumber: receiptType === "nota_fiscal" ? invoiceNumber.trim() : undefined,
              installments: buildInstallments(value),
            })
          ),
          "Despesa"
        );
      }
      reset();
    } catch (error) {
      console.error(error);
    }
  };

  const stageName = (id: string) => state.stages.find((s) => s.id === id)?.name ?? "—";
  const accountName = (id: string) => state.accounts.find((a) => a.id === id)?.name ?? "—";
  const itemsStatus = (e: Expense): "pending" | "ok" | "divergent" => {
    if (!e.items || e.items.length === 0) return "pending";
    const total = +e.items.reduce((s, it) => s + it.quantity * it.unitValue, 0).toFixed(2);
    return Math.abs(total - e.amount) <= 0.01 ? "ok" : "divergent";
  };
  const filteredAccounts = state.accounts.filter((a) =>
    paymentMethod === "cartao" ? a.type === "cartao" : a.type === "conta",
  );
  const useInstallmentsUi = paymentMethod === "cartao" || paymentMethod === "parcelado";

  const handleReceiptTypeChange = makeReceiptTypeChangeHandler(setReceiptType, setInvoiceNumber);

  const sorted = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date));
  const supplierSuggestions = Array.from(
    new Set(state.expenses.map((e) => e.supplier).filter((s) => s.trim().length > 0)),
  );
  const noStages = state.stages.length === 0;
  const noAccounts = state.accounts.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lançamento de despesas</h1>
        <p className="text-sm text-muted-foreground">
          Registre cada gasto e vincule à etapa, fornecedor e conta utilizada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova despesa</CardTitle>
        </CardHeader>
        <CardContent>
          {noStages || noAccounts ? (
            <p className="text-sm text-muted-foreground">
              {noStages ? "Cadastre uma etapa" : "Cadastre uma conta ou cartão"} antes de lançar despesas.
            </p>
          ) : (
            <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-12">
              <div className="md:col-span-3">
                <div className="flex items-center justify-between">
                  <Label>Etapa</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
                    onClick={() => setSplitOpen(true)}
                  >
                    Ratear
                  </button>
                </div>
                {splits.length > 0 ? (
                  <div className="mt-1 flex h-9 items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 text-sm">
                    <span>Rateado entre {splits.length} etapa{splits.length > 1 ? "s" : ""}</span>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setSplits([])}
                    >
                      limpar
                    </button>
                  </div>
                ) : (
                  <Select value={stageId} onValueChange={setStageId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="md:col-span-5">
                <Label htmlFor="desc">Descrição</Label>
                <Input
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Compra de cimento"
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-4">
                <Label htmlFor="supplier">Nome do fornecedor</Label>
                <Input
                  id="supplier"
                  list="supplier-suggestions"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Ex: Casa do Construtor"
                  className="mt-1"
                />
                <datalist id="supplier-suggestions">
                  {supplierSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="date">Data da despesa</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-3">
                <Label>Forma de pagamento</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => {
                    setPaymentMethod(v as PaymentMethod);
                    setAccountId(undefined);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avista">À vista</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão de crédito</SelectItem>
                    <SelectItem value="parcelado">Parcelado (acordo com fornecedor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <Label>Tipo de comprovante</Label>
                <Select value={receiptType} onValueChange={handleReceiptTypeChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nota_fiscal">Nota Fiscal</SelectItem>
                    <SelectItem value="recibo">Recibo</SelectItem>
                    <SelectItem value="sem_comprovante">Sem Comprovante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {receiptType === "nota_fiscal" && (
                <div className="md:col-span-3">
                  <Label htmlFor="invoiceNumber">Nº da Nota Fiscal</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ex: 001234"
                    className="mt-1"
                  />
                </div>
              )}

              <div className="md:col-span-3">
                <Label>{paymentMethod === "cartao" ? "Cartão (padrão)" : "Conta (padrão)"}</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Nenhuma {paymentMethod === "cartao" ? "cartão" : "conta"} cadastrada
                      </div>
                    ) : (
                      filteredAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {useInstallmentsUi ? (
                <>
                  <div className="md:col-span-2">
                    <Label htmlFor="parc">Parcelas</Label>
                    <Input
                      id="parc"
                      type="number"
                      min={1}
                      max={36}
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label htmlFor="firstDue">1º vencimento</Label>
                    <Input
                      id="firstDue"
                      type="date"
                      value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-3">
                    <Label htmlFor="payDate">Data do pagamento</Label>
                    <Input
                      id="payDate"
                      type="date"
                      value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-end gap-2">
                    <Checkbox
                      id="paidNow"
                      checked={paidNow}
                      onCheckedChange={(v) => setPaidNow(v === true)}
                    />
                    <Label htmlFor="paidNow" className="cursor-pointer">
                      Pagamento efetuado
                    </Label>
                  </div>
                </>
              )}

              <div className="md:col-span-12">
                <LoadingButton
                  type="submit"
                  isLoading={loading.creating}
                  loadingText="Criando despesa..."
                >
                  Lançar despesa
                </LoadingButton>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Despesas registradas</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={sorted.length === 0}
            onClick={() => {
              const rows: string[][] = [
                [
                  "Data despesa",
                  "Etapa",
                  "Descrição",
                  "Fornecedor",
                  "Forma pagamento",
                  "Tipo comprovante",
                  "Nº Nota Fiscal",
                  "Parcela",
                  "Total parcelas",
                  "Vencimento",
                  "Valor parcela",
                  "Conta",
                  "Status",
                  "Valor total despesa",
                ],
              ];
              sorted.forEach((e) => {
                e.installments.forEach((i, idx) => {
                  rows.push([
                    formatISODateBR(e.date),
                    stageName(e.stageId),
                    e.description,
                    e.supplier || "",
                    paymentMethodLabel[e.paymentMethod],
                    e.receiptType ? receiptTypeLabel[e.receiptType] : "",
                    e.receiptType === "nota_fiscal" ? (e.invoiceNumber || "") : "",
                    String(idx + 1),
                    String(e.installments.length),
                    formatISODateBR(i.dueDate),
                    i.amount.toFixed(2).replace(".", ","),
                    accountName(i.accountId),
                    i.paid ? "Pago" : "Em aberto",
                    e.amount.toFixed(2).replace(".", ","),
                  ]);
                });
              });
              const csv = rows
                .map((r) =>
                  r
                    .map((c) => `"${String(c).replace(/"/g, '""')}"`)
                    .join(";"),
                )
                .join("\n");
              const blob = new Blob(["\ufeff" + csv], {
                type: "text/csv;charset=utf-8;",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `lancamentos-${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="etapa">
            <TabsList>
              <TabsTrigger value="etapa">Geral</TabsTrigger>
              <TabsTrigger value="pagamento">Por pagamento</TabsTrigger>
            </TabsList>

            <TabsContent value="etapa">
              {(() => {
                const groupKey = (e: Expense) =>
                  `${e.date}|${e.description}|${e.supplier}|${e.paymentMethod}|${e.receiptType ?? ""}`;

                const groupsMap = new Map<string, Expense[]>();
                for (const e of sorted) {
                  const key = groupKey(e);
                  const list = groupsMap.get(key) ?? [];
                  list.push(e);
                  groupsMap.set(key, list);
                }
                const groups = Array.from(groupsMap.values()).sort(
                  (a, b) => b[0].date.localeCompare(a[0].date),
                );

                const groupStatus = (expenses: Expense[]) => {
                  const paidCount = expenses.filter((e) => isExpensePaid(e)).length;
                  if (paidCount === 0) return "pendente" as const;
                  if (paidCount === expenses.length) return "pago" as const;
                  return "parcial" as const;
                };

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                            Nenhuma despesa lançada.
                          </TableCell>
                        </TableRow>
                      )}
                      {groups.map((expenses) => {
                        const head = expenses[0];
                        const total = expenses.reduce((s, e) => s + e.amount, 0);
                        const status = groupStatus(expenses);
                        const isOpen = expanded[head.id];
                        return (
                          <Fragment key={head.id}>
                            <TableRow>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    setExpanded((s) => ({ ...s, [head.id]: !s[head.id] }))
                                  }
                                >
                                  {isOpen ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell>{formatISODateBR(head.date)}</TableCell>
                              <TableCell>{head.description}</TableCell>
                              <TableCell>{head.supplier || "—"}</TableCell>
                              <TableCell>
                                {paymentMethodLabel[head.paymentMethod]}
                                {head.installments.length > 1 && ` (${head.installments.length}x)`}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={
                                    status === "pago"
                                      ? "text-green-600 hover:text-green-700"
                                      : status === "parcial"
                                        ? "text-blue-600 hover:text-blue-700"
                                        : "text-amber-600 hover:text-amber-700"
                                  }
                                  onClick={() => {
                                    const nextPaid = status !== "pago";
                                    const msg = nextPaid
                                      ? "Deseja marcar todas as parcelas desta despesa como pagas?"
                                      : "Deseja marcar todas as parcelas desta despesa como pendentes?";
                                    if (window.confirm(msg)) {
                                      expenses.forEach((e) => {
                                        const allPaid = isExpensePaid(e);
                                        if (allPaid !== nextPaid) {
                                          budgetActions.toggleExpensePaid(e.id);
                                        }
                                      });
                                    }
                                  }}
                                >
                                  {status === "pago"
                                    ? "Pago"
                                    : status === "parcial"
                                      ? "Parcial"
                                      : "Pendente"}
                                </Button>
                              </TableCell>
                              <TableCell className="text-right">{formatBRL(total)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Itens"
                                    onClick={() => setItemsExpense(head)}
                                    className={
                                      itemsStatus(head) === "ok"
                                        ? "text-green-500"
                                        : itemsStatus(head) === "divergent"
                                          ? "text-red-500"
                                          : "text-amber-500"
                                    }
                                  >
                                    <Package className="h-4 w-4" />
                                    {head.items && head.items.length > 0 ? (
                                      <span className="ml-0.5 text-[10px] font-semibold text-primary">
                                        {head.items.length}
                                      </span>
                                    ) : (
                                      <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-500" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title={head.hasPendency ? "Há pendência" : "Sem pendência"}
                                    onClick={() => setPendencyExpenses(expenses)}
                                    className={head.hasPendency ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}
                                  >
                                    {head.hasPendency ? (
                                      <AlertCircle className="h-4 w-4" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setEditing(head)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setDeleteDialog({
                                        expenseIds: expenses.map((e) => e.id),
                                        description: head.description,
                                      });
                                    }}
                                    disabled={loading.deleting}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {isOpen && (
                              <TableRow>
                                <TableCell colSpan={8} className="bg-muted/30">
                                  <div className="space-y-2 p-2 text-sm">
                                    <p className="text-xs font-medium text-muted-foreground">
                                      {expenses.length > 1 ? "Rateio por etapa" : "Pagamento"}
                                    </p>
                                    {expenses.map((e) => {
                                      const acctOptions = state.accounts;
                                      return (
                                      <div
                                        key={e.id}
                                        className="rounded border bg-background px-3 py-2 space-y-2"
                                      >
                                        <div className="flex flex-wrap items-center gap-3">
                                          <span className="font-medium min-w-[120px]">
                                            {stageName(e.stageId)}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {formatBRL(e.amount)}
                                          </span>
                                          <div className="flex items-center gap-2 ml-auto">
                                            <Label className="text-xs text-muted-foreground">Parcelas</Label>
                                            <Input
                                              type="number"
                                              min={1}
                                              max={36}
                                              value={e.installments.length}
                                              onChange={(ev) => {
                                                const n = Math.max(1, Math.min(36, parseInt(ev.target.value, 10) || 1));
                                                if (n === e.installments.length) return;
                                                const first = e.installments[0];
                                                const baseDate = first?.dueDate ?? e.date;
                                                const baseAcct = first?.accountId ?? "";
                                                const each = +(e.amount / n).toFixed(2);
                                                const newInst: Installment[] = Array.from({ length: n }, (_, i) => ({
                                                  id: crypto.randomUUID(),
                                                  dueDate: addMonths(baseDate, i),
                                                  amount: i === n - 1 ? +(e.amount - each * (n - 1)).toFixed(2) : each,
                                                  paid: false,
                                                  accountId: baseAcct,
                                                }));
                                                budgetActions.updateExpense(e.id, { installments: newInst });
                                              }}
                                              className="h-7 w-16"
                                            />
                                            <span
                                              className={
                                                isExpensePaid(e)
                                                  ? "text-green-600 text-xs"
                                                  : "text-amber-600 text-xs"
                                              }
                                            >
                                              {isExpensePaid(e) ? "Pago" : "Pendente"}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="grid gap-1">
                                          {e.installments.map((i, idx) => (
                                            <div
                                              key={i.id}
                                              className="flex flex-wrap items-center gap-2 rounded bg-muted/40 px-3 py-1.5"
                                            >
                                              <span className="w-12 text-muted-foreground text-xs">
                                                {idx + 1}/{e.installments.length}
                                              </span>
                                              <Input
                                                type="date"
                                                value={i.dueDate}
                                                onChange={(ev) =>
                                                  budgetActions.setInstallmentDueDate(e.id, i.id, ev.target.value)
                                                }
                                                className="h-7 w-[140px] text-xs"
                                              />
                                              <Input
                                                type="number"
                                                step="0.01"
                                                value={i.amount}
                                                onChange={(ev) =>
                                                  budgetActions.setInstallmentAmount(
                                                    e.id,
                                                    i.id,
                                                    parseFloat(ev.target.value) || 0,
                                                  )
                                                }
                                                className="h-7 w-[110px] text-xs"
                                              />
                                              <Select
                                                value={i.accountId}
                                                onValueChange={(v) =>
                                                  budgetActions.setInstallmentAccount(e.id, i.id, v)
                                                }
                                              >
                                                <SelectTrigger className="h-7 w-[180px] text-xs">
                                                  <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {acctOptions.map((a) => (
                                                    <SelectItem key={a.id} value={a.id}>
                                                      {a.name}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className={
                                                  i.paid
                                                    ? "h-7 gap-1 text-xs text-green-600 hover:text-green-700"
                                                    : "h-7 gap-1 text-xs text-amber-600 hover:text-amber-700"
                                                }
                                                title={i.paid ? "Clique para marcar como em aberto" : "Clique para marcar como pago"}
                                                onClick={() => budgetActions.setInstallmentPaid(e.id, i.id, !i.paid)}
                                              >
                                                {i.paid ? (
                                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                                ) : (
                                                  <AlertCircle className="h-3.5 w-3.5" />
                                                )}
                                                {i.paid ? "Pago" : "Em aberto"}
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      );
                                    })}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              })()}
            </TabsContent>

            <TabsContent value="pagamento">
              {(() => {
                type Row = { e: Expense; i: Installment; idx: number };
                const rows: Row[] = state.expenses.flatMap((e) =>
                  e.installments.map((i, idx) => ({ e, i, idx })),
                );
                const groupsMap = new Map<string, Row[]>();
                for (const r of rows) {
                  const list = groupsMap.get(r.i.dueDate) ?? [];
                  list.push(r);
                  groupsMap.set(r.i.dueDate, list);
                }
                const groups = Array.from(groupsMap.entries())
                  .map(([date, items]) => ({ date, items }))
                  .sort((a, b) => a.date.localeCompare(b.date));
                const accountOptionsFor = (e: Expense) =>
                  state.accounts.filter((a) =>
                    e.paymentMethod === "cartao" ? a.type === "cartao" : a.type === "conta",
                  );
                const consolidatedStatus = (items: Row[]) => {
                  const allPaid = items.every((r) => r.i.paid);
                  const nonePaid = items.every((r) => !r.i.paid);
                  if (allPaid) return "pago" as const;
                  if (nonePaid) return "aberto" as const;
                  return "parcial" as const;
                };
                const paidGroups = groups.filter((g) => consolidatedStatus(g.items) === "pago");
                const openGroups = groups.filter((g) => consolidatedStatus(g.items) !== "pago");
                const sections: Array<{
                  key: "aberto" | "pagas";
                  label: string;
                  groups: typeof groups;
                }> = [
                  { key: "aberto", label: "Em aberto", groups: openGroups },
                  { key: "pagas", label: "Pagas", groups: paidGroups },
                ];
                const renderGroupRow = ({ date, items }: (typeof groups)[number]) => {
                  const total = items.reduce((s, r) => s + r.i.amount, 0);
                  const status = consolidatedStatus(items);
                  const open = !!expandedDates[date];
                  return (
                    <Fragment key={date}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          setExpandedDates((prev) => ({ ...prev, [date]: !prev[date] }))
                        }
                      >
                        <TableCell>
                          {open ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{formatISODateBR(date)}</TableCell>
                        <TableCell className="text-right">{new Set(items.map((r) => `${r.e.date}::${r.e.description}`)).size}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatBRL(total)}
                        </TableCell>
                        <TableCell onClick={(ev) => ev.stopPropagation()}>
                          {status === "parcial" ? (
                            <Badge variant="secondary">Parcial</Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={
                                status === "pago"
                                  ? "gap-1 text-green-600 hover:text-green-700"
                                  : "gap-1 text-amber-600 hover:text-amber-700"
                              }
                              title={status === "pago" ? "Clique para marcar como em aberto" : "Clique para marcar como pago"}
                              onClick={() => {
                                const paid = status !== "pago";
                                items.forEach((r) =>
                                  budgetActions.setInstallmentPaid(r.e.id, r.i.id, paid),
                                );
                              }}
                            >
                              {status === "pago" ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <AlertCircle className="h-4 w-4" />
                              )}
                              {status === "pago" ? "Pago" : "Em aberto"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 p-0">
                            <div className="p-3">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Fornecedor</TableHead>
                                    <TableHead>Parcela</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead>Conta</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map(({ e, i, idx }) => (
                                    <TableRow key={i.id}>
                                      <TableCell>{e.description}</TableCell>
                                      <TableCell>{e.supplier || "—"}</TableCell>
                                      <TableCell>
                                        {e.installments.length > 1
                                          ? `${idx + 1}/${e.installments.length}`
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatBRL(i.amount)}
                                      </TableCell>
                                      <TableCell>
                                        <Select
                                          value={i.accountId}
                                          onValueChange={(v) =>
                                            budgetActions.setInstallmentAccount(e.id, i.id, v)
                                          }
                                        >
                                          <SelectTrigger className="h-8 w-[180px]">
                                            <SelectValue placeholder="Selecione" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {accountOptionsFor(e).map((a) => (
                                              <SelectItem key={a.id} value={a.id}>
                                                {a.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={
                                            i.paid
                                              ? "gap-1 text-green-600 hover:text-green-700"
                                              : "gap-1 text-amber-600 hover:text-amber-700"
                                          }
                                          title={i.paid ? "Clique para marcar como em aberto" : "Clique para marcar como pago"}
                                          onClick={() =>
                                            budgetActions.setInstallmentPaid(
                                              e.id,
                                              i.id,
                                              !i.paid,
                                            )
                                          }
                                        >
                                          {i.paid ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                          ) : (
                                            <AlertCircle className="h-4 w-4" />
                                          )}
                                          {i.paid ? "Pago" : "Em aberto"}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                };
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Itens</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                            Nenhum pagamento registrado.
                          </TableCell>
                        </TableRow>
                      )}
                      {sections.map((section) => {
                        if (section.groups.length === 0) return null;
                        const sectionTotal = section.groups.reduce(
                          (s, g) => s + g.items.reduce((ss, r) => ss + r.i.amount, 0),
                          0,
                        );
                        const uniqueExpenses = new Set(
                          section.groups.flatMap((g) =>
                            g.items.map((r) => `${r.e.date}::${r.e.description}`),
                          ),
                        );
                        const itemCount = uniqueExpenses.size;
                        const isCollapsed = !!collapsedSections[section.key];
                        return (
                          <Fragment key={section.key}>
                            <TableRow className="bg-muted/60 hover:bg-muted/60">
                              <TableCell></TableCell>
                              <TableCell className="font-semibold uppercase text-xs tracking-wide">
                                {section.label}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {itemCount}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatBRL(sectionTotal)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() =>
                                    setCollapsedSections((prev) => ({
                                      ...prev,
                                      [section.key]: !prev[section.key],
                                    }))
                                  }
                                >
                                  {isCollapsed ? (
                                    <>
                                      <ChevronsDown className="h-3.5 w-3.5" />
                                      Expandir
                                    </>
                                  ) : (
                                    <>
                                      <ChevronsUp className="h-3.5 w-3.5" />
                                      Recolher
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {!isCollapsed && section.groups.map(renderGroupRow)}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                );

              })()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <EditExpenseDialog
        expense={editing}
        stages={state.stages}
        onClose={() => setEditing(null)}
      />
      <ItemsDialog
        expense={itemsExpense}
        quotations={state.quotations}
        catalog={Array.from(
          new Set(
            state.expenses.flatMap((e) =>
              (e.items ?? []).map((i) => i.description).filter(Boolean),
            ),
          ),
        ).sort()}
        unitCatalog={Array.from(
          new Set([
            "un",
            "m",
            "m²",
            "m³",
            "kg",
            "g",
            "l",
            "h",
            "saco",
            "cx",
            ...state.expenses.flatMap((e) => (e.items ?? []).map((i) => i.unit).filter(Boolean)),
          ]),
        )}
        onClose={() => setItemsExpense(null)}
      />
      <SplitDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        stages={state.stages}
        totalAmount={parseFloat(amount) || 0}
        initial={splits}
        onApply={(s) => {
          setSplits(s);
          setSplitOpen(false);
        }}
      />
      <PendencyDialog
        expenses={pendencyExpenses}
        onClose={() => setPendencyExpenses(null)}
      />

      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar a despesa <strong>"{deleteDialog?.description}"</strong>?
              {deleteDialog && deleteDialog.expenseIds.length > 1 && (
                <p className="mt-2 text-sm text-red-600">
                  Esta ação irá deletar as {deleteDialog.expenseIds.length} entradas desta despesa.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancelar
            </Button>
            <LoadingButton
              isLoading={loading.deleting}
              loadingText="Deletando..."
              onClick={async () => {
                if (!deleteDialog) return;
                try {
                  await Promise.all(
                    deleteDialog.expenseIds.map((expenseId) =>
                      crudToasts.delete(
                        Promise.resolve(budgetActions.removeExpense(expenseId)),
                        "Despesa"
                      )
                    )
                  );
                  setDeleteDialog(null);
                } catch (error) {
                  console.error(error);
                }
              }}
            >
              Deletar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


type StageLite = { id: string; name: string };

function EditExpenseDialog({
  expense,
  stages,
  onClose,
}: {
  expense: Expense | null;
  stages: StageLite[];
  onClose: () => void;
}) {
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState("");
  const [stageId, setStageId] = useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("avista");
  const [receiptType, setReceiptType] = useState<ReceiptType>("nota_fiscal");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const open = expense !== null;

  // sync when opening
  const lastIdRef = useState<string | null>(null);
  if (expense && lastIdRef[0] !== expense.id) {
    lastIdRef[1](expense.id);
    setDescription(expense.description);
    setSupplier(expense.supplier);
    setDate(expense.date);
    setStageId(expense.stageId);
    setPaymentMethod(expense.paymentMethod);
    setReceiptType(expense.receiptType ?? "nota_fiscal");
    setInvoiceNumber(expense.invoiceNumber ?? "");
  }

  const handleSave = () => {
    if (!expense || !stageId || !description.trim()) return;
    budgetActions.updateExpense(expense.id, {
      description: description.trim(),
      supplier: supplier.trim(),
      date,
      stageId,
      paymentMethod,
      receiptType,
      invoiceNumber: receiptType === "nota_fiscal" ? invoiceNumber.trim() : undefined,
    });
    lastIdRef[1](null);
    onClose();
  };

  const handleReceiptTypeChange = makeReceiptTypeChangeHandler(setReceiptType, setInvoiceNumber);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          lastIdRef[1](null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar despesa</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Etapa</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Nome do fornecedor</Label>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Data da despesa</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avista">À vista</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao">Cartão de crédito</SelectItem>
                <SelectItem value="parcelado">Parcelado (acordo com fornecedor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de comprovante</Label>
            <Select value={receiptType} onValueChange={handleReceiptTypeChange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nota_fiscal">Nota Fiscal</SelectItem>
                <SelectItem value="recibo">Recibo</SelectItem>
                <SelectItem value="sem_comprovante">Sem Comprovante</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {receiptType === "nota_fiscal" && (
            <div>
              <Label htmlFor="editInvoiceNumber">Nº da Nota Fiscal</Label>
              <Input
                id="editInvoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ex: 001234"
                className="mt-1"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Valor, parcelas, contas e datas de vencimento são editados expandindo a linha na tabela.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SplitItem = { stageId: string; amount: number };

function SplitDialog({
  open,
  onOpenChange,
  stages,
  totalAmount,
  initial,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stages: StageLite[];
  totalAmount: number;
  initial: SplitItem[];
  onApply: (splits: SplitItem[]) => void;
}) {
  const [mode, setMode] = useState<"percent" | "value">("percent");
  // rows: { stageId, input string }
  const [rows, setRows] = useState<Array<{ stageId: string; input: string }>>([]);
  const lastOpenRef = useState<boolean>(false);

  // sync on open
  if (open && !lastOpenRef[0]) {
    lastOpenRef[1](true);
    if (initial.length > 0 && totalAmount > 0) {
      setMode("value");
      setRows(initial.map((i) => ({ stageId: i.stageId, input: i.amount.toFixed(2) })));
    } else {
      setRows([{ stageId: stages[0]?.id ?? "", input: "" }]);
    }
  }
  if (!open && lastOpenRef[0]) {
    lastOpenRef[1](false);
  }

  const usedStageIds = new Set(rows.map((r) => r.stageId));
  const availableStages = stages.filter((s) => !usedStageIds.has(s.id));

  const computed: SplitItem[] = rows
    .filter((r) => r.stageId)
    .map((r) => {
      const n = parseFloat(r.input.replace(",", ".")) || 0;
      const amount = mode === "percent" ? +((totalAmount * n) / 100).toFixed(2) : +n.toFixed(2);
      return { stageId: r.stageId, amount };
    });

  const totalSplit = +computed.reduce((s, x) => s + x.amount, 0).toFixed(2);
  const remaining = +(totalAmount - totalSplit).toFixed(2);
  const isValid =
    totalAmount > 0 &&
    computed.length > 0 &&
    computed.every((c) => c.amount > 0) &&
    Math.abs(remaining) < 0.01 &&
    new Set(computed.map((c) => c.stageId)).size === computed.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Ratear despesa entre etapas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {totalAmount <= 0 && (
            <p className="text-sm text-destructive">
              Informe o valor total da despesa antes de configurar o rateio.
            </p>
          )}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Modo:</span>
            <label className="flex cursor-pointer items-center gap-1">
              <input
                type="radio"
                checked={mode === "percent"}
                onChange={() => setMode("percent")}
              />
              Percentual (%)
            </label>
            <label className="flex cursor-pointer items-center gap-1">
              <input
                type="radio"
                checked={mode === "value"}
                onChange={() => setMode("value")}
              />
              Valor (R$)
            </label>
          </div>

          <div className="space-y-2">
            {rows.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={r.stageId || undefined}
                  onValueChange={(v) =>
                    setRows((rs) => rs.map((x, i) => (i === idx ? { ...x, stageId: v } : x)))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages
                      .filter((s) => s.id === r.stageId || !usedStageIds.has(s.id))
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={r.input}
                  onChange={(e) =>
                    setRows((rs) =>
                      rs.map((x, i) => (i === idx ? { ...x, input: e.target.value } : x)),
                    )
                  }
                  placeholder={mode === "percent" ? "%" : "R$"}
                  className="w-32"
                />
                <span className="w-24 text-right text-xs text-muted-foreground">
                  {formatBRL(computed[idx]?.amount ?? 0)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={availableStages.length === 0}
              onClick={() =>
                setRows((rs) => [...rs, { stageId: availableStages[0]?.id ?? "", input: "" }])
              }
            >
              Adicionar etapa
            </Button>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span>Total da despesa:</span>
              <span className="font-medium">{formatBRL(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Soma do rateio:</span>
              <span className="font-medium">{formatBRL(totalSplit)}</span>
            </div>
            <div className="flex justify-between">
              <span>Diferença:</span>
              <span
                className={
                  Math.abs(remaining) < 0.01 ? "font-medium" : "font-medium text-destructive"
                }
              >
                {formatBRL(remaining)}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!isValid} onClick={() => onApply(computed)}>
            Aplicar rateio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemsDialog({
  expense,
  quotations,
  catalog,
  unitCatalog,
  onClose,
}: {
  expense: Expense | null;
  quotations: Quotation[];
  catalog: string[];
  unitCatalog: string[];
  onClose: () => void;
}) {
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [importNumber, setImportNumber] = useState("");
  const [importMsg, setImportMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const lastIdRef = useState<string | null>(null);
  const readyRef = useRef(false);

  const open = expense !== null;

  if (expense && lastIdRef[0] !== expense.id) {
    lastIdRef[1](expense.id);
    setItems(expense.items ? expense.items.map((i) => ({ ...i })) : []);
    setImportNumber("");
    setImportMsg(null);
    readyRef.current = false;
  }
  if (!expense && lastIdRef[0] !== null) {
    lastIdRef[1](null);
  }

  useEffect(() => {
    if (!expense) return;
    readyRef.current = false;
  }, [expense?.id]);

  useEffect(() => {
    if (!expense) return;
    if (!readyRef.current) {
      readyRef.current = true;
      return;
    }
    const cleaned = items
      .filter((i) => i.description.trim() && i.quantity > 0)
      .map((i) => ({ ...i, description: i.description.trim(), unit: i.unit.trim() || "un" }));
    budgetActions.setExpenseItems(expense.id, cleaned);
  }, [items]);

  const updateItem = (id: string, patch: Partial<ExpenseItem>) => {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };
  const addRow = () => {
    setItems((arr) => [
      ...arr,
      {
        id: crypto.randomUUID(),
        kind: "material" as ItemKind,
        description: "",
        unit: "un",
        quantity: 1,
        unitValue: 0,
      },
    ]);
  };
  const removeRow = (id: string) => {
    setItems((arr) => arr.filter((i) => i.id !== id));
  };

  const handleImport = (mode: "append" | "replace") => {
    const num = importNumber.trim();
    if (!num) {
      setImportMsg({ kind: "err", text: "Informe o número da proposta." });
      return;
    }
    let foundQuot: Quotation | undefined;
    let foundProp: Quotation["proposals"][number] | undefined;
    for (const q of quotations) {
      const p = q.proposals.find(
        (pr) => (pr.proposalNumber ?? "").trim().toLowerCase() === num.toLowerCase(),
      );
      if (p) {
        foundQuot = q;
        foundProp = p;
        break;
      }
    }
    if (!foundQuot || !foundProp) {
      setImportMsg({ kind: "err", text: `Nenhuma proposta encontrada com o número "${num}".` });
      return;
    }
    const imported: ExpenseItem[] = foundQuot.items.map((qi) => ({
      id: crypto.randomUUID(),
      kind: "material" as ItemKind,
      description: qi.description,
      unit: qi.unit || "un",
      quantity: qi.quantity,
      unitValue: foundProp!.prices[qi.id] ?? 0,
    }));
    setItems((arr) => (mode === "replace" ? imported : [...arr, ...imported]));
    setImportMsg({
      kind: "ok",
      text: `${imported.length} item(ns) importado(s) da proposta de ${foundProp.supplier} (${foundQuot.name}).`,
    });
  };

  const total = items.reduce((s, i) => s + i.quantity * i.unitValue, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Itens da despesa{expense ? ` — ${expense.description}` : ""}
          </DialogTitle>
        </DialogHeader>

        <datalist id="items-desc-catalog">
          {catalog.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <datalist id="items-unit-catalog">
          {unitCatalog.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>

        <div className="rounded-md border bg-muted/30 p-3">
          <Label className="text-xs font-medium">Importar itens de uma proposta</Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              value={importNumber}
              onChange={(e) => {
                setImportNumber(e.target.value);
                setImportMsg(null);
              }}
              placeholder="Nº da proposta"
              className="h-9 w-48"
            />
            <Button type="button" size="sm" variant="secondary" onClick={() => handleImport("append")}>
              Adicionar itens
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleImport("replace")}
              disabled={items.length === 0}
            >
              Substituir itens
            </Button>
            <span className="text-xs text-muted-foreground">
              Busca pelo número informado no cadastro da proposta em Cotações.
            </span>
          </div>
          {importMsg && (
            <p
              className={`mt-2 text-xs ${
                importMsg.kind === "ok" ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {importMsg.text}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum item lançado. Clique em "Adicionar item" para começar.
            </p>
          )}
          {items.map((it) => {
            const lineTotal = it.quantity * it.unitValue;
            return (
              <div key={it.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-12">
                <div className="md:col-span-2">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={it.kind}
                    onValueChange={(v) => updateItem(it.id, { kind: v as ItemKind })}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="taxas">Taxas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-4">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    list="items-desc-catalog"
                    value={it.description}
                    onChange={(e) => updateItem(it.id, { description: e.target.value })}
                    placeholder="Ex: Cimento CP-II 50kg"
                    className="mt-1 h-9"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Unidade</Label>
                  <Input
                    list="items-unit-catalog"
                    value={it.unit}
                    onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                    placeholder="un"
                    className="mt-1 h-9"
                  />
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs">Qtd</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(it.id, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 h-9"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Valor unit.</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={it.unitValue}
                    onChange={(e) =>
                      updateItem(it.id, { unitValue: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 h-9"
                  />
                </div>
                <div className="flex items-end justify-between gap-2 md:col-span-1">
                  <div className="flex-1 text-right text-sm font-medium">
                    {formatBRL(lineTotal)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(it.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar item
          </Button>

          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total dos itens</span>
            <span className="font-semibold">{formatBRL(total)}</span>
          </div>
          {expense && Math.abs(total - expense.amount) > 0.01 && items.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Valor da despesa: {formatBRL(expense.amount)} — diferença:{" "}
              {formatBRL(expense.amount - total)}
            </p>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">As alterações são salvas automaticamente.</span>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendencyDialog({
  expenses,
  onClose,
}: {
  expenses: Expense[] | null;
  onClose: () => void;
}) {
  const [hasPendency, setHasPendency] = useState(false);
  const [note, setNote] = useState("");
  const lastIdRef = useState<string | null>(null);
  const open = expenses !== null && expenses.length > 0;
  const head = expenses?.[0];

  if (head && lastIdRef[0] !== head.id) {
    lastIdRef[1](head.id);
    setHasPendency(!!head.hasPendency);
    setNote(head.pendencyNote ?? "");
  }
  if (!head && lastIdRef[0] !== null) {
    lastIdRef[1](null);
  }

  const handleSave = () => {
    if (!expenses) return;
    expenses.forEach((e) =>
      budgetActions.setPendency(e.id, hasPendency, hasPendency ? note.trim() : ""),
    );
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pendência da despesa</DialogTitle>
        </DialogHeader>
        {head && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {head.description}
              {head.supplier ? ` — ${head.supplier}` : ""}
            </p>
            <div className="flex items-center gap-3">
              <Label>Há pendência?</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={hasPendency ? "default" : "outline"}
                  onClick={() => setHasPendency(true)}
                >
                  Sim
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!hasPendency ? "default" : "outline"}
                  onClick={() => setHasPendency(false)}
                >
                  Não
                </Button>
              </div>
            </div>
            {hasPendency && (
              <div>
                <Label htmlFor="pendency-note">Descrição da pendência</Label>
                <textarea
                  id="pendency-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: aguardando nota fiscal, ajuste de valor, etc."
                  className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

