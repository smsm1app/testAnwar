-- إضافة عميل الدفعة النقدية المقدمة لفواتير الماستر كارد
ALTER TABLE invoices ADD COLUMN pos_cash_advance NUMERIC DEFAULT 0;
