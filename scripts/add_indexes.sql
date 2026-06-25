-- Performance Optimization Indexes
-- Run these commands in Supabase SQL Editor

-- Customers Table Indexes
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);

-- Invoices Table Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name ON public.invoices USING gin (customer_name gin_trgm_ops);

-- Contracts Table Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_number ON public.contracts (contract_number);

-- Products Table Indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products USING gin (name gin_trgm_ops);

-- Additional Helpful Indexes for Dashboard Performance
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_requests (status);
CREATE INDEX IF NOT EXISTS idx_faults_status ON public.fault_requests (status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.installation_bookings (appointment_date);
CREATE INDEX IF NOT EXISTS idx_invoices_type_status ON public.invoices (invoice_type, status);
