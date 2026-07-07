import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  const { data: contracts, error: err1 } = await supabase.from('contracts').select('*').limit(1);
  if (!contracts || contracts.length === 0) return console.log("No contracts found");
  
  const contractId = contracts[0].id;
  console.log("Original created_at:", contracts[0].created_at);

  const testDate = new Date("2025-01-01").toISOString();
  console.log("Updating to:", testDate);

  const { data, error } = await supabase.from('contracts').update({ created_at: testDate }).eq('id', contractId).select().single();
  console.log("Error:", error);
  console.log("Updated created_at:", data?.created_at);
}

test();
