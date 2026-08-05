-- إنشاء جدول الحجوزات المبدئية
CREATE TABLE IF NOT EXISTS preliminary_bookings (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(255) NOT NULL,
    total_amount VARCHAR(255),
    system_size VARCHAR(255),
    panel_details VARCHAR(255),
    battery_details VARCHAR(255),
    inverter_details VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    has_advance_payment BOOLEAN DEFAULT FALSE,
    advance_amount VARCHAR(255),
    payment_method VARCHAR(50),
    advance_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- تحديث الجدول الحالي إذا كان موجوداً مسبقاً لإضافة أعمدة المقدمة
ALTER TABLE preliminary_bookings ADD COLUMN IF NOT EXISTS has_advance_payment BOOLEAN DEFAULT FALSE;
ALTER TABLE preliminary_bookings ADD COLUMN IF NOT EXISTS advance_amount VARCHAR(255);
ALTER TABLE preliminary_bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE preliminary_bookings ADD COLUMN IF NOT EXISTS advance_status VARCHAR(50);
