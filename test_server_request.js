import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  const { data: user } = await supabase.from('users').select('id').eq('username', 'admin').single();
  
  const token = 'shams_test_' + crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  await supabase.from('sessions').insert({
    token,
    user_id: user.id,
    expires_at: expiresAt
  });
  
  const res = await fetch('http://localhost:3000/api/products', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Status:', res.status);
  const text = await res.text();
  if (res.status !== 200) {
    console.log('Error:', text);
  } else {
    console.log('Success, length:', text.length);
  }
}
test();
