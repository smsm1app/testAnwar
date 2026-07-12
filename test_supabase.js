import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  const { data, error } = await supabase.from('products').insert({
    name: 'Test Sequence',
    category_id: 1,
    sku: 'TEST-SEQ-123',
    purchase_price: 1,
    selling_price: 1,
    quantity: 1
  }).select();
  
  if (error) {
    console.log('Insert Error:', error);
  } else {
    console.log('Insert Succeeded! ID:', data[0].id);
    await supabase.from('products').delete().eq('id', data[0].id);
  }
}
test();
