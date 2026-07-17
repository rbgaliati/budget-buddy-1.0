import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  useBudget,
  forceRehydrate,
  type BudgetState,
} from "@/lib/budget-store";
import { importBackupToServer, exportBackupFromServer } from "@/lib/import-helper";

export const Route = createFileRoute("/gerenciamento")({
  head: () => ({
    meta: [
      { title: "Gerenciamento | Orçamento de Obra" },
      { name: "description", content: "Backup e restauração dos dados da aplicação." },
    ],
  }),
  component: Gerenciamento,
});

function isValidState(value: unknown): value is BudgetState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.projectName === "string" &&
    Array.isArray(v.stages) &&
    Array.isArray(v.accounts) &&
    Array.isArray(v.expenses)
  );
}

function Gerenciamento() {
  const state = useBudget();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BudgetState | null>(null);
  const [restoring, setRestoring] = useState(false);

  const itemsCount = state.expenses.reduce(
    (acc, e) => acc + (e.items?.length ?? 0),
    0,
  );
  const quotationsCount = state.quotations?.length ?? 0;
  const proposalsCount = (state.quotations ?? []).reduce(
    (acc, q) => acc + q.proposals.length,
    0,
  );

  const stats = {
    stages: state.stages.length,
    accounts: state.accounts.length,
    expenses: state.expenses.length,
    items: itemsCount,
    quotations: quotationsCount,
    proposals: proposalsCount,
  };

  const [downloading, setDownloading] = useState(false);

  const handleBackup = async () => {
    setDownloading(true);
    try {
      const data = await exportBackupFromServer();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      const a = document.createElement("a");
      a.href = url;
      a.download = `orcamento-obra-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup gerado com sucesso");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Falha ao gerar backup: " + msg);
    } finally {
      setDownloading(false);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isValidState(parsed)) {
        toast.error("Arquivo inválido — formato não reconhecido.");
        return;
      }
      // Normaliza campos opcionais para compatibilidade com backups antigos
      const normalized: BudgetState = {
        ...parsed,
        quotations: Array.isArray((parsed as BudgetState).quotations)
          ? (parsed as BudgetState).quotations
          : [],
      };
      setPending(normalized);
    } catch {
      toast.error("Não foi possível ler o arquivo.");
    }
  };

  const handleConfirmRestore = async () => {
    if (!pending) return;
    setRestoring(true);
    try {
      const result = await importBackupToServer(pending);
      if (!result.success) {
        toast.error("Falha ao sincronizar com o backend: " + result.message);
        return;
      }
      setPending(null);
      // Rehidrata do backend para garantir que o estado reflete o que foi gravado
      await forceRehydrate();
      toast.success(result.message || "Dados restaurados com sucesso");
    } catch (err) {
      toast.error("Backend indisponível — não foi possível restaurar. Verifique se o servidor está rodando.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciamento</h1>
        <p className="text-sm text-muted-foreground">
          Faça backup dos seus dados ou restaure a partir de um arquivo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Etapas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.stages}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contas / cartões</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.accounts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.expenses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens de inventário</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.items}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cotações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.quotations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Propostas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.proposals}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Baixe um arquivo JSON contendo <strong>todos</strong> os dados: etapas, contas,
            despesas, itens do inventário, cotações e propostas de fornecedores.
          </p>
          <LoadingButton onClick={handleBackup} className="gap-2" isLoading={downloading} loadingText="Gerando…">
            <Download className="h-4 w-4" />
            Baixar backup (.json)
          </LoadingButton>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restauração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Selecione um arquivo de backup para restaurar. Os dados atuais serão substituídos.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            Selecionar arquivo...
          </Button>

          {pending && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Confirmar restauração</p>
                  <p className="text-sm text-muted-foreground">
                    O backup contém{" "}
                    <strong>{pending.stages.length}</strong> etapas,{" "}
                    <strong>{pending.accounts.length}</strong> contas e{" "}
                    <strong>{pending.expenses.length}</strong> despesas. Esta ação irá{" "}
                    <strong>substituir</strong> todos os dados atuais.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <LoadingButton
                      variant="destructive"
                      size="sm"
                      onClick={handleConfirmRestore}
                      isLoading={restoring}
                      loadingText="Restaurando…"
                    >
                      Confirmar restauração
                    </LoadingButton>
                    <Button variant="ghost" size="sm" onClick={() => setPending(null)} disabled={restoring}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
