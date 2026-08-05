const fs = require('fs');

let code = fs.readFileSync('api/index.ts', 'utf8');

// A quick and dirty way to inject pagination without a full AST parser for this specific file.
// We know that most GET routes look like: app.get('/api/customers', authenticate, async (req: any, res) => {
//   ...
//   const { data, error } = await supabase.from('customers').select('*')....;
// We can use a regex to inject pagination logic.

const endpoints = [
  'customers', 'products', 'invoices', 'categories', 'employees', 'maintenance-requests', 'fault-requests',
  'contracts', 'installment-records', 'installation-bookings'
];

// Instead of complex AST, let's just globally replace `.order('id')` with `.limit(parseInt(req.query.limit) || 50).order('id')`
// This will enforce a limit of 50 on all endpoints unless specified, preventing the 15-second load.

// Wait, some don't have .order('id'). We can just replace `.select('*')` with `.select('*').limit(parseInt(req.query.limit as string) || 100)`
// and `.select('id,name,username,phone,position,status,permissions,created_at')` similarly.
// This is very safe and prevents massive payload sizes.

code = code.replace(/\.select\('\*'\)/g, ".select('*').limit(req.query?.limit ? parseInt(req.query.limit) : 500)");
code = code.replace(/\.select\('id,name,username,phone,position,status,permissions,created_at'\)/g, ".select('id,name,username,phone,position,status,permissions,created_at').limit(req.query?.limit ? parseInt(req.query.limit) : 500)");

// Write it back
fs.writeFileSync('api/index.ts', code);
console.log('Pagination limits injected successfully');
