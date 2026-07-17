// Budget Store API Integration
// Este arquivo integra o budget-store com a API do backend Java
// Mantém sincronização entre localStorage e API

import { apiClient, ApiError } from "./api-client";
import type { Stage, Account, Expense, Quotation, BudgetState } from "@/lib/budget-store";

export async function loadDataFromBackend(): Promise<Partial<BudgetState>> {
  try {
    const [stages, accounts, expenses, quotations] = await Promise.all([
      apiClient.getStages().catch(() => [] as Stage[]),
      apiClient.getAccounts().catch(() => [] as Account[]),
      apiClient.getExpenses().catch(() => [] as Expense[]),
      apiClient.getQuotations().catch(() => [] as Quotation[]),
    ]);

    return {
      stages: stages as Stage[],
      accounts: accounts as Account[],
      expenses: transformExpensesFromApi(expenses as any[]),
      quotations: transformQuotationsFromApi(quotations as any[]),
    };
  } catch (error) {
    console.error("Failed to load data from backend:", error);
    return {};
  }
}

function transformExpensesFromApi(expenses: any[]): Expense[] {
  return expenses.map((e) => ({
    id: e.id,
    stageId: e.stage?.id || e.stageId,
    description: e.description,
    supplier: e.supplier,
    amount: typeof e.amount === "number" ? e.amount : parseFloat(e.amount) || 0,
    date: e.date,
    paymentMethod: e.paymentMethod,
    receiptType: e.receiptType,
    items: (e.items || []).map((i: any) => ({
      id: i.id,
      kind: i.kind,
      description: i.description,
      unit: i.unit,
      quantity: typeof i.quantity === "number" ? i.quantity : parseFloat(i.quantity) || 0,
      unitValue: typeof i.unitValue === "number" ? i.unitValue : parseFloat(i.unitValue) || 0,
    })),
    installments: (e.installments || []).map((inst: any) => ({
      id: inst.id,
      dueDate: inst.dueDate,
      amount: typeof inst.amount === "number" ? inst.amount : parseFloat(inst.amount) || 0,
      paid: inst.paid,
      accountId: inst.account?.id || inst.accountId,
    })),
    hasPendency: e.hasPendency || false,
    pendencyNote: e.pendencyNote,
  }));
}

function transformQuotationsFromApi(quotations: any[]): Quotation[] {
  return quotations.map((q) => ({
    id: q.id,
    name: q.title,
    createdAt: q.createdAt,
    status: q.status === "encerrada" ? "encerrado" : "aberto",
    winnerProposalId: q.winnerProposalId,
    items: (q.items || []).map((i: any) => ({
      id: i.id,
      description: i.description,
      unit: i.unit,
      quantity: typeof i.quantity === "number" ? i.quantity : parseFloat(i.quantity) || 0,
    })),
    proposals: (q.proposals || []).map((p: any) => ({
      id: p.id,
      supplier: p.supplier,
      discountPercent: 0,
      prices: (p.prices || []).reduce(
        (acc: Record<string, number>, pr: any) => {
          acc[pr.itemId] = typeof pr.unitPrice === "number" ? pr.unitPrice : parseFloat(pr.unitPrice) || 0;
          return acc;
        },
        {}
      ),
    })),
  }));
}

// API Sync Operations
export const apiSync = {
  async createStage(name: string, planned: number) {
    try {
      const result = await apiClient.createStage({ name, planned });
      return (result as any).id;
    } catch (error) {
      console.error("Failed to create stage:", error);
      throw error;
    }
  },

  async updateStage(id: string, patch: Partial<Stage>) {
    try {
      await apiClient.updateStage(id, {
        name: patch.name,
        planned: patch.planned,
      });
    } catch (error) {
      console.error("Failed to update stage:", error);
      throw error;
    }
  },

  async deleteStage(id: string) {
    try {
      await apiClient.deleteStage(id);
    } catch (error) {
      console.error("Failed to delete stage:", error);
      throw error;
    }
  },

  async createAccount(name: string, type: "conta" | "cartao") {
    try {
      const result = await apiClient.createAccount({ name, type });
      return (result as any).id;
    } catch (error) {
      console.error("Failed to create account:", error);
      throw error;
    }
  },

  async updateAccount(id: string, patch: Partial<Account>) {
    try {
      await apiClient.updateAccount(id, {
        name: patch.name,
        type: patch.type,
      });
    } catch (error) {
      console.error("Failed to update account:", error);
      throw error;
    }
  },

  async deleteAccount(id: string) {
    try {
      await apiClient.deleteAccount(id);
    } catch (error) {
      console.error("Failed to delete account:", error);
      throw error;
    }
  },

  async createExpense(expense: Omit<Expense, "id">) {
    try {
      const result = await apiClient.createExpense({
        stageId: expense.stageId,
        description: expense.description,
        supplier: expense.supplier,
        amount: expense.amount,
        date: expense.date,
        paymentMethod: expense.paymentMethod,
        receiptType: expense.receiptType,
        items: expense.items || [],
        installments: expense.installments || [],
        hasPendency: expense.hasPendency,
        pendencyNote: expense.pendencyNote,
      });
      return (result as any).id;
    } catch (error) {
      console.error("Failed to create expense:", error);
      throw error;
    }
  },

  async updateExpense(id: string, patch: Partial<Expense>) {
    try {
      await apiClient.updateExpense(id, {
        stageId: patch.stageId,
        description: patch.description,
        supplier: patch.supplier,
        amount: patch.amount,
        date: patch.date,
        paymentMethod: patch.paymentMethod,
        receiptType: patch.receiptType,
        hasPendency: patch.hasPendency,
        pendencyNote: patch.pendencyNote,
      });
    } catch (error) {
      console.error("Failed to update expense:", error);
      throw error;
    }
  },

  async deleteExpense(id: string) {
    try {
      await apiClient.deleteExpense(id);
    } catch (error) {
      console.error("Failed to delete expense:", error);
      throw error;
    }
  },

  async createQuotation(name: string) {
    try {
      const result = await apiClient.createQuotation({
        title: name,
        status: "aberta",
        items: [],
        proposals: [],
      });
      return (result as any).id;
    } catch (error) {
      console.error("Failed to create quotation:", error);
      throw error;
    }
  },

  async updateQuotation(id: string, patch: Partial<Quotation>) {
    try {
      await apiClient.updateQuotation(id, {
        title: patch.name,
        items: patch.items,
      });
    } catch (error) {
      console.error("Failed to update quotation:", error);
      throw error;
    }
  },

  async closeQuotation(id: string, winnerProposalId: string) {
    try {
      await apiClient.closeQuotation(id, winnerProposalId);
    } catch (error) {
      console.error("Failed to close quotation:", error);
      throw error;
    }
  },

  async reopenQuotation(id: string) {
    try {
      await apiClient.reopenQuotation(id);
    } catch (error) {
      console.error("Failed to reopen quotation:", error);
      throw error;
    }
  },

  async deleteQuotation(id: string) {
    try {
      await apiClient.deleteQuotation(id);
    } catch (error) {
      console.error("Failed to delete quotation:", error);
      throw error;
    }
  },
};
