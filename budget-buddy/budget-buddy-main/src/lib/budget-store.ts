import { useSyncExternalStore } from "react";
import { loadDataFromBackend, apiSync } from "./api/budget-api-sync";

export type Stage = {
  id: string;
  name: string;
  planned: number;
};

export type PaymentMethod = "avista" | "boleto" | "cartao" | "parcelado";

export type ReceiptType = "nota_fiscal" | "recibo" | "sem_comprovante";

export type Installment = {
  id: string;
  dueDate: string; // ISO yyyy-mm-dd
  amount: number;
  paid: boolean;
  accountId: string; // conta/cartão usado para esta parcela
};

export type Account = {
  id: string;
  name: string;
  type: "conta" | "cartao";
};

export type ItemKind = "material" | "servico" | "taxas";

export type ExpenseItem = {
  id: string;
  kind: ItemKind;
  description: string;
  unit: string;
  quantity: number;
  unitValue: number;
};

export type Expense = {
  id: string;
  stageId: string;
  description: string;
  supplier: string;
  amount: number;
  date: string; // data da despesa, ISO
  paymentMethod: PaymentMethod;
  receiptType?: ReceiptType;
  installments: Installment[];
  items?: ExpenseItem[];
  hasPendency?: boolean;
  pendencyNote?: string;
};


export type QuotationItem = {
  id: string;
  description: string;
  unit: string;
  quantity: number;
};

export type QuotationProposal = {
  id: string;
  supplier: string;
  proposalNumber?: string;
  discountPercent?: number;
  // mapping quotationItemId -> unit price (0 = não cotado)
  prices: Record<string, number>;
};

export type Quotation = {
  id: string;
  name: string;
  createdAt: string; // ISO
  status: "aberto" | "encerrado";
  winnerProposalId?: string;
  winnerJustification?: string;
  items: QuotationItem[];
  proposals: QuotationProposal[];
};

export type BudgetState = {
  projectName: string;
  stages: Stage[];
  accounts: Account[];
  expenses: Expense[];
  quotations: Quotation[];
};

export type LoadingStates = {
  stages: boolean;
  accounts: boolean;
  expenses: boolean;
  quotations: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
};

const STORAGE_KEY = "obra-budget-v2";
const SAVED_AT_FIELD = "__savedAt";

type StoredBudgetState = Partial<BudgetState> & {
  [SAVED_AT_FIELD]?: number;
  expenses?: Array<Expense & { accountId?: string }>;
};

const defaultState: BudgetState = {
  projectName: "Minha Obra",
  stages: [
    { id: "stage-fundacao", name: "Fundação", planned: 20000 },
    { id: "stage-estrutura", name: "Estrutura", planned: 35000 },
    { id: "stage-acabamento", name: "Acabamento", planned: 25000 },
  ],
  accounts: [
    { id: "account-conta-corrente", name: "Conta Corrente", type: "conta" },
    { id: "account-cartao-credito", name: "Cartão de Crédito", type: "cartao" },
  ],
  expenses: [],
  quotations: [],
};

function normalizeState(parsed: StoredBudgetState): BudgetState {
  const accounts = Array.isArray(parsed.accounts) ? parsed.accounts : defaultState.accounts;
  const fallbackAccountId = accounts[0]?.id ?? "";
  const expenses: Expense[] = (Array.isArray(parsed.expenses) ? parsed.expenses : []).map((e) => ({
    id: e.id,
    stageId: e.stageId,
    description: e.description,
    supplier: e.supplier ?? "",
    amount: e.amount,
    date: e.date,
    paymentMethod: e.paymentMethod,
    receiptType: e.receiptType,
    items: e.items,
    hasPendency: e.hasPendency ?? false,
    pendencyNote: e.pendencyNote ?? "",

    installments: (e.installments ?? []).map((i) => ({
      ...i,
      accountId: i.accountId ?? (e as Expense & { accountId?: string }).accountId ?? fallbackAccountId,
    })),
  }));

  return {
    projectName: parsed.projectName ?? defaultState.projectName,
    stages: Array.isArray(parsed.stages) ? parsed.stages : defaultState.stages,
    accounts,
    expenses,
    quotations: (Array.isArray(parsed.quotations) ? parsed.quotations : []).map((q) => ({
      id: q.id,
      name: q.name,
      createdAt: q.createdAt,
      status: q.status ?? "aberto",
      winnerProposalId: q.winnerProposalId,
      winnerJustification: q.winnerJustification,
      items: Array.isArray(q.items) ? q.items : [],
      proposals: Array.isArray(q.proposals)
        ? q.proposals.map((p) => ({ ...p, prices: p.prices ?? {}, discountPercent: typeof p.discountPercent === "number" ? p.discountPercent : 0 }))
        : [],
    })),
  };
}

