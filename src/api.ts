/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Format Currencies in IQD
export const formatIQD = (amount: any): string => {
  let value = Number(amount);
  if (isNaN(value)) {
    value = 0;
  }
  return `${value.toLocaleString('en-US')}\u00A0د.ع.`;
};

// Compress image to reduce file size
export const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

// API Base Url is empty because we use custom Express + Vite proxy
const BASE_URL = "/api";

let authToken = localStorage.getItem("token") || "";

export const setToken = (token: string) => {
  authToken = token;
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
};

export const getToken = (): string => {
  return authToken;
};

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errMsg = "حدث خطأ غير متوقع في النظام";
    try {
      const errData = await response.json();
      errMsg = errData.error || errMsg;
    } catch (e) {}
    throw new Error(errMsg);
  }

  // Handle file downloads if necessary
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response;
}

export const api = {
  // Authentication
  login: async (username: string, password: string) => {
    const res = await fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    setToken(res.token);
    return res;
  },
  logout: async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch (e) {}
    setToken("");
  },
  getMe: async () => {
    return fetchApi("/auth/me");
  },

  // Dashboard
  getDashboardSummary: async () => {
    return fetchApi("/dashboard/summary");
  },

  // Central search
  search: async (query: string) => {
    return fetchApi(`/search?q=${encodeURIComponent(query)}`);
  },
  // Agents
  getAgents: async () => fetchApi("/agents"),
  createAgent: async (data: { name: string, phone?: string }) => fetchApi("/agents", { method: "POST", body: JSON.stringify(data) }),
  updateAgent: async (id: number, data: { name?: string, phone?: string }) => fetchApi(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAgent: async (id: number) => fetchApi(`/agents/${id}`, { method: "DELETE" }),
  payAgent: async (id: number, payments: { customerId: number, amount: number }[]) => fetchApi(`/agents/${id}/pay`, { method: "POST", body: JSON.stringify({ payments }) }),
  getAgentPayments: async (id: number) => fetchApi(`/agents/${id}/payments`),

  // Customers
  getCustomers: async (page?: number, limit?: number, search?: string) => {
    let url = "/customers";
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (search) params.append('search', search);
    const qs = params.toString();
    return fetchApi(qs ? `${url}?${qs}` : url);
  },
  createCustomer: async (customerData: any) => {
    return fetchApi("/customers", {
      method: "POST",
      body: JSON.stringify(customerData)
    });
  },
  updateCustomer: async (id: number, customerData: any) => {
    return fetchApi(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(customerData)
    });
  },
  deleteCustomer: async (id: number) => {
    return fetchApi(`/customers/${id}`, { method: "DELETE" });
  },
  getCustomerProfile: async (id: number) => {
    return fetchApi(`/customers/${id}/profile`);
  },

  // Categories
  getCategories: async () => {
    return fetchApi("/categories");
  },
  createCategory: async (name: string) => {
    return fetchApi("/categories", {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },
  updateCategory: async (id: number, name: string) => {
    return fetchApi(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name })
    });
  },
  deleteCategory: async (id: number) => {
    return fetchApi(`/categories/${id}`, { method: "DELETE" });
  },

  // Products
  getProducts: async (page?: number, limit?: number, search?: string) => {
    let url = "/products";
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (search) params.append('search', search);
    const qs = params.toString();
    return fetchApi(qs ? `${url}?${qs}` : url);
  },
  createProduct: async (productData: any) => {
    return fetchApi("/products", {
      method: "POST",
      body: JSON.stringify(productData)
    });
  },
  updateProduct: async (id: number, productData: any) => {
    return fetchApi(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(productData)
    });
  },
  deleteProduct: async (id: number) => {
    return fetchApi(`/products/${id}`, { method: "DELETE" });
  },

  // Inventory
  getInventoryHistory: async () => {
    return fetchApi("/inventory/history");
  },
  createInventoryAdjustment: async (adjData: any) => {
    return fetchApi("/inventory/adjustment", {
      method: "POST",
      body: JSON.stringify(adjData)
    });
  },

  // POS / Invoices
  createInvoice: async (invoiceData: any) => {
    return fetchApi("/pos/invoice", {
      method: "POST",
      body: JSON.stringify(invoiceData)
    });
  },
  getInvoices: async (page?: number, limit?: number, search?: string) => {
    let url = "/invoices";
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (search) params.append('search', search);
    const qs = params.toString();
    return fetchApi(qs ? `${url}?${qs}` : url);
  },
  cancelInvoice: async (id: number, reason: string) => {
    return fetchApi(`/invoices/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },
  updateInvoice: async (id: number, invoiceData: any) => {
    return fetchApi(`/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(invoiceData)
    });
  },
  deleteInvoice: async (id: number) => {
    return fetchApi(`/invoices/${id}`, { method: "DELETE" });
  },
  updateInvoiceProof: async (id: number, deliveryProofImage: string) => {
    return fetchApi(`/invoices/${id}/proof`, {
      method: "PATCH",
      body: JSON.stringify({ deliveryProofImage })
    });
  },
  uploadImage: async (base64Image: string) => {
    return fetchApi(`/upload`, {
      method: "POST",
      body: JSON.stringify({ base64Image })
    });
  },

  // Partial Payments
  getPartialPayments: async (invoiceId: number) => {
    return fetchApi(`/invoices/${invoiceId}/partial-payments`);
  },
  addPartialPayment: async (invoiceId: number, amount: number, notes?: string) => {
    return fetchApi(`/invoices/${invoiceId}/partial-payments`, {
      method: "POST",
      body: JSON.stringify({ amount, notes })
    });
  },

  // Bank Settlement
  getBankSettlement: async () => {
    return fetchApi("/bank-settlement");
  },
  withdrawFromBank: async (amount: number, date: string, notes?: string) => {
    return fetchApi("/bank-settlement/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount, date, notes })
    });
  },

  // Installments
  getInstallments: async () => {
    return fetchApi("/installments");
  },
  updateInstallmentPayments: async (id: number, installments: any[], notes?: string) => {
    return fetchApi(`/installments/${id}/payments`, {
      method: "PUT",
      body: JSON.stringify({ installments, notes })
    });
  },
  deleteInstallmentPayment: async (id: number, scheduleId: number) => {
    return fetchApi(`/installments/${id}/payments/${scheduleId}`, {
      method: "DELETE"
    });
  },

  // Maintenance
  getMaintenance: async () => {
    return fetchApi("/maintenance");
  },
  createMaintenance: async (maintenanceData: any) => {
    return fetchApi("/maintenance", {
      method: "POST",
      body: JSON.stringify(maintenanceData)
    });
  },
  updateMaintenance: async (id: number, maintenanceData: any) => {
    return fetchApi(`/maintenance/${id}`, {
      method: "PUT",
      body: JSON.stringify(maintenanceData)
    });
  },
  deleteMaintenance: async (id: number) => {
    return fetchApi(`/maintenance/${id}`, { method: "DELETE" });
  },

  // Faults
  getFaults: async () => {
    return fetchApi("/faults");
  },
  createFault: async (faultData: any) => {
    return fetchApi("/faults", {
      method: "POST",
      body: JSON.stringify(faultData)
    });
  },
  updateFault: async (id: number, faultData: any) => {
    return fetchApi(`/faults/${id}`, {
      method: "PUT",
      body: JSON.stringify(faultData)
    });
  },
  deleteFault: async (id: number) => {
    return fetchApi(`/faults/${id}`, { method: "DELETE" });
  },

  // Installation Teams
  getTeams: async () => {
    return fetchApi("/installation-teams");
  },
  createTeam: async (teamData: any) => {
    return fetchApi("/installation-teams", {
      method: "POST",
      body: JSON.stringify(teamData)
    });
  },
  updateTeam: async (id: number, teamData: any) => {
    return fetchApi(`/installation-teams/${id}`, {
      method: "PUT",
      body: JSON.stringify(teamData)
    });
  },
  deleteTeam: async (id: number) => {
    return fetchApi(`/installation-teams/${id}`, { method: "DELETE" });
  },

  // Team Expense Cards & Items
  getTeamExpenseCards: async (teamId: number) => {
    return fetchApi(`/installation-teams/${teamId}/expense-cards`);
  },
  createTeamExpenseCard: async (teamId: number, cardData: any) => {
    return fetchApi(`/installation-teams/${teamId}/expense-cards`, {
      method: "POST",
      body: JSON.stringify(cardData)
    });
  },
  deleteTeamExpenseCard: async (cardId: number) => {
    return fetchApi(`/installation-teams/expense-cards/${cardId}`, { method: "DELETE" });
  },
  addTeamExpenseItem: async (cardId: number, itemData: any) => {
    return fetchApi(`/installation-teams/expense-cards/${cardId}/items`, {
      method: "POST",
      body: JSON.stringify(itemData)
    });
  },
  deleteTeamExpenseItem: async (itemId: number) => {
    return fetchApi(`/installation-teams/expense-items/${itemId}`, { method: "DELETE" });
  },

  // Installation Workers
  getWorkers: async () => {
    return fetchApi("/installation-workers");
  },
  createWorker: async (workerData: any) => {
    return fetchApi("/installation-workers", {
      method: "POST",
      body: JSON.stringify(workerData)
    });
  },
  deleteWorker: async (id: number) => {
    return fetchApi(`/installation-workers/${id}`, { method: "DELETE" });
  },
  resetWorker: async (id: number) => {
    return fetchApi(`/installation-workers/${id}/reset`, { method: "POST" });
  },

  // Worker Settlements
  getWorkerSettlements: async () => {
    return fetchApi("/worker-settlements");
  },
  toggleWorkerSettlement: async (workerId: number, bookingId: number, taskId?: number, taskType?: string) => {
    return fetchApi("/worker-settlements/toggle", {
      method: "POST",
      body: JSON.stringify({ workerId, bookingId, taskId, taskType })
    });
  },
  payWorkerSettlement: async (workerId: number, amount: number) => {
    return fetchApi("/worker-settlements/pay", {
      method: "POST",
      body: JSON.stringify({ workerId, amount })
    });
  },

  // Worker Payments (per-task amounts)
  getWorkerPayments: async () => {
    return fetchApi("/worker-payments");
  },
  createBulkWorkerPayments: async (payments: any[]) => {
    return fetchApi("/worker-payments/bulk", {
      method: "POST",
      body: JSON.stringify({ payments })
    });
  },
  saveTaskWorkerPayments: async (taskId: number, taskType: string, payments: any[]) => {
    return fetchApi("/worker-payments/task", {
      method: "POST",
      body: JSON.stringify({ taskId, taskType, payments })
    });
  },


  // Task Assignments (Maintenance & Faults -> Teams)
  getTaskAssignments: async () => {
    return fetchApi("/task-assignments");
  },
  assignTaskToTeam: async (taskId: number, taskType: string, teamId: number) => {
    return fetchApi("/task-assignments", {
      method: "POST",
      body: JSON.stringify({ taskId, taskType, teamId })
    });
  },

  // Installation Bookings
  getBookings: async () => {
    return fetchApi("/installations");
  },
  getBookingInvoice: async (bookingId: number) => {
    return fetchApi(`/bookings/${bookingId}/invoice`);
  },
  createBooking: async (bookingData: any) => {
    return fetchApi("/installations", {
      method: "POST",
      body: JSON.stringify(bookingData)
    });
  },
  updateBooking: async (id: number, bookingData: any) => {
    return fetchApi(`/installations/${id}`, {
      method: "PUT",
      body: JSON.stringify(bookingData)
    });
  },

  // Employees List
  getEmployees: async () => {
    return fetchApi("/employees");
  },
  createEmployee: async (employeeData: any) => {
    return fetchApi("/employees", {
      method: "POST",
      body: JSON.stringify(employeeData)
    });
  },
  updateEmployee: async (id: number, employeeData: any) => {
    return fetchApi(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(employeeData)
    });
  },
  deleteEmployee: async (id: number) => {
    return fetchApi(`/employees/${id}`, { method: "DELETE" });
  },

  // Roles
  getRoles: async () => {
    return fetchApi("/roles");
  },
  createRole: async (roleData: any) => {
    return fetchApi("/roles", {
      method: "POST",
      body: JSON.stringify(roleData)
    });
  },
  updateRole: async (id: number, roleData: any) => {
    return fetchApi(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(roleData)
    });
  },
  deleteRole: async (id: number) => {
    return fetchApi(`/roles/${id}`, { method: "DELETE" });
  },

  // Settings & Backups
  getSettings: async () => {
    return fetchApi("/settings");
  },
  updateSettings: async (settingsData: any) => {
    return fetchApi("/settings", {
      method: "PUT",
      body: JSON.stringify(settingsData)
    });
  },
  getBackupStatus: async () => {
    return fetchApi("/backup/status");
  },
  downloadBackup: async () => {
    return fetchApi("/backup/download");
  },
  restoreBackup: async (backupJson: any) => {
    return fetchApi("/backup/restore", {
      method: "POST",
      body: JSON.stringify(backupJson)
    });
  },

  // Audits & Reports
  getAudits: async () => {
    return fetchApi("/audits");
  },
  getSalesProfitStats: async () => {
    return fetchApi("/reports/sales-profits");
  },

  // Contracts
  getContracts: async () => {
    return fetchApi("/contracts");
  },
  createContract: async (contractData: any) => {
    return fetchApi("/contracts", {
      method: "POST",
      body: JSON.stringify(contractData)
    });
  },
  updateContract: async (id: number, contractData: any) => {
    return fetchApi(`/contracts/${id}`, {
      method: "PUT",
      body: JSON.stringify(contractData)
    });
  },
  deleteContract: async (id: number) => {
    return fetchApi(`/contracts/${id}`, { method: "DELETE" });
  },

  // Employee Accounting
  updateEmployeeSalary: async (id: number, monthlySalary: number, dailyWage: number) => {
    return fetchApi(`/employees/${id}/salary`, {
      method: "PUT",
      body: JSON.stringify({ monthlySalary, dailyWage })
    });
  },
  getEmployeeAccountingSummary: async () => {
    return fetchApi("/employee-accounting/summary");
  },
  getEmployeeAdvances: async (employeeId?: number) => {
    const qs = employeeId ? `?employeeId=${employeeId}` : '';
    return fetchApi(`/employee-accounting/advances${qs}`);
  },
  createEmployeeAdvance: async (data: any) => {
    return fetchApi("/employee-accounting/advances", { method: "POST", body: JSON.stringify(data) });
  },
  updateEmployeeAdvance: async (id: number, data: any) => {
    return fetchApi(`/employee-accounting/advances/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  repayEmployeeAdvance: async (id: number, data: { amount: number; date?: string; notes?: string }) => {
    return fetchApi(`/employee-accounting/advances/${id}/repay`, { method: "POST", body: JSON.stringify(data) });
  },
  deleteEmployeeAdvance: async (id: number) => {
    return fetchApi(`/employee-accounting/advances/${id}`, { method: "DELETE" });
  },
  getEmployeeTransactions: async (employeeId?: number) => {
    const qs = employeeId ? `?employeeId=${employeeId}` : '';
    return fetchApi(`/employee-accounting/transactions${qs}`);
  },
  createEmployeeTransaction: async (data: any) => {
    return fetchApi("/employee-accounting/transactions", { method: "POST", body: JSON.stringify(data) });
  },
  deleteEmployeeTransaction: async (id: number) => {
    return fetchApi(`/employee-accounting/transactions/${id}`, { method: "DELETE" });
  },
  getEmployeeAbsences: async (employeeId?: number) => {
    const qs = employeeId ? `?employeeId=${employeeId}` : '';
    return fetchApi(`/employee-accounting/absences${qs}`);
  },
  createEmployeeAbsence: async (data: any) => {
    return fetchApi("/employee-accounting/absences", { method: "POST", body: JSON.stringify(data) });
  },
  deleteEmployeeAbsence: async (id: number) => {
    return fetchApi(`/employee-accounting/absences/${id}`, { method: "DELETE" });
  },

  // HR Employees (independent)
  getHREmployees: async () => {
    return fetchApi("/employee-accounting/employees");
  },
  createHREmployee: async (data: any) => {
    return fetchApi("/employee-accounting/employees", { method: "POST", body: JSON.stringify(data) });
  },
  updateHREmployee: async (id: number, data: any) => {
    return fetchApi(`/employee-accounting/employees/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  deleteHREmployee: async (id: number) => {
    return fetchApi(`/employee-accounting/employees/${id}`, { method: "DELETE" });
  },

  // Archive
  getArchives: async () => {
    return fetchApi("/archive");
  },
  createArchive: async (archiveData: any) => {
    return fetchApi("/archive", {
      method: "POST",
      body: JSON.stringify(archiveData)
    });
  },
  updateArchive: async (id: number, archiveData: any) => {
    return fetchApi(`/archive/${id}`, {
      method: "PUT",
      body: JSON.stringify(archiveData)
    });
  },
  deleteArchive: async (id: number) => {
    return fetchApi(`/archive/${id}`, { method: "DELETE" });
  },

  // Inverter Exchanges & Loans
  getInverterExchanges: async () => {
    return fetchApi("/inverter-exchanges");
  },
  createInverterExchange: async (exchangeData: any) => {
    return fetchApi("/inverter-exchanges", {
      method: "POST",
      body: JSON.stringify(exchangeData)
    });
  },
  updateInverterExchange: async (id: number, exchangeData: any) => {
    return fetchApi(`/inverter-exchanges/${id}`, {
      method: "PUT",
      body: JSON.stringify(exchangeData)
    });
  },
  deleteInverterExchange: async (id: number) => {
    return fetchApi(`/inverter-exchanges/${id}`, { method: "DELETE" });
  },

  // Exchange Offices (حوالات)
  getExchangeOffices: async () => {
    return fetchApi("/exchange-offices");
  },
  createExchangeOffice: async (data: any) => {
    return fetchApi("/exchange-offices", { method: "POST", body: JSON.stringify(data) });
  },
  updateExchangeOffice: async (id: number, data: any) => {
    return fetchApi(`/exchange-offices/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  deleteExchangeOffice: async (id: number) => {
    return fetchApi(`/exchange-offices/${id}`, { method: "DELETE" });
  },
  getExchangeOfficeSummary: async (id: number) => {
    return fetchApi(`/exchange-offices/${id}/summary`);
  },
  getExchangeTransactions: async (officeId: number, params?: {
    page?: number; limit?: number; dateFrom?: string; dateTo?: string;
    type?: string; currency?: string; voucherNumber?: string; search?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.append('page', params.page.toString());
    if (params?.limit) qs.append('limit', params.limit.toString());
    if (params?.dateFrom) qs.append('dateFrom', params.dateFrom);
    if (params?.dateTo) qs.append('dateTo', params.dateTo);
    if (params?.type) qs.append('type', params.type);
    if (params?.currency) qs.append('currency', params.currency);
    if (params?.voucherNumber) qs.append('voucherNumber', params.voucherNumber);
    if (params?.search) qs.append('search', params.search);
    const q = qs.toString();
    return fetchApi(`/exchange-offices/${officeId}/transactions${q ? '?' + q : ''}`);
  },
  createExchangeTransaction: async (officeId: number, data: any) => {
    return fetchApi(`/exchange-offices/${officeId}/transactions`, { method: "POST", body: JSON.stringify(data) });
  },
  updateExchangeTransaction: async (txId: number, data: any) => {
    return fetchApi(`/exchange-offices/transactions/${txId}`, { method: "PUT", body: JSON.stringify(data) });
  },
  deleteExchangeTransaction: async (txId: number) => {
    return fetchApi(`/exchange-offices/transactions/${txId}`, { method: "DELETE" });
  },
  getExchangeOfficeReport: async (officeId: number, params?: { dateFrom?: string; dateTo?: string; currency?: string }) => {
    const qs = new URLSearchParams();
    if (params?.dateFrom) qs.append('dateFrom', params.dateFrom);
    if (params?.dateTo) qs.append('dateTo', params.dateTo);
    if (params?.currency) qs.append('currency', params.currency);
    const q = qs.toString();
    return fetchApi(`/exchange-offices/${officeId}/report${q ? '?' + q : ''}`);
  },
  getExchangeDashboard: async () => {
    return fetchApi("/exchange-offices/dashboard");
  },
  
  // ================= PRELIMINARY BOOKINGS =================
  getPreliminaryBookings: async () => {
    return fetchApi("/preliminary-bookings");
  },
  createPreliminaryBooking: async (data: any) => {
    return fetchApi("/preliminary-bookings", { method: "POST", body: JSON.stringify(data) });
  },
  deletePreliminaryBooking: async (id: number) => {
    return fetchApi(`/preliminary-bookings/${id}`, { method: "DELETE" });
  },
  updatePreliminaryBookingStatus: async (id: number, status: string) => {
    return fetchApi(`/preliminary-bookings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
  },
  updatePreliminaryBookingAdvanceStatus: async (id: number, advanceStatus: string) => {
    return fetchApi(`/preliminary-bookings/${id}/advance-status`, { method: "PUT", body: JSON.stringify({ advanceStatus }) });
  },
  updatePreliminaryBooking: async (id: number, data: any) => {
    return fetchApi(`/preliminary-bookings/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }
};
