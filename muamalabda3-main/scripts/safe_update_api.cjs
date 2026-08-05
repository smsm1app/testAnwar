const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const dashboardSummaryCode = `
// ==================== DASHBOARD SUMMARY ====================
app.get('/api/dashboard/summary', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    const [
      invoicesTodayRes,
      latestInvoicesRes,
      latestCustomersRes,
      latestBookingsRes,
      maintenanceRes,
      faultsRes,
      latestAuditsRes,
      bankRes,
      backupRes
    ] = await Promise.all([
      supabase.from('invoices').select('final_amount, profit_amount').gte('date', todayStr).eq('status', 'active'),
      supabase.from('invoices').select('*').order('id', { ascending: false }).limit(5),
      supabase.from('customers').select('*').eq('is_deleted', false).order('id', { ascending: false }).limit(5),
      supabase.from('installation_bookings').select('*').gte('appointment_date', todayStr).limit(5),
      supabase.from('maintenance_requests').select('*').in('status', ['new', 'inprogress']).limit(10),
      supabase.from('fault_requests').select('*').in('status', ['new', 'inprogress']).limit(10),
      supabase.from('audit_logs').select('*').order('id', { ascending: false }).limit(5),
      supabase.from('invoices').select('final_amount').eq('invoice_type', 'mastercard').eq('status', 'active'),
      supabase.from('system_settings').select('last_backup_date').maybeSingle()
    ]);

    const salesToday = (invoicesTodayRes.data || []).reduce((acc, curr) => acc + (parseFloat(curr.final_amount) || 0), 0);
    const profitToday = (invoicesTodayRes.data || []).reduce((acc, curr) => acc + (parseFloat(curr.profit_amount) || 0), 0);

    const totalMasterCard = (bankRes.data || []).reduce((acc, curr) => acc + (parseFloat(curr.final_amount) || 0), 0);

    res.json({
      stats: {
        today: { sales: salesToday, profit: profitToday },
        lateInstallmentsCount: 0,
        overdueInstallments: [],
        lowStockAlertsCount: 0,
        lowStockProducts: []
      },
      latestInvoices: latestInvoicesRes.data,
      latestCustomers: latestCustomersRes.data,
      upcomingBookings: latestBookingsRes.data,
      activeMaintenance: maintenanceRes.data,
      activeFaults: faultsRes.data,
      latestAudits: latestAuditsRes.data,
      bankSettlementSummary: {
        totalMasterCard,
        totalWithdrawn: 0,
        remainingBalance: totalMasterCard
      },
      lastBackupTime: backupRes.data?.last_backup_date || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

if (!code.includes('/api/dashboard/summary')) {
  code = code.replace('export default app;', dashboardSummaryCode + '\nexport default app;');
}

const replacements = [
  {
    search: "const { data, error } = await supabase.from('customers').select('*').eq('is_deleted', false).order('id');",
    replace: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('customers').select('*').eq('is_deleted', false).order('id', { ascending: false }).limit(limit);"
  },
  {
    search: "const { data, error } = await supabase.from('products').select('*').eq('is_deleted', false).order('id');",
    replace: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('products').select('*').eq('is_deleted', false).order('id', { ascending: false }).limit(limit);"
  },
  {
    search: "const { data, error } = await supabase.from('invoices').select('*').order('id', { ascending: false });",
    replace: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('invoices').select('*').order('id', { ascending: false }).limit(limit);"
  },
  {
    search: "const { data, error } = await supabase.from('maintenance_requests').select('*').order('id', { ascending: false });",
    replace: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('maintenance_requests').select('*').order('id', { ascending: false }).limit(limit);"
  },
  {
    search: "const { data, error } = await supabase.from('fault_requests').select('*').order('id', { ascending: false });",
    replace: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('fault_requests').select('*').order('id', { ascending: false }).limit(limit);"
  },
  {
    search: "const { data, error } = await supabase.from('contracts').select('*').order('id', { ascending: false });",
    replace: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('contracts').select('*').order('id', { ascending: false }).limit(limit);"
  },
  {
    search: "const { data, error } = await supabase.from('installment_records').select('*').order('id', { ascending: false });",
    replace: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('installment_records').select('*').order('id', { ascending: false }).limit(limit);"
  },
  {
    search: "const { data, error } = await supabase.from('users').select('id,name,username,phone,position,status,permissions,created_at').order('id');",
    replace: "const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; const { data, error } = await supabase.from('users').select('id,name,username,phone,position,status,permissions,created_at').order('id', { ascending: false }).limit(limit);"
  }
];

replacements.forEach(r => {
  if (code.includes(r.search)) {
    code = code.replace(r.search, r.replace);
  } else {
    console.warn('Could not find string to replace: ' + r.search);
  }
});

fs.writeFileSync('api/index.ts', code);
console.log('Update finished successfully.');
