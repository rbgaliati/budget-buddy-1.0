import { toast } from "sonner";

export type ToastType = "success" | "error" | "loading" | "info";

interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
}

/**
 * Mostra notificação de sucesso
 */
export function toastSuccess(message: string, options?: ToastOptions) {
  toast.success(message, {
    duration: options?.duration || 3000,
    dismissible: options?.dismissible !== false,
  });
}

/**
 * Mostra notificação de erro
 */
export function toastError(message: string, options?: ToastOptions) {
  toast.error(message, {
    duration: options?.duration || 4000,
    dismissible: options?.dismissible !== false,
  });
}

/**
 * Mostra notificação de carregamento
 */
export function toastLoading(message: string) {
  return toast.loading(message);
}

/**
 * Mostra notificação genérica
 */
export function toastInfo(message: string, options?: ToastOptions) {
  toast(message, {
    duration: options?.duration || 3000,
    dismissible: options?.dismissible !== false,
  });
}

/**
 * Atualiza uma notificação de carregamento para sucesso/erro
 */
export function toastUpdateLoading(
  toastId: string | number,
  type: "success" | "error",
  message: string
) {
  toast[type](message, {
    id: toastId,
  });
}

/**
 * Wrapper para operações assíncronas com toast automático
 */
export async function withToast<T>(
  promise: Promise<T>,
  messages?: {
    loading?: string;
    success?: string;
    error?: string;
  }
): Promise<T> {
  const id = messages?.loading ? toastLoading(messages.loading) : undefined;

  try {
    const result = await promise;
    if (id && messages?.success) {
      toastUpdateLoading(id, "success", messages.success);
    } else if (id) {
      toast.dismiss(id);
    } else if (messages?.success) {
      toastSuccess(messages.success);
    }
    return result;
  } catch (error) {
    const errorMessage = messages?.error || "Erro ao processar operação";
    if (id) {
      toastUpdateLoading(id, "error", errorMessage);
    } else {
      toastError(errorMessage);
    }
    throw error;
  }
}

/**
 * Helper específico para operações CRUD
 */
export const crudToasts = {
  /**
   * Criar recurso
   */
  async create<T>(
    promise: Promise<T>,
    resourceName: string
  ): Promise<T> {
    return withToast(promise, {
      loading: `Criando ${resourceName}...`,
      success: `${resourceName} criado com sucesso!`,
      error: `Erro ao criar ${resourceName}`,
    });
  },

  /**
   * Atualizar recurso
   */
  async update<T>(
    promise: Promise<T>,
    resourceName: string
  ): Promise<T> {
    return withToast(promise, {
      loading: `Atualizando ${resourceName}...`,
      success: `${resourceName} atualizado com sucesso!`,
      error: `Erro ao atualizar ${resourceName}`,
    });
  },

  /**
   * Deletar recurso
   */
  async delete<T>(
    promise: Promise<T>,
    resourceName: string
  ): Promise<T> {
    return withToast(promise, {
      loading: `Deletando ${resourceName}...`,
      success: `${resourceName} deletado com sucesso!`,
      error: `Erro ao deletar ${resourceName}`,
    });
  },

  /**
   * Fechar/Abrir recurso
   */
  async toggle<T>(
    promise: Promise<T>,
    action: string,
    resourceName: string
  ): Promise<T> {
    return withToast(promise, {
      loading: `${action}ing ${resourceName}...`,
      success: `${resourceName} ${action}o com sucesso!`,
      error: `Erro ao ${action} ${resourceName}`,
    });
  },
};
