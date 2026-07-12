import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import {
  Landmark, ArrowDownToLine, Receipt, FileText, Search, Plus, Calendar, User, UserCheck, Trash2, CheckCircle2, X
} from 'lucide-react';

interface BankSettlementScreenProps {
  permissions: any;
  user: any;
}

export default function BankSettlementScreen({ permissions, user }: BankSettlementScreenProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'withdrawals'>('invoices');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Withdraw Modal
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [withdrawNotes, setWithdrawNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getBankSettlement();
      setInvoices(res.invoices || []);
      setWithdrawals(res.withdrawals || []);
    } catch (err: any) {
      toast.error('فشل في جلب بيانات تسوية البنك: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissions?.bankSettlement?.view) {
      loadData();
    }
  }, []);

  const totalMasterCardAmount = invoices.reduce((acc, inv) => acc + (parseFloat(inv.finalAmount) || 0), 0);
  const totalWithdrawnAmount = withdrawals.reduce((acc, w) => acc + (parseFloat(w.amount) || 0), 0);
  const remainingBalance = Math.max(0, totalMasterCardAmount - totalWithdrawnAmount);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter ? inv.date === dateFilter : true;
    return matchesSearch && matchesDate;
  });

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح');
      return;
    }
    if (parseFloat(withdrawAmount) > remainingBalance) {
      toast.error('المبلغ المطلوب سحبه يتجاوز الرصيد المتاح في البنك');
      return;
    }

    try {
      setActionLoading(true);
      await api.withdrawFromBank(parseFloat(withdrawAmount), withdrawDate, withdrawNotes);
      toast.success('تم تسجيل عملية السحب من البنك بنجاح');
      setIsWithdrawOpen(false);
      setWithdrawAmount('');
      setWithdrawNotes('');
      // Optimistic or refetch
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء السحب');
    } finally {
      setActionLoading(false);
    }
  };

  if (!permissions?.bankSettlement?.view) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        عذراً، لا تملك الصلاحية للاطلاع على بيانات تسوية البنك.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Landmark className="text-indigo-600" />
          تسوية بنك الماستركارد
        </h2>
        {permissions?.bankSettlement?.create && (
          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
          >
            <ArrowDownToLine className="w-5 h-5" />
            تسجيل سحب بنكي جديد
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">إجمالي إيرادات الماستركارد</p>
            <h3 className="text-2xl font-bold font-mono text-slate-800">{formatIQD(totalMasterCardAmount)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
            <ArrowDownToLine className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">إجمالي المبالغ المسحوبة</p>
            <h3 className="text-2xl font-bold font-mono text-rose-600">{formatIQD(totalWithdrawnAmount)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">الرصيد المتبقي في البنك</p>
            <h3 className="text-2xl font-bold font-mono text-emerald-600">{formatIQD(remainingBalance)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Tabs & Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-300/30 flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex bg-slate-400/30 p-1 rounded-lg self-start">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-700 hover:text-slate-900'
                }`}
            >
              فواتير الماستركارد
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'withdrawals' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-700 hover:text-slate-900'
                }`}
            >
              سجل السحوبات المالية
            </button>
          </div>

          {activeTab === 'invoices' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث برقم الفاتورة أو العميل..."
                  className="pl-4 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        <div className="p-0 overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400">جاري تحميل السجلات...</div>
          ) : activeTab === 'invoices' ? (
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4">رقم الفاتورة</th>
                  <th className="px-6 py-4">العميل</th>
                  <th className="px-6 py-4">المبلغ النهائي المسدد</th>
                  <th className="px-6 py-4">منظم الفاتورة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">لا توجد فواتير مطابقة</td></tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono text-slate-500">{inv.date}</td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{inv.customerName}</td>
                      <td className="px-6 py-4 font-mono font-bold text-indigo-700">{formatIQD(inv.finalAmount)}</td>
                      <td className="px-6 py-4 text-slate-500">{inv.createdBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">تاريخ السحب</th>
                  <th className="px-6 py-4">المبلغ المسحوب</th>
                  <th className="px-6 py-4">الملاحظات</th>
                  <th className="px-6 py-4">سُحب بواسطة (الموظف)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">لا يوجد سجل سحوبات من البنك</td></tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono text-slate-500">{w.date}</td>
                      <td className="px-6 py-4 font-mono font-bold text-rose-600">{formatIQD(w.amount)}</td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{w.notes || '-'}</td>
                      <td className="px-6 py-4 text-slate-500 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-slate-400" />
                        {w.user}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isWithdrawOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5" />
                تسجيل سحب بنكي جديد
              </h3>
              <button onClick={() => setIsWithdrawOpen(false)} className="text-indigo-200 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="p-6 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-3 rounded-lg text-sm font-semibold flex justify-between items-center">
                <span>الرصيد المتاح للسحب:</span>
                <span className="font-mono font-bold">{formatIQD(remainingBalance)}</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">المبلغ المراد سحبه (IQD)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                    د.ع
                  </span>
                  <input
                    type="text"
                    value={withdrawAmount ? Number(withdrawAmount).toLocaleString('en-US') : ''}
                    onChange={(e) => setWithdrawAmount(e.target.value.replace(/,/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pr-10 pl-3 text-left font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">تاريخ السحب</label>
                <input
                  type="date"
                  value={withdrawDate}
                  onChange={(e) => setWithdrawDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">ملاحظات والتفاصيل</label>
                <textarea
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24"
                  placeholder="سبب السحب، اسم المستلم، أو أي تفاصيل أخرى..."
                />
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري السحب...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      تأكيد السحب
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
