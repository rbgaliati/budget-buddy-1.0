import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading";
import { AlertCircle, CheckCircle2, Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { importBackupToServer, importCsvToServer } from "@/lib/import-helper";
import { toast } from "sonner";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Importar Dados | Orçamento de Obra" },
      { name: "description", content: "Importe dados de um backup JSON ou de uma planilha CSV." },
    ],
  }),
  component: ImportPage,
});

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ImportResult = {
  success: boolean;
  message: string;
  stats?: Record<string, number>;
  warnings?: string[];
};

// ─── Componente principal ─────────────────────────────────────────────────────

function ImportPage() {
  const [result, setResult] = useState<ImportResult | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar Dados</h1>
        <p className="text-sm text-muted-foreground">
          Importe dados de um backup JSON ou de uma planilha CSV exportada da plataforma anterior.
        </p>
      </div>

      {result?.success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">{result.message}</h3>
                {result.stats && (
                  <ul className="mt-2 text-sm text-green-800 space-y-1">
                    {Object.entries(result.stats).map(([k, v]) => (
                      <li key={k}>✓ {k}: {v}</li>
                    ))}
                  </ul>
                )}
                {result.warnings && result.warnings.length > 0 && (
                  <ul className="mt-2 text-sm text-yellow-800 space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i}>⚠ {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="csv">
        <TabsList className="w-full">
          <TabsTrigger value="csv" className="flex-1 gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Importar CSV
          </TabsTrigger>
          <TabsTrigger value="json" className="flex-1 gap-2">
            <FileJson className="h-4 w-4" /> Backup JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="space-y-4 mt-4">
          <CsvImportTab onResult={setResult} />
        </TabsContent>

        <TabsContent value="json" className="space-y-4 mt-4">
          <JsonImportTab onResult={setResult} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Aba: CSV ─────────────────────────────────────────────────────────────────

function CsvImportTab({ onResult }: { onResult: (r: ImportResult | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    onResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text
        .replace(/\r/g, "")
        .split("\n")
        .filter((l) => l.trim())
        .slice(0, 6);
      setPreview(lines.map((l) => l.split(";")));
    };
    reader.readAsText(selected, "UTF-8");
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await importCsvToServer(file);
      onResult(result);
      if (result.success) {
        toast.success(result.message);
        setFile(null);
        setPreview(null);
        setConfirmDialog(false);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error("Erro na importação: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Importar Despesas via CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 space-y-2">
            <p className="font-semibold">Formato do arquivo CSV</p>
            <p>Separador: <code className="bg-blue-100 px-1 rounded">;</code> (ponto-e-vírgula) · Codificação: UTF-8</p>
            <p>Uma linha por parcela. Despesas com múltiplas parcelas repetem os campos da despesa em cada linha.</p>
            <p className="font-mono text-xs bg-blue-100 p-2 rounded leading-5 break-all">
              etapa;descricao;fornecedor;valor_total;data;forma_pagamento;tipo_comprovante;pendencia;nota_pendencia;vencimento;valor_parcela;conta;pago
            </p>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <p><strong>forma_pagamento:</strong> avista · parcelado · cartao · boleto</p>
              <p><strong>tipo_comprovante:</strong> nota_fiscal · recibo · sem_comprovante</p>
              <p><strong>pendencia / pago:</strong> sim · nao</p>
            </div>
            <a
              href={`${API_BASE}/import/csv/template`}
              download="template_despesas.csv"
              className="inline-flex items-center gap-1 text-blue-700 underline font-medium mt-1"
            >
              <Download className="h-3.5 w-3.5" /> Baixar template CSV
            </a>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-input"
          />
          <label htmlFor="csv-input">
            <Button variant="outline" className="w-full cursor-pointer" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {file ? file.name : "Selecionar arquivo CSV…"}
              </span>
            </Button>
          </label>

          {preview && preview.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Prévia:</p>
              <div className="overflow-x-auto rounded border text-xs">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((row, i) => (
                      <tr key={i} className={i === 0 ? "bg-gray-50 font-semibold" : ""}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1 whitespace-nowrap border-r last:border-r-0">
                            {cell || <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <LoadingButton onClick={() => setConfirmDialog(true)} isLoading={loading} className="w-full">
                <Upload className="mr-2 h-4 w-4" /> Importar CSV
              </LoadingButton>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4 text-sm text-amber-900 space-y-1">
          <p className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Atenção
          </p>
          <p>• A importação CSV é <strong>aditiva</strong>: adiciona as despesas sem apagar dados existentes.</p>
          <p>• Etapas e contas inexistentes são criadas automaticamente pelo nome.</p>
          <p>• Valores decimais devem usar <strong>ponto (.)</strong> como separador (ex: 1500.00).</p>
        </CardContent>
      </Card>

      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Importação CSV</DialogTitle>
            <DialogDescription>
              O arquivo <strong>{file?.name}</strong> será importado como novas despesas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)} disabled={loading}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleImport} isLoading={loading} loadingText="Importando…">
              Importar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Aba: JSON ────────────────────────────────────────────────────────────────

function JsonImportTab({ onResult }: { onResult: (r: ImportResult | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupData, setBackupData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.stages || !data.accounts || !data.expenses) {
        toast.error("Arquivo JSON inválido: faltam campos obrigatórios (stages, accounts, expenses).");
        return;
      }
      setBackupData(data);
      onResult(null);
      toast.success("Backup carregado: " + file.name);
    } catch {
      toast.error("Falha ao ler o arquivo JSON.");
    }
  };

  const handleImport = async () => {
    if (!backupData) return;
    setLoading(true);
    try {
      const result = await importBackupToServer(backupData);
      onResult(result);
      if (result.success) {
        toast.success(result.message);
        setBackupData(null);
        setConfirmDialog(false);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error("Erro na importação: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Importar Backup JSON</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione o arquivo <code>backup.json</code> exportado da plataforma anterior.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            id="json-input"
          />
          <label htmlFor="json-input">
            <Button variant="outline" className="w-full cursor-pointer" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" /> Selecionar arquivo JSON…
              </span>
            </Button>
          </label>

          {backupData && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200 text-sm text-blue-900">
                <p className="font-semibold">Backup pronto para importação</p>
                <ul className="mt-2 space-y-1">
                  <li>📁 Projeto: <strong>{backupData.projectName}</strong></li>
                  <li>📊 Etapas: <strong>{backupData.stages?.length ?? 0}</strong></li>
                  <li>💳 Contas: <strong>{backupData.accounts?.length ?? 0}</strong></li>
                  <li>💰 Despesas: <strong>{backupData.expenses?.length ?? 0}</strong></li>
                  {backupData.quotations && (
                    <li>📋 Cotações: <strong>{backupData.quotations.length}</strong></li>
                  )}
                </ul>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setBackupData(null); if (fileRef.current) fileRef.current.value = ""; }} disabled={loading}>
                  Cancelar
                </Button>
                <LoadingButton onClick={() => setConfirmDialog(true)} isLoading={loading} className="flex-1">
                  Importar Backup
                </LoadingButton>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4 text-sm text-amber-900 space-y-1">
          <p className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Atenção
          </p>
          <p>• O backup JSON <strong>apaga todos os dados existentes</strong> e substitui pelo conteúdo do arquivo.</p>
          <p>• Etapas, contas, despesas e cotações são completamente substituídas.</p>
        </CardContent>
      </Card>

      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Importação JSON</DialogTitle>
            <DialogDescription>
              Você está prestes a importar{" "}
              <strong>{backupData?.expenses?.length ?? 0} despesas</strong>,{" "}
              <strong>{backupData?.stages?.length ?? 0} etapas</strong> e{" "}
              <strong>{backupData?.accounts?.length ?? 0} contas</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-900">
            ⚠️ Todos os dados existentes serão removidos e substituídos pelos dados do backup.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)} disabled={loading}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleImport} isLoading={loading} loadingText="Importando…" className="bg-red-600 hover:bg-red-700">
              Sim, Importar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
