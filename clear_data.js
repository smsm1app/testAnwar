import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

import ws from 'ws';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function clearData() {
  console.log("Clearing installment_records...");
  let res = await supabase.from('installment_records').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing installation_bookings...");
  res = await supabase.from('installation_bookings').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing maintenance_requests...");
  res = await supabase.from('maintenance_requests').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing fault_requests...");
  res = await supabase.from('fault_requests').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing partial_payments...");
  res = await supabase.from('partial_payments').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing invoices...");
  res = await supabase.from('invoices').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing customers...");
  res = await supabase.from('customers').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing bank_withdrawals...");
  res = await supabase.from('bank_withdrawals').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing contracts...");
  res = await supabase.from('contracts').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing inventory_movements...");
  res = await supabase.from('inventory_movements').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing audit_logs...");
  res = await supabase.from('audit_logs').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing worker_settlements...");
  res = await supabase.from('worker_settlements').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Clearing task_assignments...");
  res = await supabase.from('task_assignments').delete().neq('id', 0);
  console.log(res.error || 'Success');

  console.log("Done!");
}

clearData().catch(console.error);