function parseStoredState(raw: string): { state: BudgetState; savedAt: number } | null {
  try {
    const parsed = JSON.parse(raw) as StoredBudgetState;
    return {
      state: normalizeState(parsed),
      savedAt: typeof parsed[SAVED_AT_FIELD] === "number" ? parsed[SAVED_AT_FIELD] : 0,
    };
  } catch {
    return null;
  }
}

let state: BudgetState = defaultState;
let loadingState: LoadingStates = {
  stages: false,
  accounts: false,
  expenses: false,
  quotations: false,
  creating: false,
  updating: false,
  deleting: false,
};
let lastSavedAt = 0;
let lastSerialized = "";
let hydrated = false;
const listeners = new Set<() => void>();
const loadingListeners = new Set<() => void>();

async function hydrateFromBackend() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  
  try {
    // Tenta carregar do backend
    const backendData = await loadDataFromBackend();
    if (backendData && Object.keys(backendData).length > 0) {
      state = { ...defaultState, ...backendData };
      lastSavedAt = Date.now();
      lastSerialized = JSON.stringify({ ...state, [SAVED_AT_FIELD]: lastSavedAt });
      // Também salva no localStorage como cache
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, lastSerialized);
      }
      listeners.forEach((l) => l());
      return;
    }
  } catch (error) {
    console.warn("Backend not available, falling back to localStorage:", error);
  }
  
  // Fallback para localStorage se backend não está disponível
  hydrateFromStorage();
}

function hydrateFromStorage() {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = parseStoredState(raw);
    if (parsed) {
      state = parsed.state;
      lastSavedAt = parsed.savedAt;
      lastSerialized = raw;
      listeners.forEach((l) => l());
      return;
    }
  }
  lastSerialized = JSON.stringify({ ...state, [SAVED_AT_FIELD]: lastSavedAt });
}

function persist() {
  if (typeof window !== "undefined") {
    lastSavedAt = Date.now();
    lastSerialized = JSON.stringify({ ...state, [SAVED_AT_FIELD]: lastSavedAt });
    localStorage.setItem(STORAGE_KEY, lastSerialized);
  }
  listeners.forEach((l) => l());
}

function setLoading(key: keyof LoadingStates, value: boolean) {
  loadingState = { ...loadingState, [key]: value };
  loadingListeners.forEach((l) => l());
}

function getLoading(): LoadingStates {
  return loadingState;
}

function reloadFromStorage() {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw == null || raw === lastSerialized) return;
  const parsed = parseStoredState(raw);
  if (!parsed || parsed.savedAt < lastSavedAt) return;
  state = parsed.state;
  lastSavedAt = parsed.savedAt;
  lastSerialized = raw;
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) reloadFromStorage();
  });
}

function subscribe(cb: () => void) {
  // Inicia hidratação do backend de forma assíncrona
  if (!hydrated) {
    hydrateFromBackend().finally(() => {
      // Garante que listeners sejam notificados
      cb();
    });
  }
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useBudget(): BudgetState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => defaultState,
  );
}

export function useLoading(): LoadingStates {
  return useSyncExternalStore(
    (cb) => {
      loadingListeners.add(cb);
      return () => loadingListeners.delete(cb);
    },
    () => loadingState,
    () => ({
      stages: false,
      accounts: false,
      expenses: false,
      quotations: false,
      creating: false,
      updating: false,
      deleting: false,
    }),
  );
}

export function getSnapshot(): BudgetState {
  return state;
}

export function replaceState(next: BudgetState) {
  state = next;
  persist();
}

export async function forceRehydrate(): Promise<void> {
  hydrated = false;
  await hydrateFromBackend();
}

