const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const endpointsToPaginate = [
  {
    find: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('customers').select('*').eq('is_deleted', false).order('id', { ascending: false }).limit(limit);",
    replace: `
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string || '').trim();
  
  let query = supabase.from('customers').select('*', { count: 'exact' }).eq('is_deleted', false);
  
  if (search) {
    const safeSearch = search.replace(/[,()\\"\\\\%]/g, ' ').replace(/\\s+/g, ' ').trim();
    if (safeSearch) query = query.or(\`name.ilike.%\${safeSearch}%,phone.ilike.%\${safeSearch}%\`);
  }
  
  const { data, error, count } = await query
    .order('id', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
    
  if (error) return res.status(500).json({ error: error.message });
  
  if (req.query.page) return res.json({ data: (data || []).map(mapCustomer), total: count || 0, page, limit });
  return res.json((data || []).map(mapCustomer)); // fallback for non-paginated clients
`
  },
  {
    find: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('products').select('*').eq('is_deleted', false).order('id', { ascending: false }).limit(limit);",
    replace: `
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string || '').trim();
  
  let query = supabase.from('products').select('*', { count: 'exact' }).eq('is_deleted', false);
  
  if (search) {
    const safeSearch = search.replace(/[,()\\"\\\\%]/g, ' ').replace(/\\s+/g, ' ').trim();
    if (safeSearch) query = query.or(\`name.ilike.%\${safeSearch}%,sku.ilike.%\${safeSearch}%\`);
  }
  
  const { data, error, count } = await query
    .order('id', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
    
  if (error) return res.status(500).json({ error: error.message });
  
  if (req.query.page) return res.json({ data: (data || []).map(mapProduct), total: count || 0, page, limit });
  return res.json((data || []).map(mapProduct));
`
  },
  {
    find: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('invoices').select('*').order('id', { ascending: false }).limit(limit);",
    replace: `
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string || '').trim();
  
  let query = supabase.from('invoices').select('*', { count: 'exact' });
  
  if (search) {
    const safeSearch = search.replace(/[,()\\"\\\\%]/g, ' ').replace(/\\s+/g, ' ').trim();
    if (safeSearch) query = query.or(\`invoice_number.ilike.%\${safeSearch}%,customer_name.ilike.%\${safeSearch}%\`);
  }
  
  const { data, error, count } = await query
    .order('id', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
    
  if (error) return res.status(500).json({ error: error.message });
  
  if (req.query.page) return res.json({ data: (data || []).map(mapInvoice), total: count || 0, page, limit });
  return res.json((data || []).map(mapInvoice));
`
  }
];

let replacedCount = 0;
endpointsToPaginate.forEach(r => {
  if (code.includes(r.find)) {
    code = code.replace(r.find, r.replace.trim());
    replacedCount++;
  } else {
    console.log("Could not find:", r.find.substring(0, 50) + "...");
  }
});

fs.writeFileSync('api/index.ts', code);
console.log('Advanced pagination applied to', replacedCount, 'endpoints.');
