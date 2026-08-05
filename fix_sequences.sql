-- ==========================================================
-- Migration: Repair PostgreSQL SERIAL / IDENTITY Sequences
-- ==========================================================
-- This script resets all table sequence counters to match the 
-- maximum existing primary key ID in each table. Run this in the 
-- Supabase SQL Editor if data was imported or restored with explicit IDs.

-- 1. audit_logs
SELECT setval(pg_get_serial_sequence('audit_logs', 'id'), COALESCE((SELECT MAX(id) FROM audit_logs), 1));

-- 2. customers
SELECT setval(pg_get_serial_sequence('customers', 'id'), COALESCE((SELECT MAX(id) FROM customers), 1));

-- 3. products
SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1));

-- 4. invoices
SELECT setval(pg_get_serial_sequence('invoices', 'id'), COALESCE((SELECT MAX(id) FROM invoices), 1));

-- 5. installment_records
SELECT setval(pg_get_serial_sequence('installment_records', 'id'), COALESCE((SELECT MAX(id) FROM installment_records), 1));

-- 6. installation_teams
SELECT setval(pg_get_serial_sequence('installation_teams', 'id'), COALESCE((SELECT MAX(id) FROM installation_teams), 1));

-- 7. installation_bookings
SELECT setval(pg_get_serial_sequence('installation_bookings', 'id'), COALESCE((SELECT MAX(id) FROM installation_bookings), 1));

-- 8. maintenance_requests
SELECT setval(pg_get_serial_sequence('maintenance_requests', 'id'), COALESCE((SELECT MAX(id) FROM maintenance_requests), 1));

-- 9. fault_requests
SELECT setval(pg_get_serial_sequence('fault_requests', 'id'), COALESCE((SELECT MAX(id) FROM fault_requests), 1));

-- 10. partial_payments
SELECT setval(pg_get_serial_sequence('partial_payments', 'id'), COALESCE((SELECT MAX(id) FROM partial_payments), 1));

-- 11. bank_withdrawals
SELECT setval(pg_get_serial_sequence('bank_withdrawals', 'id'), COALESCE((SELECT MAX(id) FROM bank_withdrawals), 1));

-- 12. contracts
SELECT setval(pg_get_serial_sequence('contracts', 'id'), COALESCE((SELECT MAX(id) FROM contracts), 1));

-- 13. roles
SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE((SELECT MAX(id) FROM roles), 1));

-- 14. installation_workers
SELECT setval(pg_get_serial_sequence('installation_workers', 'id'), COALESCE((SELECT MAX(id) FROM installation_workers), 1));

-- 15. worker_settlements
SELECT setval(pg_get_serial_sequence('worker_settlements', 'id'), COALESCE((SELECT MAX(id) FROM worker_settlements), 1));

-- 16. task_assignments
SELECT setval(pg_get_serial_sequence('task_assignments', 'id'), COALESCE((SELECT MAX(id) FROM task_assignments), 1));

-- 17. worker_payments
SELECT setval(pg_get_serial_sequence('worker_payments', 'id'), COALESCE((SELECT MAX(id) FROM worker_payments), 1));

-- 18. inventory_movements
SELECT setval(pg_get_serial_sequence('inventory_movements', 'id'), COALESCE((SELECT MAX(id) FROM inventory_movements), 1));

-- 19. team_expense_cards
SELECT setval(pg_get_serial_sequence('team_expense_cards', 'id'), COALESCE((SELECT MAX(id) FROM team_expense_cards), 1));

-- 20. team_expense_items
SELECT setval(pg_get_serial_sequence('team_expense_items', 'id'), COALESCE((SELECT MAX(id) FROM team_expense_items), 1));

-- 21. inverter_exchanges
SELECT setval(pg_get_serial_sequence('inverter_exchanges', 'id'), COALESCE((SELECT MAX(id) FROM inverter_exchanges), 1));

