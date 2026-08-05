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

-- 6. جدول أجور العمال لكل مهمة (Worker Payments)
CREATE TABLE IF NOT EXISTS worker_payments (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL,
  worker_name TEXT NOT NULL,
  task_id INTEGER NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'booking',
  amount NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- إضافة حقل المبلغ لجدول المحاسبات الموجود
ALTER TABLE worker_settlements ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_worker_settlements_worker_task ON worker_settlements ("workerId", "taskId");
CREATE INDEX IF NOT EXISTS idx_task_assignments_team_task ON task_assignments ("teamId", "taskId", "taskType");
CREATE INDEX IF NOT EXISTS idx_installation_bookings_team ON installation_bookings ("assigned_team_id");
CREATE INDEX IF NOT EXISTS idx_worker_payments_worker ON worker_payments (worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_task ON worker_payments (task_id, task_type);

-- ==================== محاسبة الموظفين ====================

-- إضافة حقول الراتب لجدول المستخدمين
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_wage NUMERIC DEFAULT 0;

-- جدول السلف
CREATE TABLE IF NOT EXISTS employee_advances (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  daily_wage NUMERIC NOT NULL DEFAULT 0,
  repayment_days INTEGER NOT NULL DEFAULT 0,
  advance_date DATE NOT NULL,
  expected_completion DATE,
  amount_repaid NUMERIC NOT NULL DEFAULT 0,
  remaining NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active / completed
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول السجل المالي
CREATE TABLE IF NOT EXISTS employee_transactions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  employee_name TEXT NOT NULL,
  type TEXT NOT NULL, -- salary / advance / deduction / bonus
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  remaining_advance NUMERIC DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الغيابات
CREATE TABLE IF NOT EXISTS employee_absences (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  employee_name TEXT NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_advances_employee ON employee_advances (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_advances_status ON employee_advances (status);
CREATE INDEX IF NOT EXISTS idx_employee_transactions_employee ON employee_transactions (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_transactions_date ON employee_transactions (date);
CREATE INDEX IF NOT EXISTS idx_employee_absences_employee ON employee_absences (employee_id, date);

-- ==================== قسم الأرشيف (Archive) ====================
CREATE TABLE IF NOT EXISTS archive_records (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  installation_date DATE,
  system_size TEXT,
  customer_phone TEXT,
  inverter_size TEXT,
  batteries_count TEXT,
  panels_count TEXT,
  installation_location TEXT,
  notes TEXT,
  price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تحديث جدول الأرشيف بحقل السعر المستقل
ALTER TABLE archive_records ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- تحديث جداول الصيانة لاستيعاب ربط العميل من الأرشيف
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS archive_id INTEGER;
ALTER TABLE fault_requests ADD COLUMN IF NOT EXISTS archive_id INTEGER;

-- تحديث جدول طواقم التركيب بحقول العدة وتفاصيل السيارة
ALTER TABLE installation_teams ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE installation_teams ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE installation_teams ADD COLUMN IF NOT EXISTS vehicle_notes TEXT;
ALTER TABLE installation_teams ADD COLUMN IF NOT EXISTS equipment JSONB DEFAULT '[]'::jsonb;

-- ==================== كروت وصرفيات طواقم التركيب ====================
CREATE TABLE IF NOT EXISTS team_expense_cards (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES installation_teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  card_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_expense_items (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES team_expense_cards(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  item_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_expense_cards_team ON team_expense_cards (team_id);
CREATE INDEX IF NOT EXISTS idx_team_expense_items_card ON team_expense_items (card_id);



