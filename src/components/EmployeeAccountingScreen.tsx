import React, { useState, useEffect, useCallback } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import {
  Users, DollarSign, TrendingDown, TrendingUp, CheckCircle,
  Plus, Search, Trash2, Edit3, AlertCircle, X,
  Calendar, FileText, BarChart3, CreditCard, UserX, RefreshCcw,
  Save, Printer, Download, Filter, Phone, Briefcase
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface HREmployee {
  id: number; name: string; position: string; phone: string;
  monthlySalary: number; dailyWage: number; status: string;
  hireDate?: string; notes?: string;
}
interface Advance {
  id: number; employeeId: number; employeeName: string;
  amount: number; dailyWage: number; repaymentDays: number;
  advanceDate: string; expectedCompletion: string;
  amountRepaid: number; remaining: number;
  status: 'active' | 'completed'; notes: string;
}
interface Transaction {
  id: number; employeeId: number; employeeName: string;
  type: string; amount: number; date: string;
  notes: string; remainingAdvance: number;
}
interface Absence {
  id: number; employeeId: number; employeeName: string;
  date: string; reason: string;
}
interface Summary {
  totalSalaries: number; activeAdvancesCount: number; totalOutstanding: number;
  completedAdvancesCount: number; totalDeductions: number; totalBonuses: number;
}

const TABS = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: BarChart3 },
  { id: 'staff', label: 'إدارة الموظفين', icon: Users },
  { id: 'advances', label: 'السلف', icon: CreditCard },
  { id: 'transactions', label: 'السجل المالي', icon: FileText },
  { id: 'absences', label: 'الغيابات', icon: UserX },
  { id: 'reports', label: 'التقارير', icon: Printer },
];

