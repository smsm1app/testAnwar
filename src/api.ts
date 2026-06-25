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
  }
};
