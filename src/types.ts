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
  showProfitMargin?: boolean;
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
  | 'contracts'
  | 'archive'
  | 'employeeAccounting'
  | 'moneyTransfers';

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
  archiveId?: number;
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
  archiveId?: number;
  faultType: string;
  description: string;
  photos: string[];
  notes?: string;
  status: 'new' | 'inprogress' | 'repaired' | 'closed';
  createdDate: string;
}

export interface TeamEquipmentItem {
  id?: string | number;
  name: string;
  quantity: number | string;
  notes?: string;
}

export interface InstallationTeam {
  id: number;
  name: string;
  leader: string;
  members: string[];
  vehicle?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  vehicleNotes?: string;
  equipment?: TeamEquipmentItem[];
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
  createdAt?: string;
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
  inverterCount?: number;
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

export interface ArchiveRecord {
  id: number;
  customerId?: number;
  customerName: string;
  installationDate?: string;
  systemSize?: string;
  customerPhone?: string;
  inverterSize?: string;
  batteriesCount?: string;
  panelsCount?: string;
  installationLocation?: string;
  notes?: string;
  price?: number;
  createdAt?: string;
}

export interface TeamExpenseItem {
  id: number;
  cardId: number;
  description: string;
  amount: number;
  itemDate: string;
  createdBy?: string;
  createdAt?: string;
}

export interface TeamExpenseCard {
  id: number;
  teamId: number;
  title: string;
  totalAmount: number;
  cardDate: string;
  notes?: string;
  spentAmount: number;
  remainingAmount: number;
  items: TeamExpenseItem[];
  createdBy?: string;
  createdAt?: string;
}

export type ExchangeTransactionType =
  | 'receive_cash'
  | 'pay_cash'
  | 'transfer'
  | 'deposit'
  | 'withdrawal'
  | 'commission'
  | 'adjustment'
  | 'manual_entry'
  | 'opening_balance'
  | 'closing_balance'
  | 'internal_transfer';

export interface ExchangeOffice {
  id: number;
  name: string;
  phone?: string;
  city?: string;
  address?: string;
  notes?: string;
  initialBalanceIqd: number;
  initialBalanceUsd: number;
  status: 'active' | 'inactive';
  createdBy?: string;
  createdAt?: string;
}

export interface ExchangeTransaction {
  id: number;
  officeId: number;
  voucherNumber: string;
  transactionType: ExchangeTransactionType;
  description?: string;
  amount: number;
  currency: 'IQD' | 'USD';
  direction: 'credit' | 'debit';
  runningBalance: number;
  reference?: string;
  sourceModule?: string;
  sourceId?: number;
  attachments?: string[];
  notes?: string;
  transactionDate: string;
  createdBy?: string;
  createdAt?: string;
}
