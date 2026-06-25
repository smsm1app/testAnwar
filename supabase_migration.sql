-- تحديث جداول قاعدة البيانات لتعمل على Vercel بدلاً من الملفات المحلية

-- 1. جدول العمال (Installation Workers)
CREATE TABLE IF NOT EXISTS installation_workers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول محاسبة العمال (Worker Settlements)
CREATE TABLE IF NOT EXISTS worker_settlements (
  id SERIAL PRIMARY KEY,
  "workerId" INTEGER NOT NULL,
  "taskId" INTEGER NOT NULL,
  "taskType" TEXT DEFAULT 'booking',
  "settledAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "settledBy" TEXT
);

-- 3. جدول المهام (Task Assignments)
CREATE TABLE IF NOT EXISTS task_assignments (
  id SERIAL PRIMARY KEY,
  "taskId" INTEGER NOT NULL,
  "taskType" TEXT NOT NULL,
  "teamId" INTEGER NOT NULL,
  "assignedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "assignedBy" TEXT
);

-- 4. جدول الأدوار (Roles)
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. جدول العقود (Contracts)
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL,
  invoice_id INTEGER,
  system_type TEXT,
  panel_count INTEGER,
  panel_wattage TEXT,
  battery_count INTEGER,
  battery_type TEXT,
  inverter_type TEXT,
  contract_total NUMERIC,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  panel_warranty TEXT,
  battery_warranty TEXT,
  inverter_warranty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة الأدوار الافتراضية إذا لم تكن موجودة
INSERT INTO roles (id, name, description, is_system, permissions)
VALUES 
  (1, 'مدير النظام (Admin)', 'صلاحيات كاملة على جميع أقسام النظام', true, '{"dashboard":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"customers":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"products":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"inventory":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"sales":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"invoices":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"installments":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"maintenance":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"faults":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"installationTeams":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"installationBookings":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"contracts":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"reports":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"employees":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"settings":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"auditLogs":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"bankSettlement":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"backups":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true}}')
ON CONFLICT (id) DO 
  UPDATE SET permissions = '{"dashboard":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"customers":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"products":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"inventory":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"sales":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"invoices":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"installments":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"maintenance":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"faults":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"installationTeams":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"installationBookings":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"contracts":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"reports":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"employees":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"settings":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"auditLogs":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"bankSettlement":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true},"backups":{"view":true,"edit":true,"create":true,"delete":true,"export":true,"approve":true,"viewWidget":true}}';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_worker_settlements_worker_task ON worker_settlements ("workerId", "taskId");
CREATE INDEX IF NOT EXISTS idx_task_assignments_team_task ON task_assignments ("teamId", "taskId", "taskType");
CREATE INDEX IF NOT EXISTS idx_installation_bookings_team ON installation_bookings ("assigned_team_id");
