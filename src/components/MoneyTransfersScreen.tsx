import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import {
  Banknote, DollarSign, TrendingDown, TrendingUp, CheckCircle,
  Plus, Search, Trash2, Edit3, AlertCircle, X,
  Calendar, FileText, BarChart3, Building, RefreshCcw,
  Save, Printer, Download, Filter, Phone, MapPin, 
  ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import type { ExchangeOffice, ExchangeTransaction, ExchangeTransactionType } from '../types';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <div className="glass-card rounded-[1.5rem] p-5 flex flex-col gap-3 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:scale-150 transition-transform duration-700" style={{ backgroundColor: color }}></div>
      <div className="flex justify-between items-start relative z-10">
        <div>
          <div className="text-slate-500 text-xs font-bold mb-1.5 tracking-wide">{title}</div>
          <div className="text-slate-900 text-xl font-black">{value}</div>
          {sub && <div className="text-slate-400 text-xs mt-1">{sub}</div>}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: color + '18' }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );
}

// ─── Transaction Type Config ──────────────────────────────────────────────────
const TX_TYPES: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  receive_cash:    { label: 'قبض نقدي (له)',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: ArrowDownToLine },
  pay_cash:        { label: 'صرف نقدي (عليه)',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: ArrowUpFromLine },
  transfer:        { label: 'حوالة (له)',        color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: ArrowRightLeft },
  opening_balance: { label: 'رصيد افتتاحي (يدوي)', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)', icon: Banknote },
};

const TABS = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: BarChart3 },
  { id: 'offices',   label: 'الصيرفات',    icon: Building },
  { id: 'ledger',    label: 'كشف حساب',    icon: FileText },
  { id: 'reports',   label: 'التقارير',    icon: Printer },
];

