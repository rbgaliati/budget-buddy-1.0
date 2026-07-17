import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useBudget,
  budgetActions,
  useLoading,
  formatBRL,
  effectiveUnitPrice,
  type Quotation,
  type QuotationItem,
  type QuotationProposal,
} from "@/lib/budget-store";
import { crudToasts, toastError } from "@/lib/toast-helper";
import { Gavel, Plus, Trash2, Trophy, Lightbulb, Pencil, Lock, RotateCcw, FileText, Check, ChevronsUpDown, FileDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { exportQuotationPDF } from "@/lib/quotation-pdf";

export const Route = createFileRoute("/cotacoes")({
  head: () => ({
    meta: [
      { title: "Cotações | Orçamento de Obra" },
      {
        name: "description",
        content: "Compare propostas de fornecedores para escolher a melhor oferta.",
      },
    ],
  }),
  component: CotacoesPage,
});

function CotacoesPage() {
  const state = useBudget();
  const loading = useLoading();
  const [newName, setNewName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);

  const active = state.quotations.find((q) => q.id === activeId) ?? null;

  function handleCreate() {
    const name = newName.trim();
    if (!name) {
      toastError("Preencha o nome da cotação");
      return;
    }
    crudToasts.create(
      Promise.resolve(budgetActions.addQuotation(name)),
      "Cotação"
    ).then(() => {
      setNewName("");
      const id = state.quotations.find((q) => q.name === name)?.id;
      if (id) setActiveId(id);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Cotações de Propostas</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" /> Nova Cotação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="cot-name">Nome da cotação</Label>
              <Input
                id="cot-name"
                placeholder="Ex: Compra de cimento - Janeiro"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <LoadingButton
              onClick={handleCreate}
              isLoading={loading.creating}
              loadingText="Criando..."
            >
              <Plus className="mr-2 h-4 w-4" /> Criar
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cotações Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {state.quotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma cotação criada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {state.quotations.map((q) => (
                <div
                  key={q.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {q.name}
                      {q.status === "encerrado" && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" /> Encerrado
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {q.items.length} item(ns) · {q.proposals.length} proposta(s)
                      {q.status === "encerrado" && q.winnerProposalId && (
                        <>
                          {" · "}
                          Vencedor: {" "}
                          {(() => {
                            const winner = q.proposals.find((p) => p.id === q.winnerProposalId);
                            if (!winner) return "—";
                            const total = q.items.reduce(
                              (sum, it) => sum + effectiveUnitPrice(winner, it.id) * it.quantity,
                              0,
                            );
                            return `${winner.supplier} · ${formatBRL(total)}`;
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setActiveId(q.id)}>
                      Abrir
                    </Button>
                    {q.status === "encerrado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          try {
                            exportQuotationPDF(q);
                            toast.success("PDF gerado");
                          } catch (e) {
                            console.error(e);
                            toast.error("Falha ao gerar PDF");
                          }
                        }}
                      >
                        <FileDown className="mr-1 h-4 w-4" /> PDF
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeleteDialog({ id: q.id, name: q.name });
                      }}
                      disabled={loading.deleting}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {active && <QuotationEditor key={active.id} quotation={active} />}

      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar a cotação <strong>"{deleteDialog?.name}"</strong>?
              <p className="mt-2 text-sm text-red-600">
                Todas as propostas e itens desta cotação também serão removidos.
              </p>
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
                  await crudToasts.delete(
                    Promise.resolve(budgetActions.removeQuotation(deleteDialog.id)),
                    "Cotação"
                  );
                  if (activeId === deleteDialog.id) setActiveId(null);
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

function QuotationEditor({ quotation }: { quotation: Quotation }) {
  const state = useBudget();
  const [showCompare, setShowCompare] = useState(false);
  const [showExportItems, setShowExportItems] = useState(false);

  // Item form
  const [itemDesc, setItemDesc] = useState("");
  const [itemUnit, setItemUnit] = useState("un");
  const [itemQty, setItemQty] = useState<number | "">("");
  const [importItemId, setImportItemId] = useState<string>("");
  const [inventoryOpen, setInventoryOpen] = useState(false);

  // Proposal form
  const [supplierName, setSupplierName] = useState("");
  const [proposalNumber, setProposalNumber] = useState("");
  const [proposalDiscount, setProposalDiscount] = useState<number | "">("");

  // Edit proposal dialog
  const [editingProposal, setEditingProposal] = useState<QuotationProposal | null>(null);
  const [editSupplier, setEditSupplier] = useState("");
  const [editProposalNumber, setEditProposalNumber] = useState("");
  const [editDiscount, setEditDiscount] = useState<number | "">("");

  // Edit item dialog
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editQty, setEditQty] = useState<number | "">("");

  // unique inventory items to import from
  const inventoryItems = useMemo(() => {
    const map = new Map<string, { description: string; unit: string }>();
    const add = (description: string, unit: string) => {
      const d = (description ?? "").trim();
      const u = (unit ?? "").trim();
      if (!d) return;
      const key = `${d.toLowerCase()}|${u.toLowerCase()}`;
      if (!map.has(key)) map.set(key, { description: d, unit: u });
    };
    state.expenses.forEach((e) => (e.items ?? []).forEach((i) => add(i.description, i.unit)));
    state.quotations.forEach((q) => q.items.forEach((i) => add(i.description, i.unit)));
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.description.localeCompare(b.description, "pt-BR"));
  }, [state.expenses, state.quotations]);

  // unique supplier names from expenses + previous quotation proposals
  const supplierSuggestions = useMemo(() => {
    const map = new Map<string, string>();
    state.expenses.forEach((e) => {
      const name = (e.supplier ?? "").trim();
      if (name) {
        const key = name.toLowerCase();
        if (!map.has(key)) map.set(key, name);
      }
    });
    state.quotations.forEach((q) =>
      q.proposals.forEach((p) => {
        const name = (p.supplier ?? "").trim();
        if (name) {
          const key = name.toLowerCase();
          if (!map.has(key)) map.set(key, name);
        }
      }),
    );
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [state.expenses, state.quotations]);

  function handleAddItem() {
    const description = itemDesc.trim();
    const quantity = typeof itemQty === "number" ? itemQty : parseFloat(String(itemQty));
    if (!description || !itemUnit.trim() || !quantity || quantity <= 0) {
      toast.error("Preencha descrição, unidade e quantidade.");
      return;
    }
    budgetActions.addQuotationItem(quotation.id, {
      description,
      unit: itemUnit.trim(),
      quantity,
    });
    setItemDesc("");
    setItemQty("");
  }

  function handleImportInventory() {
    if (!importItemId) return;
    const found = inventoryItems.find((i) => i.key === importItemId);
    if (!found) return;
    setItemDesc(found.description);
    setItemUnit(found.unit);
  }

  function handleExportItems() {
    setShowExportItems(true);
  }

  function handleAddProposal() {
    const name = supplierName.trim();
    if (!name) {
      toast.error("Informe o nome do fornecedor.");
      return;
    }
    const discount = typeof proposalDiscount === "number" ? proposalDiscount : 0;
    if (discount < 0 || discount > 100) {
      toast.error("O redutor deve estar entre 0 e 100%.");
      return;
    }
    budgetActions.addProposal(quotation.id, name, proposalNumber.trim() || undefined, discount);
    setSupplierName("");
    setProposalNumber("");
    setProposalDiscount("");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-primary" />
          {quotation.name}
          {quotation.status === "encerrado" && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Encerrado
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {quotation.status === "encerrado" ? (
            <Button variant="outline" onClick={() => {
              if (confirm("Reabrir esta cotação? O status de encerrado será removido.")) {
                budgetActions.reopenQuotation(quotation.id);
                toast.success("Cotação reaberta");
              }
            }}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reabrir
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={() => setShowCompare(true)}
              disabled={quotation.items.length === 0 || quotation.proposals.length === 0}
            >
              <Trophy className="mr-2 h-4 w-4" /> Comparar propostas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Items to be quoted */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              Itens a cotar
            </h3>
            {quotation.items.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleExportItems}>
                <FileText className="mr-2 h-4 w-4" /> Exportar lista
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <Label>Importar do inventário</Label>
              <div className="flex gap-2">
                <Popover open={inventoryOpen} onOpenChange={setInventoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "flex-1 justify-between",
                        !importItemId && "text-muted-foreground",
                      )}
                    >
                      {importItemId
                        ? (() => {
                            const item = inventoryItems.find((i) => i.key === importItemId);
                            return item ? `${item.description} (${item.unit})` : "Selecionar item...";
                          })()
                        : "Selecionar item..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar item..." />
                      <CommandList>
                        <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                        <CommandGroup>
                          {inventoryItems.map((i) => (
                            <CommandItem
                              key={i.key}
                              value={`${i.description} ${i.unit}`.toLowerCase()}
                              onSelect={() => {
                                setImportItemId(i.key);
                                setInventoryOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  importItemId === i.key ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {i.description} ({i.unit})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button type="button" variant="outline" onClick={handleImportInventory}>
                  Usar
                </Button>
              </div>
            </div>
            <div className="sm:col-span-4">
              <Label>Descrição</Label>
              <Input
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="Ex: Cimento CP-II 50kg"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Unidade</Label>
              <Input value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} />
            </div>
            <div className="sm:col-span-1">
              <Label>Qtd.</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={itemQty}
                onChange={(e) =>
                  setItemQty(e.target.value === "" ? "" : parseFloat(e.target.value))
                }
              />
            </div>
            <div className="flex items-end sm:col-span-1">
              <Button onClick={handleAddItem} className="w-full">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {quotation.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.description}</TableCell>
                    <TableCell>{it.unit}</TableCell>
                    <TableCell className="text-right">
                      {it.quantity.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingItem(it);
                            setEditDesc(it.description);
                            setEditUnit(it.unit);
                            setEditQty(it.quantity);
                          }}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => budgetActions.removeQuotationItem(quotation.id, it.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        {/* Proposals */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">
            Propostas de fornecedores
          </h3>

          <div className="flex flex-col gap-3 rounded-md border p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label>Nome do fornecedor</Label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Ex: Materiais ABC"
                  list="cotacao-supplier-suggestions"
                  autoComplete="off"
                />
                <datalist id="cotacao-supplier-suggestions">
                  {supplierSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div className="sm:w-48">
                <Label>Nº da proposta</Label>
                <Input
                  value={proposalNumber}
                  onChange={(e) => setProposalNumber(e.target.value)}
                  placeholder="Ex: 001/2026"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="sm:w-48">
                <Label>Redutor da proposta (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={proposalDiscount}
                  onChange={(e) =>
                    setProposalDiscount(e.target.value === "" ? "" : parseFloat(e.target.value))
                  }
                  placeholder="Ex: 5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Desconto aplicado sobre todos os preços deste fornecedor.
                </p>
              </div>
              <div className="flex-1" />
              <Button onClick={handleAddProposal}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar proposta
              </Button>
            </div>
          </div>


          {quotation.proposals.length === 0 || quotation.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {quotation.items.length === 0
                ? "Adicione itens antes de cadastrar propostas."
                : "Nenhum fornecedor cadastrado."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    {quotation.proposals.map((p) => (
                    <TableHead key={p.id} className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className="text-right">
                            <div>{p.supplier}</div>
                            {p.proposalNumber && (
                              <div className="text-xs text-muted-foreground">Nº {p.proposalNumber}</div>
                            )}
                            <div className="mt-1 flex items-center justify-end gap-1">
                              <Label className="text-xs font-normal text-muted-foreground">Redutor %</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={p.discountPercent ?? 0}
                                onChange={(e) => {
                                  const v = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                  if (isNaN(v) || v < 0 || v > 100) return;
                                  budgetActions.updateProposal(quotation.id, p.id, { discountPercent: v });
                                }}
                                className="h-7 w-16 text-right text-xs"
                              />
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditingProposal(p);
                              setEditSupplier(p.supplier);
                              setEditProposalNumber(p.proposalNumber ?? "");
                              setEditDiscount(p.discountPercent ?? 0);
                            }}
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => budgetActions.removeProposal(quotation.id, p.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">
                        {it.description}
                        <div className="text-xs text-muted-foreground">
                          {it.quantity} {it.unit}
                        </div>
                      </TableCell>
                      {quotation.proposals.map((p) => {
                        const price = p.prices[it.id] ?? 0;
                        const effective = effectiveUnitPrice(p, it.id);
                        const subtotal = effective * it.quantity;
                        const hasDiscount = (p.discountPercent ?? 0) > 0 && price > 0;
                        return (
                          <TableCell key={p.id} className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <PriceCell
                                quotationId={quotation.id}
                                proposalId={p.id}
                                itemId={it.id}
                                value={price}
                              />
                              {hasDiscount && (
                                <div className="text-xs text-green-700 dark:text-green-400">
                                  c/ redutor: {formatBRL(effective)}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Subtotal: {formatBRL(subtotal)}
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    {quotation.proposals.map((p) => {
                      const total = quotation.items.reduce(
                        (s, it) => s + effectiveUnitPrice(p, it.id) * it.quantity,
                        0,
                      );
                      return (
                        <TableCell key={p.id} className="text-right font-semibold">
                          {formatBRL(total)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </CardContent>

      <CompareDialog
        open={showCompare}
        onOpenChange={setShowCompare}
        quotation={quotation}
      />

      <Dialog open={!!editingItem} onOpenChange={(v) => { if (!v) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
            <DialogDescription>Altere a descrição, unidade e quantidade do item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Descrição</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descrição do item" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unidade</Label>
                <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} placeholder="un, m, kg..." />
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value === "" ? "" : parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!editingItem) return;
                const description = editDesc.trim();
                const unit = editUnit.trim();
                const quantity = typeof editQty === "number" ? editQty : parseFloat(String(editQty));
                if (!description || !unit || !quantity || quantity <= 0) {
                  toast.error("Preencha descrição, unidade e quantidade válidas.");
                  return;
                }
                budgetActions.updateQuotationItem(quotation.id, editingItem.id, { description, unit, quantity });
                setEditingItem(null);
                toast.success("Item atualizado");
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProposal} onOpenChange={(v) => { if (!v) setEditingProposal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar proposta</DialogTitle>
            <DialogDescription>Altere o fornecedor, o número da proposta e o redutor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Fornecedor</Label>
              <Input value={editSupplier} onChange={(e) => setEditSupplier(e.target.value)} placeholder="Nome do fornecedor" />
            </div>
            <div>
              <Label>Nº da proposta</Label>
              <Input value={editProposalNumber} onChange={(e) => setEditProposalNumber(e.target.value)} placeholder="Ex: 001/2026" />
            </div>
            <div>
              <Label>Redutor da proposta (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="any"
                value={editDiscount}
                onChange={(e) => setEditDiscount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="Ex: 5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Aplicado sobre todos os preços deste fornecedor.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProposal(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!editingProposal) return;
                const supplier = editSupplier.trim();
                if (!supplier) {
                  toast.error("Informe o nome do fornecedor.");
                  return;
                }
                const discount = typeof editDiscount === "number" ? editDiscount : 0;
                if (discount < 0 || discount > 100) {
                  toast.error("O redutor deve estar entre 0 e 100%.");
                  return;
                }
                budgetActions.updateProposal(quotation.id, editingProposal.id, {
                  supplier,
                  proposalNumber: editProposalNumber.trim() || undefined,
                  discountPercent: discount,
                });
                setEditingProposal(null);
                toast.success("Proposta atualizada");
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportItems} onOpenChange={setShowExportItems}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Itens para cotação</DialogTitle>
            <DialogDescription>
              Copie o texto abaixo e envie aos fornecedores.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              readOnly
              className="min-h-[200px] w-full rounded-md border bg-muted p-3 font-mono text-sm"
              value={(() => {
                const lines: string[] = [];
                lines.push(`Cotação: ${quotation.name}`);
                lines.push("");
                lines.push("Solicitamos proposta para os seguintes itens:");
                lines.push("");
                quotation.items.forEach((it, idx) => {
                  lines.push(`${idx + 1}. ${it.description} — ${it.quantity.toLocaleString("pt-BR")} ${it.unit}`);
                });
                lines.push("");
                lines.push("Aguardamos retorno com preços unitários e prazo de entrega.");
                return lines.join("\n");
              })()}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportItems(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                const text = (document.querySelector("textarea") as HTMLTextAreaElement)?.value ?? "";
                navigator.clipboard.writeText(text).then(() => toast.success("Texto copiado para a área de transferência"));
              }}
            >
              Copiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CompareDialog({
  open,
  onOpenChange,
  quotation,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quotation: Quotation;
}) {
  const [winnerDialog, setWinnerDialog] = useState<{ proposalId: string; supplier: string } | null>(null);
  const [justification, setJustification] = useState("");
  // Calcula totais por fornecedor (apenas itens com preço > 0)
  const totals = quotation.proposals.map((p) => {
    let total = 0;
    let missing = 0;
    quotation.items.forEach((it) => {
      const raw = p.prices[it.id] ?? 0;
      const price = effectiveUnitPrice(p, it.id);
      if (raw > 0) total += price * it.quantity;
      else missing++;
    });
    return { proposal: p, total, missing };
  });

  const valid = totals.filter((t) => t.missing === 0 && t.total > 0);
  const winner =
    valid.length > 0 ? valid.reduce((a, b) => (a.total <= b.total ? a : b)) : null;

  // Para cada item, o menor preço dentre todas as propostas (já com redutor)
  const itemBestPrices = new Map<string, { price: number; supplier: string }>();
  quotation.items.forEach((it) => {
    let best: { price: number; supplier: string } | null = null;
    quotation.proposals.forEach((p) => {
      const raw = p.prices[it.id] ?? 0;
      const price = effectiveUnitPrice(p, it.id);
      if (raw > 0 && (best === null || price < best.price)) {
        best = { price, supplier: p.supplier };
      }
    });
    if (best) itemBestPrices.set(it.id, best);
  });

  // Oportunidades de redução com base na proposta vencedora
  const opportunities: Array<{
    item: QuotationItem;
    winnerPrice: number;
    bestPrice: number;
    bestSupplier: string;
    saving: number;
  }> = [];
  if (winner) {
    quotation.items.forEach((it) => {
      const winnerPrice = effectiveUnitPrice(winner.proposal, it.id);
      const best = itemBestPrices.get(it.id);
      if (best && best.supplier !== winner.proposal.supplier && best.price < winnerPrice) {
        opportunities.push({
          item: it,
          winnerPrice,
          bestPrice: best.price,
          bestSupplier: best.supplier,
          saving: (winnerPrice - best.price) * it.quantity,
        });
      }
    });
  }
  const totalSaving = opportunities.reduce((s, o) => s + o.saving, 0);
  const optimizedTotal = winner ? winner.total - totalSaving : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Comparativo de propostas
          </DialogTitle>
          <DialogDescription>{quotation.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold">Totais por fornecedor</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Itens sem preço</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totals
                  .slice()
                  .sort((a, b) => a.total - b.total)
                  .map((t) => {
                    const isWinnerAuto = winner?.proposal.id === t.proposal.id;
                    const isChosenWinner = quotation.winnerProposalId === t.proposal.id;
                    const canChoose = quotation.status === "aberto" && t.missing === 0 && t.total > 0;
                    return (
                      <TableRow key={t.proposal.id}>
                        <TableCell className="font-medium">{t.proposal.supplier}</TableCell>
                        <TableCell className="text-right">{formatBRL(t.total)}</TableCell>
                        <TableCell className="text-right">{t.missing}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isChosenWinner && (
                              <Badge className="bg-blue-600 hover:bg-blue-600">
                                Vencedora
                              </Badge>
                            )}
                            {isWinnerAuto && !isChosenWinner && (
                              <Badge className="bg-green-600 hover:bg-green-600">
                                Melhor proposta
                              </Badge>
                            )}
                            {canChoose && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setJustification("");
                                  setWinnerDialog({ proposalId: t.proposal.id, supplier: t.proposal.supplier });
                                }}
                              >
                                <Trophy className="mr-1 h-3 w-3" /> Escolher
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </section>

          {winner ? (
            <section className="rounded-md border bg-green-50 p-4 dark:bg-green-950/30">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Trophy className="h-4 w-4" />
                <span className="font-semibold">
                  Vencedor: {winner.proposal.supplier}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Total: <span className="font-semibold">{formatBRL(winner.total)}</span>
              </div>
              {quotation.status === "encerrado" && quotation.winnerJustification && (
                <div className="mt-2 text-sm">
                  <span className="font-semibold">Justificativa:</span>{" "}
                  <span className="whitespace-pre-wrap">{quotation.winnerJustification}</span>
                </div>
              )}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma proposta completa para eleger um vencedor. Preencha o preço de todos os
              itens em pelo menos uma proposta.
            </p>
          )}

          {winner && (
            <section>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Oportunidades de redução
              </h4>
              {opportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Esta proposta já tem o menor preço em todos os itens. 🎉
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Preço vencedor</TableHead>
                        <TableHead className="text-right">Melhor preço</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead className="text-right">Economia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {opportunities.map((o) => (
                        <TableRow key={o.item.id}>
                          <TableCell className="font-medium">
                            {o.item.description}
                            <div className="text-xs text-muted-foreground">
                              {o.item.quantity} {o.item.unit}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatBRL(o.winnerPrice)}</TableCell>
                          <TableCell className="text-right text-green-700 dark:text-green-400">
                            {formatBRL(o.bestPrice)}
                          </TableCell>
                          <TableCell>{o.bestSupplier}</TableCell>
                          <TableCell className="text-right font-semibold text-green-700 dark:text-green-400">
                            -{formatBRL(o.saving)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 flex flex-col items-end gap-1 text-sm">
                    <div>
                      Economia potencial:{" "}
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        {formatBRL(totalSaving)}
                      </span>
                    </div>
                    <div>
                      Total otimizado (compra fracionada):{" "}
                      <span className="font-semibold">{formatBRL(optimizedTotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={!!winnerDialog} onOpenChange={(o) => { if (!o) setWinnerDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolher proposta vencedora</DialogTitle>
            <DialogDescription>
              Confirme a escolha de <span className="font-semibold">{winnerDialog?.supplier}</span> como vencedora e informe a justificativa.
              Esta justificativa será incluída no PDF do processo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="winner-justification">Justificativa</Label>
            <Textarea
              id="winner-justification"
              rows={5}
              placeholder="Ex.: Melhor preço total, prazo de entrega mais curto, melhor condição de pagamento..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWinnerDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!winnerDialog) return;
                if (!justification.trim()) {
                  toast.error("Informe a justificativa para a escolha");
                  return;
                }
                budgetActions.closeQuotation(quotation.id, winnerDialog.proposalId, justification.trim());
                setWinnerDialog(null);
                onOpenChange(false);
                toast.success("Proposta vencedora escolhida e cotação encerrada");
              }}
            >
              Confirmar escolha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function PriceCell({
  quotationId,
  proposalId,
  itemId,
  value,
}: {
  quotationId: string;
  proposalId: string;
  itemId: string;
  value: number | undefined;
}) {
  const formatStored = (v: number | undefined) =>
    v === undefined || v === 0 ? "" : String(v);
  const [text, setText] = useState<string>(() => formatStored(value));
  const focusedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external changes only when not actively editing
  useEffect(() => {
    if (!focusedRef.current) setText(formatStored(value));
  }, [value]);

  // Flush pending save on unmount (navigating away)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        const parsed = parseFloat(text.replace(",", "."));
        const price = isNaN(parsed) ? 0 : parsed;
        if (price !== (value ?? 0)) {
          budgetActions.setProposalPrice(quotationId, proposalId, itemId, price);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleSave(next: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const parsed = parseFloat(next.replace(",", "."));
      const price = isNaN(parsed) ? 0 : parsed;
      budgetActions.setProposalPrice(quotationId, proposalId, itemId, price);
      timerRef.current = null;
    }, 400);
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      className="ml-auto w-28 text-right"
      value={text}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        scheduleSave(v);
      }}
      onBlur={() => {
        focusedRef.current = false;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        const parsed = parseFloat(text.replace(",", "."));
        const price = isNaN(parsed) ? 0 : parsed;
        budgetActions.setProposalPrice(quotationId, proposalId, itemId, price);
      }}
    />
  );
}
