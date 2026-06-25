/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export type PermissionKey =
  | 'dashboard'
  | 'customers'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'invoices'
  | 'installments'
  | 'bankSettlement'
  | 'maintenance'
  | 'faults'
  | 'installationTeams'
  | 'installationBookings'
  | 'reports'
  | 'employees'
  | 'settings'
  | 'auditLogs'
  | 'backups'
  | 'contracts';

export interface User {
  id: number;
  name: string;
  username: string;
  passwordHash: string;
  phone: string;
  position: string;
  status: 'active' | 'inactive';
  permissions: Record<PermissionKey, Permission>;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  secondaryPhone?: string;
  address: string;
  mapsLink?: string;
  gpsCoords?: string;
  notes?: string;
  isDeleted?: boolean;
}

export interface Category {
  id: number;
  name: string;
  isDeleted?: boolean;
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  sku: string;
  purchasePrice: number; // IQD
  sellingPrice: number;  // IQD
  quantity: number;
  minStockAlert: number;
  notes?: string;
  status: 'active' | 'disabled';
  image?: string;
  warrantyMonths?: number;
  isDeleted?: boolean;
}

export interface InventoryMovement {
  id: number;
  productId: number;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  prevQuantity: number;
  newQuantity: number;
  reason: string;
  user: string;
  date: string;
}

export interface InvoiceItem {
  productId: number;
  name: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  invoiceType: 'cash' | 'partial' | 'installment' | 'mastercard';
  items: InvoiceItem[];
  totalAmount: number; // Sum of sellingPrice * quantity
  discount: number;     // in IQD
  finalAmount: number;  // totalAmount - discount
  remainingAmount: number; // Relevant for installment sales
  createdBy: string;
  date: string;
  status: 'active' | 'cancelled';
  cancellationReason?: string;
  cancelledBy?: string;
  notes?: string;
  deliveryProofImage?: string;
  paidAmount?: number;
}

export interface PartialPayment {
  id: number;
  invoiceId: number;
  amount: number;
  date: string;
  notes?: string;
  user: string;
}

export interface InstallmentSchedule {
  id: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  paymentDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  notes?: string;
}

export interface MasterCardWithdrawal {
  id: number;
  amount: number;
  withdrawalDate: string;
  notes?: string;
}

export interface InstallmentRecord {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  type: 'normal' | 'mastercard';
  installments: InstallmentSchedule[];
  withdrawals: MasterCardWithdrawal[]; // Section 2 MasterCard features
  notes?: string;
}

export interface MaintenanceRequest {
  id: number;
  requestNumber: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string;
  photos: string[];
  createdDate: string;
  assignedEmployee: string;
  status: 'new' | 'inprogress' | 'repaired' | 'closed';
}

export interface FaultRequest {
  id: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  faultType: string;
  description: string;
  photos: string[];
  notes?: string;
  status: 'new' | 'inprogress' | 'repaired' | 'closed';
  createdDate: string;
}

export interface InstallationTeam {
  id: number;
  name: string;
  leader: string;
  members: string[];
  isDeleted?: boolean;
}

export interface InstallationBooking {
  id: number;
  customerId: number;
  customerName: string;
  invoiceId: number;
  invoiceNumber: string;
  assignedTeamId: number;
  assignedTeamName: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  notes?: string;
  status: 'scheduled' | 'rescheduled' | 'cancelled' | 'completed';
}

export interface AuditLog {
  id: number;
  user: string;
  date: string;
  time: string;
  action: string;
  affectedRecord: string;
  ipAddress: string;
}

export interface Settings {
  companyName: string;
  companyLogo: string;
  companyPhone: string;
  companyAddress: string;
  invoiceTemplate: string;
  installmentReminderTemplate: string;
  autoBackupEnabled: boolean;
  backupInterval: string;
}

export interface Contract {
  id: number;
  contractNumber: string;
  customerId: number;
  invoiceId?: number;
  systemType: string;
  panelCount: number;
  panelWattage: string;
  batteryCount: number;
  batteryType: string;
  inverterType: string;
  contractTotal: number;
  paidAmount: number;
  remainingAmount: number;
  panelWarranty: string;
  batteryWarranty: string;
  inverterWarranty: string;
  createdAt: string;
  updatedAt?: string;
  // Included fields via join usually
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}

