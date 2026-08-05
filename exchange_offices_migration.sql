-- ==================== حوالات - Money Transfers / Exchange Offices ====================

-- 1. جدول الصيرفات (Exchange Offices)
CREATE TABLE IF NOT EXISTS exchange_offices (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  address TEXT,
  notes TEXT,
  initial_balance_iqd NUMERIC DEFAULT 0,
  initial_balance_usd NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active', -- active / inactive
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول حركات الحوالات (Exchange Transactions / Universal Ledger)
CREATE TABLE IF NOT EXISTS exchange_transactions (
  id SERIAL PRIMARY KEY,
  office_id INTEGER NOT NULL REFERENCES exchange_offices(id) ON DELETE CASCADE,
  voucher_number TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- receive_cash, pay_cash, transfer, deposit, withdrawal, commission, adjustment, manual_entry, opening_balance, closing_balance, internal_transfer
  description TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'IQD', -- IQD / USD
  direction TEXT NOT NULL, -- credit (له) / debit (عليه)
  running_balance NUMERIC DEFAULT 0,
  reference TEXT,
  source_module TEXT, -- For future linking: invoices, sales, maintenance, contracts, etc.
  source_id INTEGER, -- ID from source module
  attachments TEXT[] DEFAULT '{}',
  notes TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_exchange_offices_status ON exchange_offices (status);
CREATE INDEX IF NOT EXISTS idx_exchange_tx_office ON exchange_transactions (office_id);
CREATE INDEX IF NOT EXISTS idx_exchange_tx_date ON exchange_transactions (office_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_exchange_tx_type ON exchange_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_exchange_tx_voucher ON exchange_transactions (voucher_number);
CREATE INDEX IF NOT EXISTS idx_exchange_tx_currency ON exchange_transactions (office_id, currency);
CREATE INDEX IF NOT EXISTS idx_exchange_tx_source ON exchange_transactions (source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_exchange_tx_created ON exchange_transactions (created_at DESC);
