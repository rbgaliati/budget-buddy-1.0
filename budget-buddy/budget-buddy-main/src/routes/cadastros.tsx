import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Trash2 } from "lucide-react";
import {
  useBudget,
  budgetActions,
  useLoading,
  getSpentByStage,
  formatBRL,
  type Account,
} from "@/lib/budget-store";
import { crudToasts, toastError } from "@/lib/toast-helper";

export const Route = createFileRoute("/cadastros")({
  head: () => ({
    meta: [
      { title: "Cadastros | Orçamento de Obra" },
      { name: "description", content: "Cadastre o projeto, etapas e contas da obra." },
    ],
  }),
  component: Cadastros,
});

function Cadastros() {
  const state = useBudget();
  const loading = useLoading();
  const [stageName, setStageName] = useState("");
  const [stagePlanned, setStagePlanned] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<Account["type"]>("conta");
  const [deleteDialog, setDeleteDialog] = useState<{ type: "stage" | "account"; id: string; name: string } | null>(null);

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    const planned = parseFloat(stagePlanned);
    if (!stageName.trim() || isNaN(planned)) {
      toastError("Preencha todos os campos");
      return;
    }
    try {
      await crudToasts.create(
        budgetActions.addStage(stageName.trim(), planned),
        "Etapa"
      );
      setStageName("");
      setStagePlanned("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      toastError("Preencha o nome da conta");
      return;
    }
    try {
      await crudToasts.create(
        budgetActions.addAccount(accountName.trim(), accountType),
        "Conta"
      );
      setAccountName("");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cadastros</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie o projeto e as etapas da construção.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="projectName">Nome do projeto</Label>
          <Input
            id="projectName"
            value={state.projectName}
            onChange={(e) => budgetActions.setProjectName(e.target.value)}
            className="mt-1 max-w-md"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStage} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="stageName">Nome da etapa</Label>
              <Input
                id="stageName"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Ex: Fundação"
                className="mt-1"
              />
            </div>
            <div className="w-48">
              <Label htmlFor="stagePlanned">Valor previsto (R$)</Label>
              <Input
                id="stagePlanned"
                type="number"
                step="0.01"
                value={stagePlanned}
                onChange={(e) => setStagePlanned(e.target.value)}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
            <LoadingButton
              type="submit"
              isLoading={loading.creating}
              loadingText="Criando etapa..."
            >
              Adicionar
            </LoadingButton>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Previsto</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.stages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Nenhuma etapa cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {state.stages.map((s) => {
                const spent = getSpentByStage(state, s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Input
                        defaultValue={s.name}
                        onBlur={(e) =>
                          budgetActions.updateStage(s.id, { name: e.target.value })
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={s.planned}
                        onBlur={(e) =>
                          budgetActions.updateStage(s.id, {
                            planned: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">{formatBRL(spent)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDialog({ type: "stage", id: s.id, name: s.name })}
                        disabled={loading.deleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova conta / cartão</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAccount} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="accountName">Nome</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ex: Itaú Conta Corrente"
                className="mt-1"
              />
            </div>
            <div className="w-48">
              <Label>Tipo</Label>
              <Select
                value={accountType}
                onValueChange={(v) => setAccountType(v as Account["type"])}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conta">Conta (à vista / boleto)</SelectItem>
                  <SelectItem value="cartao">Cartão de crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <LoadingButton
              type="submit"
              isLoading={loading.creating}
              loadingText="Criando conta..."
            >
              Adicionar
            </LoadingButton>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    Nenhuma conta cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {state.accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Input
                      defaultValue={a.name}
                      onBlur={(ev) =>
                        budgetActions.updateAccount(a.id, { name: ev.target.value })
                      }
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    {a.type === "cartao" ? "Cartão de crédito" : "Conta"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDialog({ type: "account", id: a.id, name: a.name })}
                      disabled={loading.deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar {deleteDialog?.type === "stage" ? "a etapa" : "a conta"}{" "}
              <strong>"{deleteDialog?.name}"</strong>?
              {deleteDialog?.type === "stage" && (
                <p className="mt-2 text-sm text-red-600">
                  Todas as despesas desta etapa também serão removidas.
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
                  if (deleteDialog.type === "stage") {
                    await crudToasts.delete(
                      Promise.resolve(budgetActions.removeStage(deleteDialog.id)),
                      "Etapa"
                    );
                  } else {
                    await crudToasts.delete(
                      Promise.resolve(budgetActions.removeAccount(deleteDialog.id)),
                      "Conta"
                    );
                  }
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