export const budgetActions = {
  setProjectName(name: string) {
    state = { ...state, projectName: name };
    persist();
  },
  async addStage(name: string, planned: number) {
    setLoading("creating", true);
    try {
      const id = await apiSync.createStage(name, planned);
      state = {
        ...state,
        stages: [...state.stages, { id, name, planned }],
      };
      persist();
      return id;
    } catch (error) {
      const id = crypto.randomUUID();
      state = {
        ...state,
        stages: [...state.stages, { id, name, planned }],
      };
      persist();
      console.error("Failed to sync stage creation:", error);
      throw error;
    } finally {
      setLoading("creating", false);
    }
  },
  async updateStage(id: string, patch: Partial<Omit<Stage, "id">>) {
    setLoading("updating", true);
    try {
      await apiSync.updateStage(id, { id, ...patch } as Stage);
      state = {
        ...state,
        stages: state.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      };
      persist();
    } catch (error) {
      state = {
        ...state,
        stages: state.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      };
      persist();
      console.error("Failed to sync stage update:", error);
      throw error;
    } finally {
      setLoading("updating", false);
    }
  },
  async removeStage(id: string) {
    setLoading("deleting", true);
    try {
      await apiSync.deleteStage(id);
      state = {
        ...state,
        stages: state.stages.filter((s) => s.id !== id),
        expenses: state.expenses.filter((e) => e.stageId !== id),
      };
      persist();
    } catch (error) {
      state = {
        ...state,
        stages: state.stages.filter((s) => s.id !== id),
        expenses: state.expenses.filter((e) => e.stageId !== id),
      };
      persist();
      console.error("Failed to sync stage deletion:", error);
      throw error;
    } finally {
      setLoading("deleting", false);
    }
  },
  async addAccount(name: string, type: Account["type"]) {
    setLoading("creating", true);
    try {
      const id = await apiSync.createAccount(name, type);
      state = {
        ...state,
        accounts: [...state.accounts, { id, name, type }],
      };
      persist();
      return id;
    } catch (error) {
      const id = crypto.randomUUID();
      state = {
        ...state,
        accounts: [...state.accounts, { id, name, type }],
      };
      persist();
      console.error("Failed to sync account creation:", error);
      throw error;
    } finally {
      setLoading("creating", false);
    }
  },
  async updateAccount(id: string, patch: Partial<Omit<Account, "id">>) {
    setLoading("updating", true);
    try {
      await apiSync.updateAccount(id, { id, ...patch } as Account);
      state = {
        ...state,
        accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      };
      persist();
    } catch (error) {
      state = {
        ...state,
        accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      };
      persist();
      console.error("Failed to sync account update:", error);
      throw error;
    } finally {
      setLoading("updating", false);
    }
  },
  async removeAccount(id: string) {
    setLoading("deleting", true);
    try {
      await apiSync.deleteAccount(id);
      state = { ...state, accounts: state.accounts.filter((a) => a.id !== id) };
      persist();
    } catch (error) {
      state = { ...state, accounts: state.accounts.filter((a) => a.id !== id) };
      persist();
      console.error("Failed to sync account deletion:", error);
      throw error;
    } finally {
      setLoading("deleting", false);
    }
  },
  async addExpense(input: Omit<Expense, "id">) {
    setLoading("creating", true);
    try {
      const id = await apiSync.createExpense(input);
      state = {
        ...state,
        expenses: [...state.expenses, { ...input, id }],
      };
      persist();
      return id;
    } catch (error) {
      const id = crypto.randomUUID();
      state = {
        ...state,
        expenses: [...state.expenses, { ...input, id }],
      };
      persist();
      console.error("Failed to sync expense creation:", error);
      throw error;
    } finally {
      setLoading("creating", false);
    }
  },
  async updateExpense(id: string, patch: Partial<Omit<Expense, "id">>) {
    setLoading("updating", true);
    try {
      await apiSync.updateExpense(id, patch);
      state = {
        ...state,
        expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      };
      persist();
    } catch (error) {
      state = {
        ...state,
        expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      };
      persist();
      console.error("Failed to sync expense update:", error);
      throw error;
    } finally {
      setLoading("updating", false);
    }
  },
  toggleInstallmentPaid(expenseId: string, installmentId: string) {
    state = {
      ...state,
      expenses: state.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              installments: e.installments.map((i) =>
                i.id === installmentId ? { ...i, paid: !i.paid } : i,
              ),
            }
          : e,
      ),
    };
    persist();
  },
  setInstallmentAccount(expenseId: string, installmentId: string, accountId: string) {
    state = {
      ...state,
      expenses: state.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              installments: e.installments.map((i) =>
                i.id === installmentId ? { ...i, accountId } : i,
              ),
            }
          : e,
      ),
    };
    persist();
  },
  setInstallmentAmount(expenseId: string, installmentId: string, amount: number) {
    state = {
      ...state,
      expenses: state.expenses.map((e) => {
        if (e.id !== expenseId) return e;
        const installments = e.installments.map((i) =>
          i.id === installmentId ? { ...i, amount } : i,
        );
        const total = +installments.reduce((s, i) => s + i.amount, 0).toFixed(2);
        return { ...e, installments, amount: total };
      }),
    };
    persist();
  },
  setInstallmentDueDate(expenseId: string, installmentId: string, dueDate: string) {
    state = {
      ...state,
      expenses: state.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              installments: e.installments.map((i) =>
                i.id === installmentId ? { ...i, dueDate } : i,
              ),
            }
          : e,
      ),
    };
    persist();
  },
  setInstallmentPaid(expenseId: string, installmentId: string, paid: boolean) {
    state = {
      ...state,
      expenses: state.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              installments: e.installments.map((i) =>
                i.id === installmentId ? { ...i, paid } : i,
              ),
            }
          : e,
      ),
    };
    persist();
  },
  setExpenseItems(id: string, items: ExpenseItem[]) {
    state = {
      ...state,
      expenses: state.expenses.map((e) => (e.id === id ? { ...e, items } : e)),
    };
    persist();
  },
  toggleExpensePaid(expenseId: string) {
    state = {
      ...state,
      expenses: state.expenses.map((e) => {
        if (e.id !== expenseId) return e;
        const allPaid = e.installments.every((i) => i.paid);
        return {
          ...e,
          installments: e.installments.map((i) => ({ ...i, paid: !allPaid })),
        };
      }),
    };
    persist();
  },
  setPendency(id: string, hasPendency: boolean, pendencyNote: string) {
    state = {
      ...state,
      expenses: state.expenses.map((e) =>
        e.id === id ? { ...e, hasPendency, pendencyNote } : e,
      ),
    };
    persist();
  },
  removeExpense(id: string) {
    setLoading("deleting", true);
    apiSync.deleteExpense(id)
      .catch((error) => {
        console.error("Failed to sync expense deletion:", error);
      })
      .finally(() => {
        setLoading("deleting", false);
      });
    state = { ...state, expenses: state.expenses.filter((e) => e.id !== id) };
    persist();
  },

  async addQuotation(name: string): Promise<string> {
    setLoading("creating", true);
    try {
      const id = await apiSync.createQuotation(name);
      state = {
        ...state,
        quotations: [
          ...state.quotations,
          { id, name, createdAt: new Date().toISOString(), status: "aberto", items: [], proposals: [] },
        ],
      };
      persist();
      return id;
    } catch (error) {
      const id = crypto.randomUUID();
      state = {
        ...state,
        quotations: [
          ...state.quotations,
          { id, name, createdAt: new Date().toISOString(), status: "aberto", items: [], proposals: [] },
        ],
      };
      persist();
      console.error("Failed to sync quotation creation:", error);
      throw error;
    } finally {
      setLoading("creating", false);
    }
  },
  async updateQuotation(id: string, patch: Partial<Pick<Quotation, "name">>) {
    setLoading("updating", true);
    try {
      await apiSync.updateQuotation(id, { ...state.quotations.find((q) => q.id === id), ...patch } as Quotation);
      state = {
        ...state,
        quotations: state.quotations.map((q) => (q.id === id ? { ...q, ...patch } : q)),
      };
      persist();
    } catch (error) {
      state = {
        ...state,
        quotations: state.quotations.map((q) => (q.id === id ? { ...q, ...patch } : q)),
      };
      persist();
      console.error("Failed to sync quotation update:", error);
      throw error;
    } finally {
      setLoading("updating", false);
    }
  },
  async closeQuotation(id: string, winnerProposalId: string, winnerJustification?: string) {
    setLoading("updating", true);
    try {
      await apiSync.closeQuotation(id, winnerProposalId);
      state = {
        ...state,
        quotations: state.quotations.map((q) =>
          q.id === id
            ? { ...q, status: "encerrado" as const, winnerProposalId, winnerJustification }
            : q
        ),
      };
      persist();
    } catch (error) {
      state = {
        ...state,
        quotations: state.quotations.map((q) =>
          q.id === id
            ? { ...q, status: "encerrado" as const, winnerProposalId, winnerJustification }
            : q
        ),
      };
      persist();
      console.error("Failed to sync quotation close:", error);
      throw error;
    } finally {
      setLoading("updating", false);
    }
  },
  async reopenQuotation(id: string) {
    setLoading("updating", true);
    try {
      await apiSync.reopenQuotation(id);
      state = {
        ...state,
        quotations: state.quotations.map((q) =>
          q.id === id
            ? { ...q, status: "aberto" as const, winnerProposalId: undefined, winnerJustification: undefined }
            : q
        ),
      };
      persist();
    } catch (error) {
      state = {
        ...state,
        quotations: state.quotations.map((q) =>
          q.id === id
            ? { ...q, status: "aberto" as const, winnerProposalId: undefined, winnerJustification: undefined }
            : q
        ),
      };
      persist();
      console.error("Failed to sync quotation reopen:", error);
      throw error;
    } finally {
      setLoading("updating", false);
    }
  },
  removeQuotation(id: string) {
    setLoading("deleting", true);
    apiSync.deleteQuotation(id)
      .catch((error) => {
        console.error("Failed to sync quotation deletion:", error);
      })
      .finally(() => {
        setLoading("deleting", false);
      });
    state = { ...state, quotations: state.quotations.filter((q) => q.id !== id) };
    persist();
  },
  addQuotationItem(quotationId: string, item: Omit<QuotationItem, "id">) {
    const newItem: QuotationItem = { ...item, id: crypto.randomUUID() };
    state = {
      ...state,
      quotations: state.quotations.map((q) =>
        q.id === quotationId ? { ...q, items: [...q.items, newItem] } : q,
      ),
    };
    persist();
  },
  removeQuotationItem(quotationId: string, itemId: string) {
    state = {
      ...state,
      quotations: state.quotations.map((q) => {
        if (q.id !== quotationId) return q;
        const proposals = q.proposals.map((p) => {
          const prices = { ...p.prices };
          delete prices[itemId];
          return { ...p, prices };
        });
        return { ...q, items: q.items.filter((i) => i.id !== itemId), proposals };
      }),
    };
    persist();
  },
  updateQuotationItem(quotationId: string, itemId: string, patch: Partial<Omit<QuotationItem, "id">>) {
    state = {
      ...state,
      quotations: state.quotations.map((q) =>
        q.id === quotationId
          ? { ...q, items: q.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
          : q,
      ),
    };
    persist();
  },
  addProposal(quotationId: string, supplier: string, proposalNumber?: string, discountPercent = 0): string {
    const id = crypto.randomUUID();
    state = {
      ...state,
      quotations: state.quotations.map((q) =>
        q.id === quotationId
          ? {
              ...q,
              proposals: [
                ...q.proposals,
                { id, supplier, proposalNumber, discountPercent, prices: {} },
              ],
            }
          : q,
      ),
    };
    persist();
    return id;
  },
  updateProposal(quotationId: string, proposalId: string, patch: Partial<Pick<QuotationProposal, "supplier" | "proposalNumber" | "discountPercent">>) {
    state = {
      ...state,
      quotations: state.quotations.map((q) =>
        q.id === quotationId
          ? {
              ...q,
              proposals: q.proposals.map((p) =>
                p.id === proposalId ? { ...p, ...patch } : p,
              ),
            }
          : q,
      ),
    };
    persist();
  },
  removeProposal(quotationId: string, proposalId: string) {
    state = {
      ...state,
      quotations: state.quotations.map((q) =>
        q.id === quotationId
          ? { ...q, proposals: q.proposals.filter((p) => p.id !== proposalId) }
          : q,
      ),
    };
    persist();
  },
  setProposalPrice(quotationId: string, proposalId: string, itemId: string, price: number) {
    state = {
      ...state,
      quotations: state.quotations.map((q) =>
        q.id === quotationId
          ? {
              ...q,
              proposals: q.proposals.map((p) =>
                p.id === proposalId ? { ...p, prices: { ...p.prices, [itemId]: price } } : p,
              ),
            }
          : q,
      ),
    };
    persist();
  },
};

export function getSpentByStage(s: BudgetState, stageId: string): number {
  return s.expenses
    .filter((e) => e.stageId === stageId)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function isExpensePaid(e: Expense): boolean {
  return e.installments.length > 0 && e.installments.every((i) => i.paid);
}

export function proposalDiscountFactor(p: QuotationProposal): number {
  const d = p.discountPercent ?? 0;
  return 1 - d / 100;
}

export function effectiveUnitPrice(p: QuotationProposal, itemId: string): number {
  const raw = p.prices[itemId] ?? 0;
  return raw * proposalDiscountFactor(p);
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  avista: "À vista",
  boleto: "Boleto",
  cartao: "Cartão de crédito",
  parcelado: "Parcelado",
};

export const receiptTypeLabel: Record<ReceiptType, string> = {
  nota_fiscal: "Nota Fiscal",
  recibo: "Recibo",
  sem_comprovante: "Sem Comprovante",
};
