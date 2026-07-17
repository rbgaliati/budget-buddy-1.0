// API Client para comunicar com o backend Java Spring Boot
// Base URL: http://localhost:8081/api

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public data?: any,
    message?: string
  ) {
    super(message || `API Error: ${status}`);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error, error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const apiClient = {
  // ===== ACCOUNTS =====
  async getAccounts() {
    const response = await fetch(`${API_BASE_URL}/accounts`);
    return handleResponse(response);
  },

  async getAccount(id: string) {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`);
    return handleResponse(response);
  },

  async createAccount(data: { name: string; type: "conta" | "cartao" }) {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateAccount(id: string, data: Partial<{ name: string; type: "conta" | "cartao" }>) {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteAccount(id: string) {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new ApiError(response.status);
  },

  // ===== SUPPLIERS =====
  async getSuppliers() {
    const response = await fetch(`${API_BASE_URL}/suppliers`);
    return handleResponse(response);
  },

  async getSupplier(id: string) {
    const response = await fetch(`${API_BASE_URL}/suppliers/${id}`);
    return handleResponse(response);
  },

  async createSupplier(data: { name: string; document?: string; contact?: string }) {
    const response = await fetch(`${API_BASE_URL}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateSupplier(
    id: string,
    data: Partial<{ name: string; document?: string; contact?: string }>
  ) {
    const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteSupplier(id: string) {
    const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new ApiError(response.status);
  },

  // ===== STAGES =====
  async getStages() {
    const response = await fetch(`${API_BASE_URL}/stages`);
    return handleResponse(response);
  },

  async getStage(id: string) {
    const response = await fetch(`${API_BASE_URL}/stages/${id}`);
    return handleResponse(response);
  },

  async createStage(data: { name: string; planned?: number }) {
    const response = await fetch(`${API_BASE_URL}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateStage(id: string, data: Partial<{ name: string; planned?: number }>) {
    const response = await fetch(`${API_BASE_URL}/stages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteStage(id: string) {
    const response = await fetch(`${API_BASE_URL}/stages/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new ApiError(response.status);
  },

  // ===== EXPENSES =====
  async getExpenses(filters?: { stageId?: string; from?: string; to?: string }) {
    const url = new URL(`${API_BASE_URL}/expenses`);
    if (filters?.stageId) url.searchParams.append("stageId", filters.stageId);
    if (filters?.from) url.searchParams.append("from", filters.from);
    if (filters?.to) url.searchParams.append("to", filters.to);
    const response = await fetch(url.toString());
    return handleResponse(response);
  },

  async getExpense(id: string) {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`);
    return handleResponse(response);
  },

  async createExpense(data: any) {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateExpense(id: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteExpense(id: string) {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new ApiError(response.status);
  },

  // ===== QUOTATIONS =====
  async getQuotations(filters?: { status?: string }) {
    const url = new URL(`${API_BASE_URL}/quotations`);
    if (filters?.status) url.searchParams.append("status", filters.status);
    const response = await fetch(url.toString());
    return handleResponse(response);
  },

  async getQuotation(id: string) {
    const response = await fetch(`${API_BASE_URL}/quotations/${id}`);
    return handleResponse(response);
  },

  async createQuotation(data: any) {
    const response = await fetch(`${API_BASE_URL}/quotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateQuotation(id: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteQuotation(id: string) {
    const response = await fetch(`${API_BASE_URL}/quotations/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new ApiError(response.status);
  },

  async closeQuotation(id: string, winnerProposalId: string) {
    const response = await fetch(`${API_BASE_URL}/quotations/${id}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winnerProposalId }),
    });
    return handleResponse(response);
  },

  async reopenQuotation(id: string) {
    const response = await fetch(`${API_BASE_URL}/quotations/${id}/reopen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(response);
  },

  // ===== INVENTORY =====
  async getInventoryItems() {
    const response = await fetch(`${API_BASE_URL}/inventory`);
    return handleResponse(response);
  },

  async getInventoryItem(id: string) {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`);
    return handleResponse(response);
  },

  async createInventoryItem(data: any) {
    const response = await fetch(`${API_BASE_URL}/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateInventoryItem(id: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteInventoryItem(id: string) {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new ApiError(response.status);
  },
};