const TX_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  salary:            { label: 'راتب',        color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  advance:           { label: 'سلفة',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  deduction:         { label: 'خصم',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  bonus:             { label: 'مكافأة',      color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  advance_repayment: { label: 'تسديد سلفة',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <div className="glass-card rounded-[1.5rem] p-5 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-slate-500 text-xs font-bold mb-1.5 tracking-wide">{title}</div>
          <div className="text-slate-900 text-xl font-black">{value}</div>
          {sub && <div className="text-slate-400 text-xs mt-1">{sub}</div>}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EmployeeAccountingScreen({ permissions }: { permissions: any }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [advances, setAdvances]   = useState<Advance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [absences, setAbsences]   = useState<Absence[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);

  // Filters
  const [search,      setSearch]      = useState('');
  const [filterEmp,   setFilterEmp]   = useState<number | ''>('');
  const [filterStatus,setFilterStatus]= useState('');
  const [filterType,  setFilterType]  = useState('');

  // Modal states
  const [showEmpForm,     setShowEmpForm]    = useState(false);
  const [editEmp,         setEditEmp]        = useState<HREmployee | null>(null);
  const [showAdvForm,     setShowAdvForm]    = useState(false);
  const [showRepayForm,   setShowRepayForm]  = useState(false);
  const [repayTarget,     setRepayTarget]    = useState<Advance | null>(null);
  const [repayAmount,     setRepayAmount]    = useState('');
  const [showTxForm,      setShowTxForm]     = useState(false);
  const [showAbsForm,     setShowAbsForm]    = useState(false);
  const [saving,          setSaving]         = useState(false);

  // Forms
  const [empForm, setEmpForm] = useState({ name: '', position: '', phone: '', monthlySalary: '', dailyWage: '', hireDate: '', notes: '' });
  const [advForm, setAdvForm] = useState({ employeeId: '', amount: '', advanceDate: new Date().toISOString().split('T')[0], notes: '' });
  const [txForm,  setTxForm]  = useState({ employeeId: '', type: 'salary', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [absForm, setAbsForm] = useState({ employeeId: '', date: new Date().toISOString().split('T')[0], reason: '' });

  // Advance preview
  const [advPreview, setAdvPreview] = useState({ dailyWage: 0, repaymentDays: 0, expectedCompletion: '' });

  const canCreate = permissions?.employeeAccounting?.create;
  const canEdit   = permissions?.employeeAccounting?.edit;
  const canDelete = permissions?.employeeAccounting?.delete;

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, advs, txs, abs, sum] = await Promise.all([
        api.getHREmployees(),
        api.getEmployeeAdvances(),
        api.getEmployeeTransactions(),
        api.getEmployeeAbsences(),
        api.getEmployeeAccountingSummary(),
      ]);
      setEmployees(Array.isArray(emps) ? emps : []);
      setAdvances(Array.isArray(advs) ? advs : []);
      setTransactions(Array.isArray(txs) ? txs : []);
      setAbsences(Array.isArray(abs) ? abs : []);
      setSummary(sum && typeof sum === 'object' ? sum : null);
    } catch (e: any) {
      toast.error(e.message || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Advance preview ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!advForm.employeeId || !advForm.amount || !advForm.advanceDate) {
      setAdvPreview({ dailyWage: 0, repaymentDays: 0, expectedCompletion: '' }); return;
    }
    const emp = employees.find(e => e.id === parseInt(advForm.employeeId));
    if (!emp) return;
    const dw  = emp.dailyWage || 0;
    const amt = parseFloat(advForm.amount) || 0;
    const days = dw > 0 ? Math.ceil(amt / dw) : 0;
    const d = new Date(advForm.advanceDate);
    d.setDate(d.getDate() + days);
    setAdvPreview({ dailyWage: dw, repaymentDays: days, expectedCompletion: d.toISOString().split('T')[0] });
  }, [advForm.employeeId, advForm.amount, advForm.advanceDate, employees]);

  // ── Employee CRUD ─────────────────────────────────────────────────────────
  const openAddEmp = () => {
    setEditEmp(null);
    setEmpForm({ name: '', position: '', phone: '', monthlySalary: '', dailyWage: '', hireDate: '', notes: '' });
    setShowEmpForm(true);
  };
  const openEditEmp = (emp: HREmployee) => {
    setEditEmp(emp);
    setEmpForm({ name: emp.name, position: emp.position, phone: emp.phone, monthlySalary: String(emp.monthlySalary || ''), dailyWage: String(emp.dailyWage || ''), hireDate: emp.hireDate || '', notes: emp.notes || '' });
    setShowEmpForm(true);
  };
  const handleSaveEmp = async () => {
    if (!empForm.name.trim()) return toast.error('اسم الموظف مطلوب');
    setSaving(true);
    try {
      const payload = { name: empForm.name, position: empForm.position, phone: empForm.phone, monthlySalary: parseFloat(empForm.monthlySalary) || 0, dailyWage: parseFloat(empForm.dailyWage) || 0, hireDate: empForm.hireDate || null, notes: empForm.notes };
      if (editEmp) {
        await api.updateHREmployee(editEmp.id, payload);
        toast.success('تم تعديل الموظف');
      } else {
        await api.createHREmployee(payload);
        toast.success('تم إضافة الموظف');
      }
      setShowEmpForm(false);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };
  const handleDeleteEmp = async (id: number, name: string) => {
    if (!confirm(`هل تريد حذف الموظف "${name}" وكل سجلاته؟`)) return;
    try { await api.deleteHREmployee(id); toast.success('تم الحذف'); loadAll(); }
    catch (e: any) { toast.error(e.message); }
  };

  // ── Advance ───────────────────────────────────────────────────────────────
  const handleCreateAdvance = async () => {
    if (!advForm.employeeId || !advForm.amount || !advForm.advanceDate) return toast.error('يرجى تعبئة الحقول المطلوبة');
    setSaving(true);
    try {
      await api.createEmployeeAdvance({ employeeId: parseInt(advForm.employeeId), amount: parseFloat(advForm.amount), advanceDate: advForm.advanceDate, notes: advForm.notes });
      toast.success('تم تسجيل السلفة');
      setShowAdvForm(false);
      setAdvForm({ employeeId: '', amount: '', advanceDate: new Date().toISOString().split('T')[0], notes: '' });
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };
  const handleDeleteAdv = async (id: number) => {
    if (!confirm('حذف هذه السلفة؟')) return;
    try { await api.deleteEmployeeAdvance(id); toast.success('تم الحذف'); loadAll(); }
    catch (e: any) { toast.error(e.message); }
  };
  const handleRepayAdvance = async () => {
    if (!repayTarget || !repayAmount) return toast.error('يرجى تحديد المبلغ');
    const amt = parseFloat(repayAmount);
    if (amt <= 0 || amt > repayTarget.remaining) return toast.error('المبلغ غير صالح');
    setSaving(true);
    try {
      await api.repayEmployeeAdvance(repayTarget.id, { amount: amt });
      toast.success('تم تسجيل الدفعة بنجاح');
      setShowRepayForm(false);
      setRepayAmount('');
      setRepayTarget(null);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ── Transaction ───────────────────────────────────────────────────────────
  const handleCreateTx = async () => {
    if (!txForm.employeeId || !txForm.amount || !txForm.date) return toast.error('يرجى تعبئة الحقول');
    setSaving(true);
    try {
      await api.createEmployeeTransaction({ employeeId: parseInt(txForm.employeeId), type: txForm.type, amount: parseFloat(txForm.amount), date: txForm.date, notes: txForm.notes });
      toast.success('تم تسجيل المعاملة');
      setShowTxForm(false);
      setTxForm({ employeeId: '', type: 'salary', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };
  const handleDeleteTx = async (id: number) => {
    try { await api.deleteEmployeeTransaction(id); toast.success('تم الحذف'); loadAll(); }
    catch (e: any) { toast.error(e.message); }
  };

  // ── Absence ───────────────────────────────────────────────────────────────
  const handleCreateAbs = async () => {
    if (!absForm.employeeId || !absForm.date) return toast.error('الموظف والتاريخ مطلوبان');
    setSaving(true);
    try {
      await api.createEmployeeAbsence({ employeeId: parseInt(absForm.employeeId), date: absForm.date, reason: absForm.reason });
      toast.success('تم تسجيل الغياب');
      setShowAbsForm(false);
      setAbsForm({ employeeId: '', date: new Date().toISOString().split('T')[0], reason: '' });
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };
  const handleDeleteAbs = async (id: number) => {
    try { await api.deleteEmployeeAbsence(id); toast.success('تم الحذف'); loadAll(); }
    catch (e: any) { toast.error(e.message); }
  };

  // ── Excel export ──────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = transactions.map(t => `<tr><td>${t.employeeName}</td><td>${TX_TYPES[t.type]?.label || t.type}</td><td>${t.amount}</td><td>${t.date}</td><td>${t.notes || ''}</td></tr>`).join('');
    const table = `<html dir="rtl"><head><meta charset="utf-8"></head><body><table border="1"><tr><th>الموظف</th><th>النوع</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th></tr>${rows}</table></body></html>`;
    const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'payroll.xls'; a.click();
  };

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filteredEmp  = employees.filter(e => !search || e.name.includes(search));
  const filteredAdvs = advances.filter(a => (!filterEmp || a.employeeId === filterEmp) && (!filterStatus || a.status === filterStatus) && (!search || a.employeeName.includes(search)));
  const filteredTx   = transactions.filter(t => (!filterEmp || t.employeeId === filterEmp) && (!filterType || t.type === filterType) && (!search || t.employeeName.includes(search)));
  const filteredAbs  = absences.filter(a => (!filterEmp || a.employeeId === filterEmp) && (!search || a.employeeName.includes(search)));

  const activeEmployees = employees.filter(e => e.status === 'active');

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ direction: 'rtl' }}>

      {/* Header */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex items-center gap-6 mb-6 print:hidden">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
          <DollarSign className="text-white w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">محاسبة الموظفين</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">إدارة مستقلة للرواتب، السلف، الخصومات والمكافآت</p>
        </div>
        <button onClick={loadAll} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors mr-auto">
          <RefreshCcw size={16} className={loading ? 'animate-spin text-indigo-600' : 'text-slate-600'} />
        </button>
      </div>

      {/* Tabs */}
      <div className="glass-card rounded-[2rem] p-3 mb-6 flex gap-2 flex-wrap print:hidden">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', background: active ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'transparent', color: active ? '#fff' : '#64748b', boxShadow: active ? '0 4px 12px rgba(99,102,241,0.35)' : 'none' }}>
              <Icon size={14} />{tab.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 font-bold text-sm">جاري التحميل...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* ═══ DASHBOARD ═══ */}
          {activeTab === 'dashboard' && summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard title="إجمالي الرواتب الشهرية" value={formatIQD(summary.totalSalaries)} icon={DollarSign} color="#6366f1" sub={`${activeEmployees.length} موظف نشط`} />
                <StatCard title="سلف نشطة" value={summary.activeAdvancesCount} icon={CreditCard} color="#f59e0b" />
                <StatCard title="إجمالي المديونية" value={formatIQD(summary.totalOutstanding)} icon={TrendingDown} color="#ef4444" />
                <StatCard title="سلف مكتملة" value={summary.completedAdvancesCount} icon={CheckCircle} color="#10b981" />
                <StatCard title="إجمالي الخصومات" value={formatIQD(summary.totalDeductions)} icon={TrendingDown} color="#f97316" />
                <StatCard title="إجمالي المكافآت" value={formatIQD(summary.totalBonuses)} icon={TrendingUp} color="#8b5cf6" />
              </div>

              {/* Employee salary overview */}
              <div className="glass-card rounded-[2rem] overflow-hidden">
                <div className="p-5 border-b border-white/40 flex items-center justify-between">
                  <h3 className="font-black text-slate-800 flex items-center gap-2"><Users size={16} className="text-indigo-600" /> كشف الرواتب</h3>
                </div>
                <table className="w-full text-right text-sm">
                  <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3 font-black">الموظف</th><th className="p-3 font-black">المنصب</th><th className="p-3 font-black">الراتب الشهري</th><th className="p-3 font-black">الأجر اليومي</th><th className="p-3 font-black">سلفة نشطة</th><th className="p-3 font-black">الراتب المتبقي</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeEmployees.map(emp => {
                      const empAdv = advances.find(a => a.employeeId === emp.id && a.status === 'active');
                      const deductions = transactions.filter(t => t.employeeId === emp.id && t.type === 'deduction').reduce((s, t) => s + t.amount, 0);
                      const bonuses    = transactions.filter(t => t.employeeId === emp.id && t.type === 'bonus').reduce((s, t) => s + t.amount, 0);
                      const remaining  = (emp.monthlySalary || 0) - (empAdv?.remaining || 0) - deductions + bonuses;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{emp.name}</td>
                          <td className="p-3 text-slate-500 text-xs">{emp.position || '—'}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{formatIQD(emp.monthlySalary)}</td>
                          <td className="p-3 font-mono text-slate-600">{formatIQD(emp.dailyWage)}</td>
                          <td className="p-3">{empAdv ? <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-bold">{formatIQD(empAdv.remaining)}</span> : <span className="text-slate-300 text-xs">لا يوجد</span>}</td>
                          <td className="p-3 font-mono font-bold" style={{ color: remaining >= 0 ? '#10b981' : '#ef4444' }}>{formatIQD(remaining)}</td>
                        </tr>
                      );
                    })}
                    {activeEmployees.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-slate-400 font-bold text-sm">أضف موظفين أولاً من قسم "إدارة الموظفين"</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ STAFF ═══ */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="glass-card rounded-[2rem] p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="input-field pr-9" />
                </div>
                {canCreate && (
                  <button onClick={openAddEmp} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white mr-auto" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                    <Plus size={15} /> إضافة موظف
                  </button>
                )}
              </div>

              <div className="glass-card rounded-[2rem] overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead><tr className="bg-white/50 text-slate-600 border-b border-white"><th className="p-4 font-black">الاسم</th><th className="p-4 font-black">المنصب</th><th className="p-4 font-black">الهاتف</th><th className="p-4 font-black">الراتب الشهري</th><th className="p-4 font-black">الأجر اليومي</th><th className="p-4 font-black">تاريخ التعيين</th><th className="p-4 font-black">الحالة</th><th className="p-4 font-black text-center">إدارة</th></tr></thead>
                  <tbody className="divide-y divide-white/40">
                    {filteredEmp.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-bold">لا يوجد موظفون — أضف الأول الآن</td></tr>}
                    {filteredEmp.map(emp => (
                      <tr key={emp.id} className="hover:bg-white/60 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{emp.name}</td>
                        <td className="p-4 text-slate-500">{emp.position || '—'}</td>
                        <td className="p-4 font-mono text-slate-500 text-xs">{emp.phone || '—'}</td>
                        <td className="p-4 font-mono font-bold text-indigo-700">{formatIQD(emp.monthlySalary)}</td>
                        <td className="p-4 font-mono text-slate-600">{formatIQD(emp.dailyWage)}</td>
                        <td className="p-4 font-mono text-slate-500 text-xs">{emp.hireDate || '—'}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${emp.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{emp.status === 'active' ? 'نشط' : 'متوقف'}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {canEdit && <button onClick={() => openEditEmp(emp)} className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"><Edit3 size={13} /></button>}
                            {canDelete && <button onClick={() => handleDeleteEmp(emp.id, emp.name)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"><Trash2 size={13} /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ ADVANCES ═══ */}
          {activeTab === 'advances' && (
            <div className="space-y-4">
              <div className="glass-card rounded-[2rem] p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48"><Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="input-field pr-9" /></div>
                <select value={filterEmp} onChange={e => setFilterEmp(e.target.value ? parseInt(e.target.value) : '')} className="input-field w-auto"><option value="">كل الموظفين</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-auto"><option value="">كل الحالات</option><option value="active">نشطة</option><option value="completed">مكتملة</option></select>
                {canCreate && employees.length > 0 && (
                  <button onClick={() => setShowAdvForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white mr-auto" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                    <Plus size={15} /> إضافة سلفة
                  </button>
                )}
              </div>
              <div className="glass-card rounded-[2rem] overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead><tr className="bg-white/50 text-slate-600 border-b border-white">
                    <th className="p-4 font-black">الموظف</th>
                    <th className="p-4 font-black">مبلغ السلفة</th>
                    <th className="p-4 font-black">تاريخ البدء</th>
                    <th className="p-4 font-black">تاريخ الانتهاء</th>
                    <th className="p-4 font-black">الأجر اليومي</th>
                    <th className="p-4 font-black">المسدد</th>
                    <th className="p-4 font-black">المتبقي</th>
                    <th className="p-4 font-black">أيام السداد</th>
                    <th className="p-4 font-black">التقدم</th>
                    <th className="p-4 font-black">الحالة</th>
                    <th className="p-4 font-black">إجراءات</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/40">
                    {filteredAdvs.length === 0 && <tr><td colSpan={11} className="py-12 text-center text-slate-400 font-bold">لا توجد سلف</td></tr>}
                    {filteredAdvs.map(adv => {
                      const pct = adv.amount > 0 ? Math.min(100, Math.round((adv.amountRepaid / adv.amount) * 100)) : 0;
                      // حساب الأيام المتبقية من اليوم حتى تاريخ الانتهاء
                      const today = new Date();
                      const endDate = adv.expectedCompletion ? new Date(adv.expectedCompletion) : null;
                      const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))) : 0;
                      const isOverdue = endDate && today > endDate && adv.status === 'active';

                      return (
                        <tr key={adv.id} className="hover:bg-white/60 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{adv.employeeName}</td>
                          <td className="p-4 font-mono font-bold text-indigo-700">{formatIQD(adv.amount)}</td>
                          {/* تاريخ البدء */}
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-slate-400 text-[10px] font-bold">بدأت</span>
                              <span className="font-mono text-slate-700 text-xs font-bold">{adv.advanceDate}</span>
                            </div>
                          </td>
                          {/* تاريخ الانتهاء */}
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-slate-400 text-[10px] font-bold">تنتهي</span>
                              <span className="font-mono text-xs font-bold" style={{ color: isOverdue ? '#ef4444' : adv.status === 'completed' ? '#10b981' : '#6366f1' }}>
                                {adv.expectedCompletion || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-slate-500 text-xs">{formatIQD(adv.dailyWage)}</td>
                          <td className="p-4 font-mono text-emerald-600 font-bold">{formatIQD(adv.amountRepaid)}</td>
                          <td className="p-4 font-mono font-bold" style={{ color: adv.remaining > 0 ? '#f59e0b' : '#10b981' }}>{formatIQD(adv.remaining)}</td>
                          {/* أيام متبقية */}
                          <td className="p-4">
                            {adv.status === 'completed' ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg text-xs font-bold">مكتملة ✓</span>
                            ) : isOverdue ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded-lg text-xs font-bold">تأخرت!</span>
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-black text-lg text-indigo-700">{daysLeft}</span>
                                <span className="text-slate-400 text-[10px]">يوم متبقي</span>
                              </div>
                            )}
                          </td>
                          {/* شريط التقدم */}
                          <td className="p-4 min-w-[100px]">
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span style={{ color: pct >= 100 ? '#10b981' : '#6366f1' }}>{pct}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : `linear-gradient(90deg,#6366f1,#f59e0b)` }} />
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">{adv.repaymentDays} يوم إجمالي</div>
                            </div>
                          </td>
                          <td className="p-4">
                            {adv.status === 'active'
                              ? <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-xl text-xs font-bold">نشطة</span>
                              : <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold">مكتملة</span>}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {adv.status === 'active' && canEdit && (
                                <button onClick={() => { setRepayTarget(adv); setShowRepayForm(true); }} className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg flex items-center gap-1 text-[10px] font-bold" title="تسديد يدوي">
                                  <DollarSign size={13} /> تسديد
                                </button>
                              )}
                              {canDelete && <button onClick={() => handleDeleteAdv(adv.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"><Trash2 size={13} /></button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* ═══ TRANSACTIONS ═══ */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="glass-card rounded-[2rem] p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48"><Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="input-field pr-9" /></div>
                <select value={filterEmp} onChange={e => setFilterEmp(e.target.value ? parseInt(e.target.value) : '')} className="input-field w-auto"><option value="">كل الموظفين</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-auto"><option value="">كل الأنواع</option>{Object.entries(TX_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
                {canCreate && employees.length > 0 && (
                  <button onClick={() => setShowTxForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white mr-auto" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                    <Plus size={15} /> إضافة معاملة
                  </button>
                )}
              </div>
              <div className="glass-card rounded-[2rem] overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead><tr className="bg-white/50 text-slate-600 border-b border-white"><th className="p-4 font-black">الموظف</th><th className="p-4 font-black">النوع</th><th className="p-4 font-black">المبلغ</th><th className="p-4 font-black">التاريخ</th><th className="p-4 font-black">الملاحظات</th><th className="p-4 font-black">متبقي السلفة</th><th className="p-4 font-black">حذف</th></tr></thead>
                  <tbody className="divide-y divide-white/40">
                    {filteredTx.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-slate-400 font-bold">لا توجد معاملات</td></tr>}
                    {filteredTx.map(t => {
                      const st = TX_TYPES[t.type] || { label: t.type, color: '#64748b', bg: '#f1f5f9' };
                      return (
                        <tr key={t.id} className="hover:bg-white/60 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{t.employeeName}</td>
                          <td className="p-4"><span className="px-3 py-1 rounded-xl text-xs font-bold border" style={{ color: st.color, background: st.bg, borderColor: st.color + '30' }}>{st.label}</span></td>
                          <td className="p-4 font-mono font-bold" style={{ color: st.color }}>{formatIQD(t.amount)}</td>
                          <td className="p-4 font-mono text-slate-500 text-xs">{t.date}</td>
                          <td className="p-4 text-slate-500 text-xs">{t.notes || '—'}</td>
                          <td className="p-4 font-mono text-amber-600 text-xs">{t.remainingAdvance > 0 ? formatIQD(t.remainingAdvance) : '—'}</td>
                          <td className="p-4">{canDelete && <button onClick={() => handleDeleteTx(t.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"><Trash2 size={13} /></button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ ABSENCES ═══ */}
          {activeTab === 'absences' && (
            <div className="space-y-4">
              <div className="glass-card rounded-[2rem] p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48"><Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="input-field pr-9" /></div>
                <select value={filterEmp} onChange={e => setFilterEmp(e.target.value ? parseInt(e.target.value) : '')} className="input-field w-auto"><option value="">كل الموظفين</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
                {canCreate && employees.length > 0 && (
                  <button onClick={() => setShowAbsForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white mr-auto" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
                    <Plus size={15} /> تسجيل غياب
                  </button>
                )}
              </div>
              <div className="glass-card rounded-[2rem] overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead><tr className="bg-white/50 text-slate-600 border-b border-white"><th className="p-4 font-black">الموظف</th><th className="p-4 font-black">التاريخ</th><th className="p-4 font-black">السبب</th><th className="p-4 font-black">حذف</th></tr></thead>
                  <tbody className="divide-y divide-white/40">
                    {filteredAbs.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold">لا توجد غيابات</td></tr>}
                    {filteredAbs.map(a => (
                      <tr key={a.id} className="hover:bg-white/60 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{a.employeeName}</td>
                        <td className="p-4 font-mono text-slate-500">{a.date}</td>
                        <td className="p-4 text-slate-500">{a.reason || '—'}</td>
                        <td className="p-4">{canDelete && <button onClick={() => handleDeleteAbs(a.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"><Trash2 size={13} /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ REPORTS ═══ */}
          {activeTab === 'reports' && (
            <>
              {/* Normal Screen View */}
              <div className="space-y-6 print:hidden">
                <div className="glass-card rounded-[2rem] p-5 flex flex-wrap gap-3 items-center">
                  <select value={filterEmp} onChange={e => setFilterEmp(e.target.value ? parseInt(e.target.value) : '')} className="input-field w-auto"><option value="">جميع الموظفين</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
                  <div className="flex gap-2 mr-auto">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}><Printer size={14} /> طباعة</button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}><Download size={14} /> Excel</button>
                  </div>
                </div>
                <div className="glass-card rounded-[2rem] p-8 space-y-6">
                  <h2 className="text-2xl font-black text-slate-900 border-b border-slate-200 pb-4">تقرير محاسبة الموظفين — {new Date().toLocaleDateString('ar-IQ')}</h2>
                  <div>
                    <h3 className="font-black text-slate-800 mb-3">السلف ({(filterEmp ? advances.filter(a => a.employeeId === filterEmp) : advances).length})</h3>
                    <table className="w-full text-sm border-collapse">
                      <thead><tr className="bg-slate-900 text-white"><th className="p-3 text-right">الموظف</th><th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">المسدد</th><th className="p-3 text-right">المتبقي</th><th className="p-3 text-right">الحالة</th></tr></thead>
                      <tbody>{(filterEmp ? advances.filter(a => a.employeeId === filterEmp) : advances).map(a => (<tr key={a.id} className="border-b border-slate-100"><td className="p-3">{a.employeeName}</td><td className="p-3 font-mono">{formatIQD(a.amount)}</td><td className="p-3 font-mono">{formatIQD(a.amountRepaid)}</td><td className="p-3 font-mono">{formatIQD(a.remaining)}</td><td className="p-3">{a.status === 'active' ? 'نشطة' : 'مكتملة'}</td></tr>))}</tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 mb-3">المعاملات المالية</h3>
                    <table className="w-full text-sm border-collapse">
                      <thead><tr className="bg-slate-900 text-white"><th className="p-3 text-right">الموظف</th><th className="p-3 text-right">النوع</th><th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">التاريخ</th></tr></thead>
                      <tbody>{(filterEmp ? transactions.filter(t => t.employeeId === filterEmp) : transactions).map(t => (<tr key={t.id} className="border-b border-slate-100"><td className="p-3">{t.employeeName}</td><td className="p-3">{TX_TYPES[t.type]?.label || t.type}</td><td className="p-3 font-mono">{formatIQD(t.amount)}</td><td className="p-3 font-mono">{t.date}</td></tr>))}</tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Print Only View */}
              <div id="employee-print-view" className="hidden print:block w-full m-0 min-h-screen" style={{ padding: '15mm', backgroundColor: 'white' }} dir="rtl">
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    @page { size: A4 portrait; margin: 0; }
                    html, body, #root, main { 
                      display: block !important;
                      overflow: visible !important; 
                      height: auto !important; 
                      min-height: 100vh !important;
                      background-color: white !important;
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    
                    /* Force black text and standard borders against dark mode */
                    #employee-print-view, #employee-print-view * {
                      color: black !important;
                      border-color: #cbd5e1 !important;
                    }
                    #employee-print-view th {
                      background-color: #f1f5f9 !important;
                    }

                    .print-break-inside-avoid { page-break-inside: avoid; }
                    
                    /* Hide App layout wrappers */
                    header, aside, .liquid-bg-1, .liquid-bg-2, .liquid-bg-3 { display: none !important; }
                    
                    /* Reset flex wrappers */
                    #root > div { display: block !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; }
                    #root > div > div { display: block !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; }
                    main { max-width: none !important; margin: 0 !important; padding: 0 !important; }

                    /* Prevent tables from causing empty pages */
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                  }
                `}} />
                <h2 className="text-2xl font-black border-b pb-4 mb-6">تقرير محاسبة الموظفين — {new Date().toLocaleDateString('ar-IQ')}</h2>
                
                <div className="mb-8 print-break-inside-avoid">
                  <h3 className="font-black text-lg mb-3">السلف ({(filterEmp ? advances.filter(a => a.employeeId === filterEmp) : advances).length})</h3>
                  <table className="w-full text-sm border-collapse border">
                    <thead><tr><th className="p-3 border text-right">الموظف</th><th className="p-3 border text-right">المبلغ</th><th className="p-3 border text-right">المسدد</th><th className="p-3 border text-right">المتبقي</th><th className="p-3 border text-right">الحالة</th></tr></thead>
                    <tbody>{(filterEmp ? advances.filter(a => a.employeeId === filterEmp) : advances).map(a => (<tr key={a.id} className="border-b"><td className="p-3 border">{a.employeeName}</td><td className="p-3 border font-mono">{formatIQD(a.amount)}</td><td className="p-3 border font-mono">{formatIQD(a.amountRepaid)}</td><td className="p-3 border font-mono">{formatIQD(a.remaining)}</td><td className="p-3 border">{a.status === 'active' ? 'نشطة' : 'مكتملة'}</td></tr>))}</tbody>
                  </table>
                </div>
                
                <div className="print-break-inside-avoid">
                  <h3 className="font-black text-lg mb-3">المعاملات المالية</h3>
                  <table className="w-full text-sm border-collapse border">
                    <thead><tr><th className="p-3 border text-right">الموظف</th><th className="p-3 border text-right">النوع</th><th className="p-3 border text-right">المبلغ</th><th className="p-3 border text-right">التاريخ</th></tr></thead>
                    <tbody>{(filterEmp ? transactions.filter(t => t.employeeId === filterEmp) : transactions).map(t => (<tr key={t.id} className="border-b"><td className="p-3 border">{t.employeeName}</td><td className="p-3 border">{TX_TYPES[t.type]?.label || t.type}</td><td className="p-3 border font-mono">{formatIQD(t.amount)}</td><td className="p-3 border font-mono">{t.date}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ═══ MODALS ═══ */}

      {/* Add/Edit Employee */}
      {showEmpForm && (
        <Modal title={editEmp ? `تعديل: ${editEmp.name}` : 'إضافة موظف جديد'} onClose={() => setShowEmpForm(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="الاسم الكامل *">
                <input value={empForm.name} onChange={e => setEmpForm(p => ({ ...p, name: e.target.value }))} placeholder="اسم الموظف" className="input-field" />
              </FormField>
              <FormField label="المنصب / الوظيفة">
                <input value={empForm.position} onChange={e => setEmpForm(p => ({ ...p, position: e.target.value }))} placeholder="مثال: محاسب" className="input-field" />
              </FormField>
              <FormField label="رقم الهاتف">
                <input value={empForm.phone} onChange={e => setEmpForm(p => ({ ...p, phone: e.target.value }))} placeholder="07xx..." className="input-field" style={{ direction: 'ltr' }} />
              </FormField>
              <FormField label="تاريخ التعيين">
                <input type="date" value={empForm.hireDate} onChange={e => setEmpForm(p => ({ ...p, hireDate: e.target.value }))} className="input-field" />
              </FormField>
              <FormField label="الراتب الشهري (د.ع)">
                <input type="number" value={empForm.monthlySalary} onChange={e => setEmpForm(p => ({ ...p, monthlySalary: e.target.value }))} placeholder="0" className="input-field" style={{ direction: 'ltr' }} />
              </FormField>
              <FormField label="الأجر اليومي (د.ع)">
                <input type="number" value={empForm.dailyWage} onChange={e => setEmpForm(p => ({ ...p, dailyWage: e.target.value }))} placeholder="0" className="input-field" style={{ direction: 'ltr' }} />
              </FormField>
            </div>
            {empForm.monthlySalary && empForm.dailyWage && parseFloat(empForm.dailyWage) > 0 && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 text-xs font-bold">
                {Math.round(parseFloat(empForm.monthlySalary) / parseFloat(empForm.dailyWage))} يوم عمل تقريباً في الشهر
              </div>
            )}
            <FormField label="ملاحظات">
              <input value={empForm.notes} onChange={e => setEmpForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري..." className="input-field" />
            </FormField>
            <ModalFooter onCancel={() => setShowEmpForm(false)} onSave={handleSaveEmp} saving={saving} label={editEmp ? 'حفظ التعديلات' : 'إضافة الموظف'} color="#6366f1" />
          </div>
        </Modal>
      )}

      {/* Advance Form */}
      {showAdvForm && (
        <Modal title="إضافة سلفة" onClose={() => setShowAdvForm(false)}>
          <div className="space-y-4">
            <FormField label="الموظف *">
              <select value={advForm.employeeId} onChange={e => setAdvForm(p => ({ ...p, employeeId: e.target.value }))} className="input-field">
                <option value="">اختر موظفاً...</option>
                {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name} — {formatIQD(e.dailyWage)} / يوم</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="المبلغ *"><input type="number" value={advForm.amount} onChange={e => setAdvForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="input-field" style={{ direction: 'ltr' }} /></FormField>
              <FormField label="التاريخ *"><input type="date" value={advForm.advanceDate} onChange={e => setAdvForm(p => ({ ...p, advanceDate: e.target.value }))} className="input-field" /></FormField>
            </div>
            <FormField label="ملاحظات"><input value={advForm.notes} onChange={e => setAdvForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري..." className="input-field" /></FormField>
            {advPreview.repaymentDays > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '14px', padding: '14px' }}>
                <div className="text-xs font-bold text-amber-700 mb-3 flex items-center gap-2"><AlertCircle size={13} /> الحساب التلقائي</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xs text-slate-500 mb-1">الأجر اليومي</div><div className="font-bold text-amber-700 text-xs">{formatIQD(advPreview.dailyWage)}</div></div>
                  <div><div className="text-xs text-slate-500 mb-1">أيام السداد</div><div className="font-black text-2xl text-indigo-700">{advPreview.repaymentDays}</div></div>
                  <div><div className="text-xs text-slate-500 mb-1">تاريخ الانتهاء</div><div className="font-bold text-emerald-700 text-xs">{advPreview.expectedCompletion}</div></div>
                </div>
              </div>
            )}
            <ModalFooter onCancel={() => setShowAdvForm(false)} onSave={handleCreateAdvance} saving={saving} label="تسجيل السلفة" color="#f59e0b" />
          </div>
        </Modal>
      )}

      {/* Repay Advance Modal */}
      {showRepayForm && repayTarget && (
        <Modal title="تسديد سلفة يدوياً" onClose={() => setShowRepayForm(false)}>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4 text-center">
              الموظف: <strong>{repayTarget.employeeName}</strong> <br/>
              المتبقي من السلفة: <strong className="text-rose-600">{formatIQD(repayTarget.remaining)}</strong>
            </div>
            <FormField label="المبلغ المراد تسديده الآن (د.ع) *">
              <input type="number" value={repayAmount} onChange={e => setRepayAmount(e.target.value)} placeholder="مثال: 50000" className="input-field text-xl font-bold font-mono text-center" style={{ direction: 'ltr' }} />
            </FormField>
            <ModalFooter onCancel={() => setShowRepayForm(false)} onSave={handleRepayAdvance} saving={saving} label="تسديد الآن" color="#10b981" />
          </div>
        </Modal>
      )}

      {/* Transaction Form */}
      {showTxForm && (
        <Modal title="إضافة معاملة مالية" onClose={() => setShowTxForm(false)}>
          <div className="space-y-4">
            <FormField label="الموظف *"><select value={txForm.employeeId} onChange={e => setTxForm(p => ({ ...p, employeeId: e.target.value }))} className="input-field"><option value="">اختر موظفاً...</option>{activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="نوع المعاملة *"><select value={txForm.type} onChange={e => setTxForm(p => ({ ...p, type: e.target.value }))} className="input-field">{Object.entries(TX_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></FormField>
              <FormField label="المبلغ *"><input type="number" value={txForm.amount} onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="input-field" style={{ direction: 'ltr' }} /></FormField>
            </div>
            <FormField label="التاريخ *"><input type="date" value={txForm.date} onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))} className="input-field" /></FormField>
            <FormField label="ملاحظات"><input value={txForm.notes} onChange={e => setTxForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري..." className="input-field" /></FormField>
            <ModalFooter onCancel={() => setShowTxForm(false)} onSave={handleCreateTx} saving={saving} label="تسجيل المعاملة" color="#6366f1" />
          </div>
        </Modal>
      )}

      {/* Absence Form */}
      {showAbsForm && (
        <Modal title="تسجيل غياب" onClose={() => setShowAbsForm(false)}>
          <div className="space-y-4">
            <FormField label="الموظف *"><select value={absForm.employeeId} onChange={e => setAbsForm(p => ({ ...p, employeeId: e.target.value }))} className="input-field"><option value="">اختر موظفاً...</option>{activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></FormField>
            <FormField label="التاريخ *"><input type="date" value={absForm.date} onChange={e => setAbsForm(p => ({ ...p, date: e.target.value }))} className="input-field" /></FormField>
            <FormField label="السبب"><input value={absForm.reason} onChange={e => setAbsForm(p => ({ ...p, reason: e.target.value }))} placeholder="اختياري..." className="input-field" /></FormField>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-bold flex items-start gap-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              يوم الغياب لن يُحسب من السلفة تلقائياً
            </div>
            <ModalFooter onCancel={() => setShowAbsForm(false)} onSave={handleCreateAbs} saving={saving} label="تسجيل الغياب" color="#ef4444" />
          </div>
        </Modal>
      )}

      <style>{`
        .input-field { width: 100%; box-sizing: border-box; background: rgba(248,250,252,0.9); border: 1px solid #e2e8f0; border-radius: 10px; padding: 9px 12px; font-size: 13px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .input-field:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
      `}</style>
    </div>
  );
}

// ─── Shared UI Helpers ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(6px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', overflow: 'hidden', direction: 'rtl' }}
        onMouseDown={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', color: '#e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: '14px' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '5px', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

function ModalFooter({ onCancel, onSave, saving, label, color }: { onCancel: () => void; onSave: () => void; saving: boolean; label: string; color: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">إلغاء</button>
      <button onClick={onSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
        style={{ background: `linear-gradient(135deg,${color},${color}cc)`, boxShadow: `0 4px 14px ${color}35`, opacity: saving ? 0.7 : 1 }}>
        {saving
          ? <><span style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> جاري الحفظ...</>
          : <><Save size={13} /> {label}</>}
      </button>
    </div>
  );
}
