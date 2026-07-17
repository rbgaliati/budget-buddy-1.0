const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

/**
 * Exporta backup completo do servidor (fonte primária: banco de dados)
 */
export async function exportBackupFromServer(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/export/backup`);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Falha ao exportar backup: ${response.status} ${response.statusText}${body ? " — " + body : ""}`);
  }
  return response.json();
}

/**
 * Importa dados de backup JSON para o servidor
 */
export async function importBackupToServer(backupData: any) {
  try {
    const response = await fetch(`${API_BASE_URL}/import/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(backupData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Response error:", errorText);
      throw new Error(`Import failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error importing backup:", error);
    if (error instanceof TypeError) {
      throw new Error("Falha de conexão: Backend não está respondendo em http://localhost:8081. Verifique se o servidor está rodando.");
    }
    throw error;
  }
}

/**
 * Valida estrutura do backup
 */
export function validateBackup(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.projectName) errors.push("Missing projectName");
  if (!Array.isArray(data.stages)) errors.push("stages must be an array");
  if (!Array.isArray(data.accounts)) errors.push("accounts must be an array");
  if (!Array.isArray(data.expenses)) errors.push("expenses must be an array");

  data.stages?.forEach((s: any, i: number) => {
    if (!s.id) errors.push(`Stage[${i}]: missing id`);
    if (!s.name) errors.push(`Stage[${i}]: missing name`);
    if (s.planned === undefined) errors.push(`Stage[${i}]: missing planned`);
  });

  data.accounts?.forEach((a: any, i: number) => {
    if (!a.id) errors.push(`Account[${i}]: missing id`);
    if (!a.name) errors.push(`Account[${i}]: missing name`);
    if (!a.type) errors.push(`Account[${i}]: missing type`);
  });

  data.expenses?.forEach((e: any, i: number) => {
    if (!e.id) errors.push(`Expense[${i}]: missing id`);
    if (!e.stageId) errors.push(`Expense[${i}]: missing stageId`);
    if (!e.amount) errors.push(`Expense[${i}]: missing amount`);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Envia um arquivo CSV de despesas para o servidor via multipart/form-data.
 */
export async function importCsvToServer(file: File) {
  const form = new FormData();
  form.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/import/csv`, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Import failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Falha de conexão: backend não está respondendo. Verifique se o servidor está rodando."
      );
    }
    throw error;
  }
}