export default function MoneyTransfersScreen({ permissions }: { permissions: any }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data States
  const [offices, setOffices] = useState<ExchangeOffice[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  
  // Ledger States
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | ''>('');
  const [officeSummary, setOfficeSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<ExchangeTransaction[]>([]);
  const [totalTx, setTotalTx] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLimit] = useState(50);
  const [ledgerDateFrom, setLedgerDateFrom] = useState('');
  const [ledgerDateTo, setLedgerDateTo] = useState('');
  const [ledgerType, setLedgerType] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  
  // Report States
  const [reportData, setReportData] = useState<any>(null);
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportCurrency, setReportCurrency] = useState('IQD');

  // UI States
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modals
  const [showOfficeForm, setShowOfficeForm] = useState(false);
  const [editOffice, setEditOffice] = useState<ExchangeOffice | null>(null);
  const [officeForm, setOfficeForm] = useState({ name: '', phone: '', city: '', address: '', notes: '', initialBalanceIqd: '', initialBalanceUsd: '', status: 'active' });

  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ transactionType: 'receive_cash', amount: '', currency: 'IQD', direction: 'credit', description: '', reference: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' });

  const canCreate = permissions?.moneyTransfers?.create;
  const canEdit   = permissions?.moneyTransfers?.edit;
  const canDelete = permissions?.moneyTransfers?.delete;

  // ─── Initial Load ─────────────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, offRes] = await Promise.all([
        api.getExchangeDashboard(),
        api.getExchangeOffices()
      ]);
      setDashboard(dashRes);
      setOffices(Array.isArray(offRes) ? offRes : []);
    } catch (e: any) {
      toast.error(e.message || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const currentRequestId = useRef(0);
  // ─── Load Ledger ──────────────────────────────────────────────────────────────
  const loadLedger = useCallback(async () => {
    if (!selectedOfficeId) return;
    const reqId = ++currentRequestId.current;
    setLoadingLedger(true);
    try {
      const [sumRes, txRes] = await Promise.all([
        api.getExchangeOfficeSummary(selectedOfficeId as number),
        api.getExchangeTransactions(selectedOfficeId as number, {
          page: ledgerPage, limit: ledgerLimit,
          dateFrom: ledgerDateFrom, dateTo: ledgerDateTo,
          type: ledgerType, search: ledgerSearch
        })
      ]);
      if (currentRequestId.current === reqId) {
        setOfficeSummary(sumRes);
        setTransactions(txRes.data || []);
        setTotalTx(txRes.total || 0);
      }
    } catch (e: any) {
      if (currentRequestId.current === reqId) toast.error(e.message || 'خطأ في تحميل كشف الحساب');
    } finally {
      if (currentRequestId.current === reqId) setLoadingLedger(false);
    }
  }, [selectedOfficeId, ledgerPage, ledgerLimit, ledgerDateFrom, ledgerDateTo, ledgerType, ledgerSearch]);

  useEffect(() => {
    if (activeTab === 'ledger' && selectedOfficeId) {
      loadLedger();
    }
  }, [activeTab, selectedOfficeId, ledgerPage, ledgerDateFrom, ledgerDateTo, ledgerType, loadLedger]);

  // ─── Load Report ──────────────────────────────────────────────────────────────
  const loadReport = async () => {
    if (!selectedOfficeId) { toast.error('يرجى اختيار صيرفة'); return; }
    try {
      setLoadingLedger(true);
      const res = await api.getExchangeOfficeReport(selectedOfficeId as number, {
        dateFrom: reportDateFrom, dateTo: reportDateTo, currency: reportCurrency
      });
      setReportData(res);
    } catch (e: any) {
      toast.error(e.message || 'خطأ في تحميل التقرير');
    } finally {
      setLoadingLedger(false);
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const openOfficeForm = (off?: ExchangeOffice) => {
    if (!canCreate && !off) { toast.error('ليس لديك صلاحية للإضافة'); return; }
    if (!canEdit && off) { toast.error('ليس لديك صلاحية للتعديل'); return; }
    setEditOffice(off || null);
    if (off) {
      setOfficeForm({ 
        name: off.name, phone: off.phone || '', city: off.city || '', 
        address: off.address || '', notes: off.notes || '', 
        initialBalanceIqd: '', initialBalanceUsd: '', status: off.status 
      });
    } else {
      setOfficeForm({ name: '', phone: '', city: '', address: '', notes: '', initialBalanceIqd: '', initialBalanceUsd: '', status: 'active' });
    }
    setShowOfficeForm(true);
  };

  const saveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officeForm.name.trim()) { toast.error('الاسم مطلوب'); return; }
    setSaving(true);
    try {
      if (editOffice) {
        await api.updateExchangeOffice(editOffice.id, officeForm);
        toast.success('تم التعديل بنجاح');
      } else {
        await api.createExchangeOffice(officeForm);
        toast.success('تمت الإضافة بنجاح');
      }
      setShowOfficeForm(false);
      loadInitial();
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const delOffice = async (id: number) => {
    if (!canDelete) { toast.error('ليس لديك صلاحية للحذف'); return; }
    if (!window.confirm('هل أنت متأكد من حذف هذه الصيرفة؟ سيتم حذف جميع الحركات المالية المرتبطة بها نهائياً!')) return;
    try {
      await api.deleteExchangeOffice(id);
      toast.success('تم الحذف');
      if (selectedOfficeId === id) setSelectedOfficeId('');
      loadInitial();
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    }
  };

  const openTxForm = () => {
    if (!canCreate) { toast.error('ليس لديك صلاحية للإضافة'); return; }
    if (!selectedOfficeId) { toast.error('يرجى تحديد صيرفة أولاً'); return; }
    setTxForm({ transactionType: 'receive_cash', amount: '', currency: 'IQD', direction: 'credit', description: '', reference: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' });
    setShowTxForm(true);
  };

  const saveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficeId) return;
    if (!txForm.transactionType || !txForm.amount || !txForm.direction) { toast.error('الحقول الأساسية مطلوبة'); return; }
    setSaving(true);
    try {
      await api.createExchangeTransaction(selectedOfficeId as number, txForm);
      toast.success('تم تسجيل الحركة بنجاح');
      setShowTxForm(false);
      loadLedger();
      loadInitial(); // Refresh dashboard
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };
  
  const delTx = async (id: number) => {
    if (!canDelete) { toast.error('ليس لديك صلاحية للحذف'); return; }
    if (!window.confirm('هل أنت متأكد من حذف هذه الحركة؟ سيتم إعادة حساب الرصيد التراكمي.')) return;
    try {
      await api.deleteExchangeTransaction(id);
      toast.success('تم الحذف وتمت إعادة حساب الرصيد');
      loadLedger();
      loadInitial();
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    }
  };

  // ─── Renders ──────────────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي الصيرفات" value={dashboard?.totalOffices || 0} icon={Building} color="#3b82f6" />
        <StatCard title="حركات اليوم" value={dashboard?.todayTransactions || 0} icon={RefreshCcw} color="#f59e0b" />
        <StatCard title="حركات الشهر" value={dashboard?.monthTransactions || 0} icon={Calendar} color="#8b5cf6" />
        <StatCard title="أعلى رصيد" value={dashboard?.highestOffice?.name || '-'} sub={formatIQD(dashboard?.highestOffice?.balance || 0)} icon={TrendingUp} color="#10b981" />
      </div>

      <div className="glass-card rounded-[2rem] p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Banknote className="text-emerald-500" />
          إجمالي الأرصدة المجمعة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 rounded-[1.5rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
            <div className="text-slate-500 text-sm font-bold mb-2">إجمالي أرصدة الدينار العراقي</div>
            <div className="text-3xl font-black text-indigo-700" dir="ltr">
              {formatIQD(dashboard?.totalBalanceIqd || 0)} <span className="text-lg font-bold text-indigo-400">IQD</span>
            </div>
          </div>
          <div className="p-6 rounded-[1.5rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="text-slate-500 text-sm font-bold mb-2">إجمالي أرصدة الدولار الأمريكي</div>
            <div className="text-3xl font-black text-emerald-700" dir="ltr">
              ${(dashboard?.totalBalanceUsd || 0).toLocaleString()} <span className="text-lg font-bold text-emerald-400">USD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOffices = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Building className="text-indigo-600" size={28} />
          دليل الصيرفات والمكاتب
        </h2>
        <button onClick={() => openOfficeForm()} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> إضافة صيرفة
        </button>
      </div>

      <div className="glass-card rounded-[2rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-slate-500 font-bold w-16">ID</th>
                <th className="p-4 text-slate-500 font-bold">الاسم</th>
                <th className="p-4 text-slate-500 font-bold">المدينة</th>
                <th className="p-4 text-slate-500 font-bold">الهاتف</th>
                <th className="p-4 text-slate-500 font-bold">الحالة</th>
                <th className="p-4 text-slate-500 font-bold w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offices.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-slate-400 font-mono text-sm">{o.id}</td>
                  <td className="p-4 font-bold text-slate-800">
                    {o.name}
                    {o.notes && <div className="text-xs text-slate-400 mt-1 font-normal">{o.notes}</div>}
                  </td>
                  <td className="p-4 text-slate-600">{o.city || '-'}</td>
                  <td className="p-4 text-slate-600" dir="ltr">{o.phone || '-'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${o.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {o.status === 'active' ? 'نشط' : 'متوقف'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openOfficeForm(o)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit3 size={18}/></button>
                      <button onClick={() => delOffice(o.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {offices.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد صيرفات مضافة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderLedger = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex-1 w-full max-w-md">
          <select 
            className="input-field w-full font-extrabold text-lg h-12 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-indigo-500/40 dark:border-indigo-500/50 shadow-md"
            value={selectedOfficeId}
            onChange={e => setSelectedOfficeId(e.target.value ? parseInt(e.target.value) : '')}
          >
            <option value="" className="text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-900">-- اختر الصيرفة --</option>
            {offices.map(o => <option key={o.id} value={o.id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{o.name}</option>)}
          </select>
        </div>
      </div>

      {selectedOfficeId && officeSummary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard 
              title="الرصيد بالدينار" 
              value={formatIQD(officeSummary.balanceIqd)} 
              icon={Banknote} 
              color="#4f46e5" 
            />
            <StatCard 
              title="الرصيد بالدولار" 
              value={`$${officeSummary.balanceUsd.toLocaleString()}`} 
              icon={DollarSign} 
              color="#10b981" 
            />
            <StatCard 
              title="إجمالي الحركات" 
              value={officeSummary.totalTransfers} 
              icon={RefreshCcw} 
              color="#6366f1" 
            />
            <StatCard 
              title="آخر حركة" 
              value={officeSummary.lastTransaction ? officeSummary.lastTransaction.transactionDate : '-'} 
              icon={Calendar} 
              color="#8b5cf6" 
            />
          </div>

          <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 flex flex-col gap-6 shadow-xl border border-white/80 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                  <FileText size={22} />
                </div>
                سجل الحركات المالية
              </h3>
              <div className="flex items-center gap-3">
                <button onClick={() => { setLedgerPage(1); loadLedger(); }} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-all">
                  <Filter size={18} /> تصفية
                </button>
                <button onClick={openTxForm} className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
                  <Plus size={20} /> إضافة حركة جديدة
                </button>
              </div>
            </div>

            {/* High Contrast Filter Bar */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/90 shadow-sm flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 w-full relative">
                <Search className="absolute right-4 top-3.5 text-slate-400 dark:text-slate-300 pointer-events-none" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث بالبيان، الوصل، أو اسم المحول..." 
                  className="input-field pl-4 pr-12 h-12 w-full text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500"
                  value={ledgerSearch} 
                  onChange={e => setLedgerSearch(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && loadLedger()} 
                />
              </div>
              <div className="flex flex-wrap xl:flex-nowrap gap-5 w-full md:w-auto items-center">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">من:</span>
                  <input 
                    type="date" 
                    className="input-field h-12 w-full sm:w-[170px] px-3 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600" 
                    value={ledgerDateFrom} 
                    onChange={e => setLedgerDateFrom(e.target.value)} 
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">إلى:</span>
                  <input 
                    type="date" 
                    className="input-field h-12 w-full sm:w-[170px] px-3 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600" 
                    value={ledgerDateTo} 
                    onChange={e => setLedgerDateTo(e.target.value)} 
                  />
                </div>
                <select 
                  className="input-field h-12 w-full sm:w-[260px] px-4 py-0 m-0 leading-[44px] align-middle text-sm font-extrabold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-indigo-500 dark:border-indigo-400" 
                  style={{ paddingTop: '0', paddingBottom: '0' }}
                  value={ledgerType} 
                  onChange={e => setLedgerType(e.target.value)}
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold">كل الأنواع (الجميع)</option>
                  {Object.entries(TX_TYPES).map(([k, v]) => (
                    <option key={k} value={k} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold">{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <table className="w-full text-right border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-sm">
                  {/* Top Header Row */}
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-black border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 text-center border-l border-slate-200 dark:border-slate-700 w-12" rowSpan={2}>#</th>
                    <th className="p-3 border-l border-slate-200 dark:border-slate-700 min-w-[200px]" rowSpan={2}>البيان والملاحظات</th>
                    <th className="p-3 border-l border-slate-200 dark:border-slate-700 w-24" rowSpan={2}>التاريخ</th>
                    <th className="p-3 border-l border-slate-200 dark:border-slate-700 w-24" rowSpan={2}>الرقم</th>
                    <th className="p-3 border-l border-slate-200 dark:border-slate-700 w-32" rowSpan={2}>النوع</th>
                    
                    {/* Dinar Group */}
                    <th className="p-3 border-l border-slate-200 dark:border-slate-700 text-center bg-indigo-50/50 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-200" colSpan={3}>دينار (IQD)</th>
                    
                    {/* Dollar Group */}
                    <th className="p-3 text-center bg-emerald-50/50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200 border-l border-slate-200 dark:border-slate-700" colSpan={3}>دولار (USD)</th>
                    <th className="p-3 w-12" rowSpan={2}></th>
                  </tr>
                  
                  {/* Bottom Header Row */}
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border-b-2 border-slate-300 dark:border-slate-600">
                    {/* Dinar Sub-columns */}
                    <th className="p-2 border-l border-slate-200 dark:border-slate-700 text-center text-rose-700 dark:text-rose-400 bg-rose-50/30 w-28">عليه (صرف)</th>
                    <th className="p-2 border-l border-slate-200 dark:border-slate-700 text-center text-teal-700 dark:text-teal-400 bg-teal-50/30 w-28">له (قبض)</th>
                    <th className="p-2 border-l border-slate-200 dark:border-slate-700 text-center text-indigo-800 dark:text-indigo-300 bg-indigo-50/30 w-32">الرصيد</th>
                    
                    {/* Dollar Sub-columns */}
                    <th className="p-2 border-l border-slate-200 dark:border-slate-700 text-center text-rose-700 dark:text-rose-400 bg-rose-50/30 w-28">عليه (صرف)</th>
                    <th className="p-2 border-l border-slate-200 dark:border-slate-700 text-center text-teal-700 dark:text-teal-400 bg-teal-50/30 w-28">له (قبض)</th>
                    <th className="p-2 text-center border-l border-slate-200 dark:border-slate-700 text-emerald-800 dark:text-emerald-300 bg-emerald-50/30 w-32">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                  {transactions.map((tx, idx) => {
                    const cfg = TX_TYPES[tx.transactionType] || { label: tx.transactionType, color: '#94a3b8', bg: '#f1f5f9', icon: FileText };
                    
                    const isIQD = tx.currency === 'IQD';
                    const isUSD = tx.currency === 'USD';
                    
                    const iqdCredit = isIQD && tx.direction === 'credit' ? tx.amount : null;
                    const iqdDebit = isIQD && tx.direction === 'debit' ? tx.amount : null;
                    const iqdBalance = isIQD ? tx.runningBalance : null;
                    
                    const usdCredit = isUSD && tx.direction === 'credit' ? tx.amount : null;
                    const usdDebit = isUSD && tx.direction === 'debit' ? tx.amount : null;
                    const usdBalance = isUSD ? tx.runningBalance : null;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="p-2 text-center text-slate-400 text-xs border-l border-slate-100 dark:border-slate-800">{(ledgerPage-1)*ledgerLimit + idx + 1}</td>
                        <td className="p-2 border-l border-slate-100 dark:border-slate-800">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{tx.description || '-'}</div>
                          {tx.reference && <div className="text-xs text-slate-400 mt-0.5">مرجع: {tx.reference}</div>}
                        </td>
                        <td className="p-2 font-mono text-slate-600 dark:text-slate-400 text-xs border-l border-slate-100 dark:border-slate-800">{tx.transactionDate}</td>
                        <td className="p-2 font-mono font-bold text-slate-700 dark:text-slate-300 text-xs border-l border-slate-100 dark:border-slate-800">{tx.voucherNumber}</td>
                        <td className="p-2 border-l border-slate-100 dark:border-slate-800">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap" style={{ color: cfg.color }}>
                             {cfg.label}
                          </span>
                        </td>
                        
                        {/* Dinar Data */}
                        <td className="p-2 text-center font-black text-rose-500 text-sm border-l border-slate-100 dark:border-slate-800 bg-rose-50/10" dir="ltr">
                          {iqdDebit ? formatIQD(iqdDebit) : ''}
                        </td>
                        <td className="p-2 text-center font-black text-teal-600 text-sm border-l border-slate-100 dark:border-slate-800 bg-teal-50/10" dir="ltr">
                          {iqdCredit ? formatIQD(iqdCredit) : ''}
                        </td>
                        <td className="p-2 text-center font-black text-indigo-700 dark:text-indigo-400 text-[15px] border-l border-slate-200 dark:border-slate-700 bg-indigo-50/10" dir="ltr">
                          {iqdBalance !== null ? formatIQD(iqdBalance) : '-'}
                        </td>

                        {/* Dollar Data */}
                        <td className="p-2 text-center font-black text-rose-500 text-sm border-l border-slate-100 dark:border-slate-800 bg-rose-50/10" dir="ltr">
                          {usdDebit ? `$${usdDebit.toLocaleString()}` : ''}
                        </td>
                        <td className="p-2 text-center font-black text-teal-600 text-sm border-l border-slate-100 dark:border-slate-800 bg-teal-50/10" dir="ltr">
                          {usdCredit ? `$${usdCredit.toLocaleString()}` : ''}
                        </td>
                        <td className="p-2 text-center font-black text-emerald-700 dark:text-emerald-400 text-[15px] border-l border-slate-100 dark:border-slate-800 bg-emerald-50/10" dir="ltr">
                          {usdBalance !== null ? `$${usdBalance.toLocaleString()}` : '-'}
                        </td>
                        
                        <td className="p-2">
                          <button onClick={() => delTx(tx.id)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr><td colSpan={12} className="p-12 text-center text-slate-400 font-bold">لا توجد حركات مطابقة</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-4 border-slate-300 dark:border-slate-700 shadow-inner">
                  <tr>
                    <td colSpan={5} className="p-4 text-left font-black text-slate-800 dark:text-slate-200 text-base border-l border-slate-300 dark:border-slate-700">
                      الرصيد النهائي الحالي (المطلوب):
                    </td>
                    
                    {/* Dinar Final */}
                    <td colSpan={3} className="p-4 text-center border-l border-slate-300 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-900/30">
                      {(() => {
                        const bal = officeSummary?.balanceIqd || 0;
                        if (bal === 0) return <span className="font-black text-slate-500">مصفر (0)</span>;
                        if (bal > 0) return <span className="font-black text-teal-600 text-lg">نطلبهم {formatIQD(bal)}</span>;
                        return <span className="font-black text-rose-600 text-lg">يطلبونا {formatIQD(Math.abs(bal))}</span>;
                      })()}
                    </td>
                    
                    {/* Dollar Final */}
                    <td colSpan={3} className="p-4 text-center border-l border-slate-300 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/30">
                      {(() => {
                        const bal = officeSummary?.balanceUsd || 0;
                        if (bal === 0) return <span className="font-black text-slate-500">مصفر ($0)</span>;
                        if (bal > 0) return <span className="font-black text-teal-600 text-lg">نطلبهم ${bal.toLocaleString()}</span>;
                        return <span className="font-black text-rose-600 text-lg">يطلبونا ${Math.abs(bal).toLocaleString()}</span>;
                      })()}
                    </td>
                    
                    <td className="p-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalTx > ledgerLimit && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-sm text-slate-500">إجمالي: <span className="font-bold text-slate-800">{totalTx}</span> حركة</div>
                <div className="flex gap-2">
                  <button disabled={ledgerPage === 1} onClick={() => setLedgerPage(p => p - 1)} className="btn-secondary px-4 py-1.5 disabled:opacity-50">السابق</button>
                  <span className="px-4 py-1.5 font-bold text-slate-700 bg-slate-100 rounded-lg">صفحة {ledgerPage} من {Math.ceil(totalTx / ledgerLimit)}</span>
                  <button disabled={ledgerPage >= Math.ceil(totalTx / ledgerLimit)} onClick={() => setLedgerPage(p => p + 1)} className="btn-secondary px-4 py-1.5 disabled:opacity-50">التالي</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card rounded-[2rem] p-6 flex flex-col gap-6">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <Printer className="text-indigo-600" />
          كشف حساب مفصل للطباعة
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-sm font-bold text-slate-600 block mb-2">الصيرفة</label>
            <select className="input-field w-full font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={selectedOfficeId} onChange={e => setSelectedOfficeId(e.target.value ? parseInt(e.target.value) : '')}>
              <option value="" className="bg-white dark:bg-slate-900 text-slate-400">-- اختر الصيرفة --</option>
              {offices.map(o => <option key={o.id} value={o.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-600 block mb-2">العملة</label>
            <select className="input-field w-full" value={reportCurrency} onChange={e => setReportCurrency(e.target.value)}>
              <option value="IQD">دينار (IQD)</option>
              <option value="USD">دولار (USD)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-600 block mb-2">من تاريخ</label>
            <input type="date" className="input-field w-full" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-600 block mb-2">إلى تاريخ</label>
            <input type="date" className="input-field w-full" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} />
          </div>
        </div>
        
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button onClick={loadReport} disabled={!selectedOfficeId || loadingLedger} className="btn-primary px-8 flex items-center gap-2 h-12">
            <RefreshCcw size={20} className={loadingLedger ? 'animate-spin' : ''} />
            توليد الكشف
          </button>
        </div>
      </div>

      {reportData && (
        <div className="glass-card rounded-[2rem] p-8 overflow-x-auto print:p-0 print:shadow-none print:bg-white print:rounded-none">
          {/* Printable Area */}
          <div className="min-w-[800px]">
            <div className="text-center mb-8 pb-6 border-b-2 border-slate-200">
              <h1 className="text-2xl font-black text-slate-900 mb-2">كشف حساب صيرفة</h1>
              <h2 className="text-xl font-bold text-indigo-700 mb-4">{reportData.office?.name}</h2>
              <div className="flex justify-center gap-8 text-slate-600 font-bold text-sm">
                <div>العملة: {reportData.currency === 'IQD' ? 'دينار عراقي (IQD)' : 'دولار أمريكي (USD)'}</div>
                {reportData.dateFrom && <div>من: {reportData.dateFrom}</div>}
                {reportData.dateTo && <div>إلى: {reportData.dateTo}</div>}
                <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-IQ')}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8 text-center bg-slate-50 p-6 rounded-2xl border border-slate-200 print:border-black">
              <div>
                <div className="text-slate-500 font-bold text-sm mb-1">الرصيد الافتتاحي</div>
                <div className="text-xl font-black text-slate-800" dir="ltr">
                  {reportData.currency === 'IQD' ? formatIQD(reportData.openingBalance) : `$${reportData.openingBalance.toLocaleString()}`}
                </div>
              </div>
              <div className="border-x border-slate-200">
                <div className="text-slate-500 font-bold text-sm mb-1">مجموع الحركات ({reportData.transactionCount})</div>
                <div className="text-sm font-bold text-emerald-600">وارد: +{reportData.currency === 'IQD' ? formatIQD(reportData.totalReceived) : reportData.totalReceived}</div>
                <div className="text-sm font-bold text-rose-600">صادر: -{reportData.currency === 'IQD' ? formatIQD(reportData.totalPaid) : reportData.totalPaid}</div>
              </div>
              <div>
                <div className="text-slate-500 font-bold text-sm mb-1">الرصيد الختامي</div>
                <div className="text-xl font-black text-indigo-700" dir="ltr">
                  {reportData.currency === 'IQD' ? formatIQD(reportData.closingBalance) : `$${reportData.closingBalance.toLocaleString()}`}
                </div>
              </div>
            </div>

            <table className="w-full text-right border-collapse text-sm print:text-[12px] border border-slate-200 print:border-black">
              <thead>
                <tr className="bg-slate-100 print:bg-gray-200">
                  <th className="p-3 border border-slate-200 print:border-black w-24">التاريخ</th>
                  <th className="p-3 border border-slate-200 print:border-black w-24">الوصل</th>
                  <th className="p-3 border border-slate-200 print:border-black">البيان</th>
                  <th className="p-3 border border-slate-200 print:border-black w-32 text-center text-emerald-700">له (دائن/قبض)</th>
                  <th className="p-3 border border-slate-200 print:border-black w-32 text-center text-rose-700">عليه (مدين/صرف)</th>
                  <th className="p-3 border border-slate-200 print:border-black w-32 text-center">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={3} className="p-3 border border-slate-200 print:border-black text-center">رصيد ما قبله (افتتاحي)</td>
                  <td className="p-3 border border-slate-200 print:border-black text-center"></td>
                  <td className="p-3 border border-slate-200 print:border-black text-center"></td>
                  <td className="p-3 border border-slate-200 print:border-black text-center" dir="ltr">
                    {reportData.currency === 'IQD' ? formatIQD(reportData.openingBalance) : reportData.openingBalance.toLocaleString()}
                  </td>
                </tr>
                {reportData.transactions.map((tx: any) => (
                  <tr key={tx.id}>
                    <td className="p-3 border border-slate-200 print:border-black font-mono">{tx.transactionDate}</td>
                    <td className="p-3 border border-slate-200 print:border-black font-mono">{tx.voucherNumber}</td>
                    <td className="p-3 border border-slate-200 print:border-black">
                      {tx.description} {tx.reference ? `(${tx.reference})` : ''}
                    </td>
                    <td className="p-3 border border-slate-200 print:border-black text-center font-bold text-emerald-600" dir="ltr">
                      {tx.direction === 'credit' ? (reportData.currency === 'IQD' ? formatIQD(tx.amount) : tx.amount.toLocaleString()) : ''}
                    </td>
                    <td className="p-3 border border-slate-200 print:border-black text-center font-bold text-rose-600" dir="ltr">
                      {tx.direction === 'debit' ? (reportData.currency === 'IQD' ? formatIQD(tx.amount) : tx.amount.toLocaleString()) : ''}
                    </td>
                    <td className="p-3 border border-slate-200 print:border-black text-center font-bold text-slate-800" dir="ltr">
                      {reportData.currency === 'IQD' ? formatIQD(tx.runningBalance) : tx.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-12 flex justify-between px-16 text-slate-600 font-bold print:block">
              <div className="text-center print:float-right">توقيع المحاسب<br/><br/>__________________</div>
              <div className="text-center print:float-left">توقيع المدير<br/><br/>__________________</div>
            </div>
          </div>
          {/* End Printable Area */}
          
          <div className="mt-8 flex justify-center print:hidden">
            <button onClick={() => window.print()} className="btn-primary px-12 py-3 text-lg flex items-center gap-3">
              <Printer size={24} /> طباعة الكشف
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 mb-24 print:m-0 print:p-0">
      <div className="flex items-center gap-4 mb-8 print:hidden">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 rotate-3">
          <ArrowRightLeft className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">نظام الحوالات والصيرفات</h1>
          <p className="text-slate-500 font-medium mt-1">إدارة الأرصدة المتعددة وكشف الحساب الشامل</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 print:hidden scrollbar-hide">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all duration-300 ${
                isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/50 scale-100' : 'bg-white text-slate-500 hover:bg-slate-50 scale-95 hover:scale-100'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-indigo-200' : 'text-slate-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
      ) : (
        <div className="mt-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'offices'   && renderOffices()}
          {activeTab === 'ledger'    && renderLedger()}
          {activeTab === 'reports'   && renderReports()}
        </div>
      )}

      {/* Office Form Modal */}
      {showOfficeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md print:hidden overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-3xl shadow-2xl animate-scale-up overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 sm:p-7 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600/30 border border-indigo-500/40 rounded-2xl flex items-center justify-center text-indigo-400">
                  <Building size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">{editOffice ? 'تعديل بيانات الصيرفة' : 'إضافة صيرفة جديدة'}</h2>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">أدخل معلومات مكاتب الصيرفة والأرصدة الأولية</p>
                </div>
              </div>
              <button onClick={() => setShowOfficeForm(false)} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><X size={22}/></button>
            </div>

            {/* Modal Form */}
            <form onSubmit={saveOffice} className="p-6 sm:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-2">اسم الصيرفة / المكتب *</label>
                  <input required autoFocus type="text" className="input-field" value={officeForm.name} onChange={e => setOfficeForm({...officeForm, name: e.target.value})} placeholder="مثال: أربيل للصيرفة والحوالات" />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-2">رقم الهاتف</label>
                  <input type="text" className="input-field" value={officeForm.phone} onChange={e => setOfficeForm({...officeForm, phone: e.target.value})} placeholder="07xx xxx xxxx" dir="ltr" />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-2">المدينة / المحافظة</label>
                  <input type="text" className="input-field" value={officeForm.city} onChange={e => setOfficeForm({...officeForm, city: e.target.value})} placeholder="بغداد، أربيل، البصرة..." />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-2">العنوان الكامل</label>
                  <input type="text" className="input-field" value={officeForm.address} onChange={e => setOfficeForm({...officeForm, address: e.target.value})} placeholder="المنطقة، الشارع الرئيسي، رقم المحل..." />
                </div>
              </div>
              
              {!editOffice && (
                <div className="p-5 bg-emerald-500/10 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/30 space-y-4">
                  <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <Banknote size={20}/> الأرصدة الافتتاحية (المستحقات الحالية)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1.5">رصيد الدينار (IQD)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          className="input-field w-full font-mono font-bold pl-12" 
                          value={officeForm.initialBalanceIqd ? (officeForm.initialBalanceIqd.toString() === '-' ? '-' : Number(officeForm.initialBalanceIqd.toString().replace(/,/g, '')).toLocaleString('en-US')) : ''} 
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '');
                            if (!isNaN(Number(val)) || val === '-' || val === '') setOfficeForm({...officeForm, initialBalanceIqd: val});
                          }} 
                          placeholder="0" 
                          dir="ltr" 
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 select-none">د.ع</div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1.5">رصيد الدولار (USD)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          className="input-field w-full font-mono font-bold pl-10" 
                          value={officeForm.initialBalanceUsd ? (officeForm.initialBalanceUsd.toString() === '-' ? '-' : Number(officeForm.initialBalanceUsd.toString().replace(/,/g, '')).toLocaleString('en-US')) : ''} 
                          onChange={e => {
                            const val = e.target.value.replace(/,/g, '');
                            if (!isNaN(Number(val)) || val === '-' || val === '') setOfficeForm({...officeForm, initialBalanceUsd: val});
                          }} 
                          placeholder="0" 
                          dir="ltr" 
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 select-none">$</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">* ملاحظة: أدخل المبلغ بقيمة موجبة إذا كان الرصيد لصالح المكتب، أو بالسالب (-) إذا كان المكتب يطلبنا مبالغ.</p>
                </div>
              )}

              {editOffice && (
                <div>
                  <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-2">حالة الحساب</label>
                  <select className="input-field font-bold" value={officeForm.status} onChange={e => setOfficeForm({...officeForm, status: e.target.value})}>
                    <option value="active">نشط (مفعل)</option>
                    <option value="inactive">متوقف (معطل)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-2">ملاحظات إضافية</label>
                <textarea className="input-field min-h-[90px] py-3" value={officeForm.notes} onChange={e => setOfficeForm({...officeForm, notes: e.target.value})} placeholder="أي تفاصيل أو ملاحظات خاصة بهذا المكتب..."></textarea>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3.5 text-lg shadow-lg">{saving ? 'جاري الحفظ...' : 'حفظ البيانات'}</button>
                <button type="button" onClick={() => setShowOfficeForm(false)} className="btn-secondary px-8 py-3.5 text-base">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Form Modal */}
      {showTxForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md print:hidden overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-3xl shadow-2xl animate-scale-up overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 sm:p-7 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600/30 border border-indigo-500/40 rounded-2xl flex items-center justify-center text-indigo-400">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">تسجيل حركة مالية جديدة</h2>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">تسجيل سند قبض، صرف، أو حوالة مالية في دفتر الحساب</p>
                </div>
              </div>
              <button onClick={() => setShowTxForm(false)} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><X size={22}/></button>
            </div>

            {/* Modal Form */}
            <form onSubmit={saveTx} className="p-6 sm:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-2">نوع الحركة *</label>
                  <select className="input-field font-bold text-base" value={txForm.transactionType} onChange={e => {
                    const type = e.target.value;
                    let dir = txForm.direction;
                    if (type === 'receive_cash' || type === 'transfer') dir = 'credit';
                    if (type === 'pay_cash') dir = 'debit';
                    setTxForm({...txForm, transactionType: type, direction: dir});
                  }}>
                    {Object.entries(TX_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-2">التاريخ *</label>
                  <input type="date" required className="input-field font-bold text-base" value={txForm.transactionDate} onChange={e => setTxForm({...txForm, transactionDate: e.target.value})} />
                </div>
              </div>

              <div className="p-6 bg-indigo-500/10 dark:bg-indigo-950/40 rounded-2xl border border-indigo-500/30 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-black text-indigo-900 dark:text-indigo-200 mb-2">المبلغ *</label>
                    <div className="flex bg-white dark:bg-slate-900 border-2 border-indigo-500/30 rounded-2xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all shadow-sm">
                      <div className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-5 flex items-center justify-center font-black text-sm border-l border-indigo-500/30 select-none">
                        {txForm.currency === 'IQD' ? 'د.ع' : '$'}
                      </div>
                      <input 
                        type="text" 
                        required 
                        className="w-full bg-transparent p-3.5 text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono focus:outline-none" 
                        value={txForm.amount ? Number(txForm.amount.toString().replace(/,/g, '')).toLocaleString('en-US') : ''} 
                        onChange={e => {
                          const val = e.target.value.replace(/,/g, '');
                          if (!isNaN(Number(val)) || val === '') setTxForm({...txForm, amount: val});
                        }} 
                        placeholder="0" 
                        dir="ltr" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-black text-indigo-900 dark:text-indigo-200 mb-2">العملة *</label>
                    <select className="input-field font-bold text-base" value={txForm.currency} onChange={e => setTxForm({...txForm, currency: e.target.value})}>
                      <option value="IQD">دينار عراقي (IQD)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                    </select>
                  </div>
                </div>
                
                {txForm.transactionType === 'opening_balance' && (
                  <div>
                    <label className="block text-sm font-black text-indigo-900 dark:text-indigo-200 mb-3">التوجيه المحاسبي (للرصيد الافتتاحي) *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="relative cursor-pointer">
                        <input type="radio" name="dir" className="peer sr-only" checked={txForm.direction === 'credit'} onChange={() => setTxForm({...txForm, direction: 'credit'})} />
                        <div className="p-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-base flex items-center justify-center gap-2 transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-500/20 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-400 peer-checked:shadow-lg">
                          <ArrowDownToLine size={20} className="text-emerald-500" />
                          له (نطلبهم / رصيد لنا)
                        </div>
                      </label>

                      <label className="relative cursor-pointer">
                        <input type="radio" name="dir" className="peer sr-only" checked={txForm.direction === 'debit'} onChange={() => setTxForm({...txForm, direction: 'debit'})} />
                        <div className="p-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-base flex items-center justify-center gap-2 transition-all peer-checked:border-rose-500 peer-checked:bg-rose-500/20 peer-checked:text-rose-700 dark:peer-checked:text-rose-400 peer-checked:shadow-lg">
                          <ArrowUpFromLine size={20} className="text-rose-500" />
                          عليه (يطلبونا / رصيد علينا)
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-2">البيان / التفاصيل *</label>
                <input type="text" required className="input-field text-base" value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} placeholder="اكتب تفاصيل أو سبب هذه الحركة المالية..." />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-2">رقم المرجع الخارجي (اختياري)</label>
                <input type="text" className="input-field font-mono" value={txForm.reference} onChange={e => setTxForm({...txForm, reference: e.target.value})} placeholder="مثال: رقم الحوالة 987654" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button type="submit" disabled={saving} className="flex-1 py-4 text-lg font-black text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-3">
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={22} />}
                  {saving ? 'جاري الحفظ...' : 'حفظ الحركة المالية'}
                </button>
                <button type="button" onClick={() => setShowTxForm(false)} className="px-8 py-4 text-base font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
