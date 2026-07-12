/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import {
  TrendingUp, Download, Upload, ShieldCheck, Database,
  Calendar, CheckSquare, Sparkles, Filter, FileSpreadsheet,
  PieChart, Activity, Clock
} from 'lucide-react';

interface ReportsScreenProps {
  onNavigate: (tab: string) => void;
  permissions?: any;
}

export default function ReportsScreen({ onNavigate, permissions }: ReportsScreenProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSegment, setActiveSegment] = useState<'financial' | 'backups' | 'audit'>(
    permissions?.reports?.view ? 'financial' : (permissions?.backups?.view ? 'backups' : 'audit')
  );

  // Filter dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReportsAndAudits = async () => {
    try {
      setLoading(true);
      const invs = await api.getInvoices().catch(() => []);
      const insts = await api.getInstallments().catch(() => []);
      const auditsRes = await api.getAudits().catch(() => []);

      setInvoices(invs);
      setInstallments(insts);
      setLogs(auditsRes);
    } catch (err) {
      toast.error('فشل في جلب الفواتير أو المجدولات والتحليلات للتقارير الفنية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsAndAudits();
  }, []);

  // Backups download operation
  const downloadBackupFile = async () => {
    if (!permissions?.backups?.export) {
      toast.error('ليس لديك صلاحية تحميل النسخ الاحتياطي');
      return;
    }
    try {
      setLoading(true);
      const dbState = await api.downloadBackup();
      
      const valString = JSON.stringify(dbState, null, 2);
      const blob = new Blob([valString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `shams_iraq_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('بوابة الأمان: تم تحميل وتصدير كامل نسخة قاعدة البيانات لملف JSON آمن بنجاح!');
    } catch (err: any) {
      toast.error(err.message || 'أخفق تحميل ملف النسخة الاحتياطية');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!permissions?.backups?.create) {
      toast.error('ليس لديك صلاحية استعادة النسخ الاحتياطي');
      e.target.value = '';
      return;
    }

    const file = files[0];

    toast('تحذير أمان صارم: هل ترغب حقاً باسترجاع قواعد البيانات للمنظومة بالكامل؟ سيتم مسح واستبدال البيانات الحالية بالكامل بمحتويات ملف النسخ الاحتياطي.', {
      action: {
        label: 'تأكيد الاستعادة',
        onClick: async () => {
          try {
            setLoading(true);
            const reader = new FileReader();
            
            reader.onload = async (event) => {
              try {
                const jsonText = event.target?.result as string;
                const parsed = JSON.parse(jsonText);
                
                await api.restoreBackup(parsed);
                toast.success('تم استعادة نسخة قاعدة البيانات بنجاح! تم تحديث البيانات تلقائياً.');
                // Refresh current screen data
                loadReportsAndAudits();
                // Navigate to dashboard so other screens reload their data on next visit
                onNavigate('dashboard');
              } catch (e) {
                toast.error('فشل في قراءة الملف كصيغة JSON صالحة لقاعدة البيانات');
              } finally {
                setLoading(false);
              }
            };

            reader.readAsText(file);
          } catch (err: any) {
            toast.error(err.message || 'فشلت عملية الاسترداد السحابية');
            setLoading(false);
          }
        },
      },
      cancel: {
        label: 'إلغاء',
        onClick: () => {},
      },
    });
  };

  const exportDataReportSim = (type: 'pdf' | 'csv') => {
    if (!permissions?.reports?.export) {
      toast.error('ليس لديك صلاحية تصدير التقارير');
      return;
    }
    if (type === 'pdf') {
      window.print();
    } else {
      let csv = 'رقم الفاتورة,تاريخ الفاتورة,إجمالي المبلغ,تكلفة المواد,الربح الصافي\n';
      calculatedInvoices.forEach(i => {
        let items = [];
        try { items = Array.isArray(i.items) ? i.items : (typeof i.items === 'string' ? JSON.parse(i.items) : []); } catch(e) {}
        const cost = items.reduce((s: number, item: any) => s + ((item.purchasePrice || 0) * item.quantity), 0);
        const profit = i.finalAmount - cost;
        csv += `${i.id},${new Date(i.date).toLocaleDateString('ar-IQ')},${i.finalAmount},${cost},${profit}\n`;
      });
      csv += `\nالمجموع الكلي,,${totalSales},${totalCost},${marginProfit}\n`;

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `تقارير_المبيعات_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.success('تم تصدير ملف CSV بنجاح');
    }
  };

  // Calculations
  const calculatedInvoices = invoices.filter(i => {
    if (i.status !== 'active') return false;
    if (!startDate || !endDate) return true;
    const invDate = new Date(i.date);
    return invDate >= new Date(startDate) && invDate <= new Date(endDate);
  });

  const totalSales = calculatedInvoices.reduce((acc, val) => acc + val.finalAmount, 0);
  const totalCost = calculatedInvoices.reduce((acc, val) => {
    let items = [];
    try {
      items = Array.isArray(val.items) ? val.items : (typeof val.items === 'string' ? JSON.parse(val.items) : []);
    } catch(e) {}
    const cost = items.reduce((s: number, item: any) => s + ((item.purchasePrice || 0) * item.quantity), 0);
    return acc + cost;
  }, 0);
  const marginProfit = totalSales - totalCost;

  // Split calculations
  const cashSalesTotal = calculatedInvoices.filter(i => i.invoiceType === 'cash' || i.invoiceType === 'retail').reduce((acc, b) => acc + b.finalAmount, 0);
  const instSalesTotal = calculatedInvoices.filter(i => i.invoiceType === 'installment' || i.invoiceType === 'mastercard').reduce((acc, b) => acc + b.finalAmount, 0);

  const installmentDebtsTotal = installments.reduce((acc, b) => acc + b.remainingAmount, 0);

  return (
    <>
      {/* -------------------- NORMAL SCREEN VIEW -------------------- */}
      <div className="space-y-8 animate-fade-in relative z-10 pb-12 max-w-7xl mx-auto print:hidden">
      
      {/* Title Card (Glassmorphism) */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-200/50 liquid-icon-wrapper shrink-0">
            <PieChart className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">التقارير المتقدمة والنسخ الاحتياطي</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium">نظرة شاملة على الأداء المالي، إدارة قواعد البيانات، وسجل الحركات الرقابي.</p>
          </div>
        </div>

        {/* Segment toggle pill */}
        <div className="flex bg-slate-100/60 backdrop-blur-md p-1.5 rounded-full border border-white/80 w-full lg:w-auto shadow-sm overflow-x-auto custom-scrollbar">
          {permissions?.reports?.view && (
            <button 
              onClick={() => setActiveSegment('financial')}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-full transition-all whitespace-nowrap ${
                activeSegment === 'financial' ? 'bg-white shadow-md text-amber-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              الأداء المالي
            </button>
          )}
          {permissions?.backups?.view && (
            <button 
              onClick={() => setActiveSegment('backups')}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-full transition-all whitespace-nowrap ${
                activeSegment === 'backups' ? 'bg-white shadow-md text-amber-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              الأمان والنسخ الاحتياطي
            </button>
          )}
          {permissions?.auditLogs?.view && (
            <button 
              onClick={() => setActiveSegment('audit')}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-full transition-all whitespace-nowrap ${
                activeSegment === 'audit' ? 'bg-white shadow-md text-amber-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              سجل التدقيق
            </button>
          )}
        </div>
      </div>

      {/* SEGMENT 1: FINANCIAL PERFORMANCE */}
      {activeSegment === 'financial' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Filters Range Card */}
          <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] shadow-lg flex flex-col md:flex-row items-end gap-5 text-sm font-medium print:hidden">
            <div className="flex-1 w-full">
              <label className="block text-slate-600 mb-2 font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                بداية الفترة:
              </label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 font-mono shadow-inner outline-none transition-all text-slate-700"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-slate-600 mb-2 font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                نهاية الفترة:
              </label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 font-mono shadow-inner outline-none transition-all text-slate-700"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="flex-1 md:flex-none px-6 py-3.5 bg-slate-100/80 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all border border-slate-200"
              >
                تفريغ
              </button>
              <button 
                onClick={() => exportDataReportSim('csv')}
                disabled={!permissions?.reports?.export}
                title={!permissions?.reports?.export ? 'ليس لديك صلاحية تصدير التقارير' : ''}
                className={`flex-1 md:flex-none px-6 py-3.5 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
                  !permissions?.reports?.export
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>تصدير CSV</span>
              </button>
              <button 
                onClick={() => exportDataReportSim('pdf')}
                disabled={!permissions?.reports?.export}
                title={!permissions?.reports?.export ? 'ليس لديك صلاحية تصدير التقارير' : ''}
                className={`flex-1 md:flex-none px-6 py-3.5 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
                  !permissions?.reports?.export
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>تصدير PDF</span>
              </button>
            </div>
          </div>

          {/* Quick Numbers Widget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl group-hover:bg-blue-400/40 transition-all"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <span className="text-slate-500 text-xs font-black uppercase tracking-wider block mb-1">إجمالي الإيرادات</span>
                  <p className="text-[10px] text-slate-400 font-bold">كل المبيعات الموثقة للفترة</p>
                </div>
                <div className="mt-6">
                  <span className="text-3xl font-black font-mono text-slate-800 tracking-tighter block">{formatIQD(totalSales)}</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-slate-400/20 rounded-full blur-2xl group-hover:bg-slate-400/40 transition-all"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <span className="text-slate-500 text-xs font-black uppercase tracking-wider block mb-1">إجمالي التكاليف</span>
                  <p className="text-[10px] text-slate-400 font-bold">كلفة الشراء والتجهيز</p>
                </div>
                <div className="mt-6">
                  <span className="text-3xl font-black font-mono text-slate-700 tracking-tighter block">{formatIQD(totalCost)}</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 border-emerald-100 bg-emerald-50/30">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl group-hover:bg-emerald-400/40 transition-all"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <span className="text-emerald-700 text-xs font-black uppercase tracking-wider block mb-1">الأرباح الصافية</span>
                  <p className="text-[10px] text-emerald-600/80 font-bold">فوارق الأسعار المقيدة</p>
                </div>
                <div className="mt-6">
                  <span className="text-3xl font-black font-mono text-emerald-800 tracking-tighter block">{formatIQD(marginProfit)}</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 border-rose-100 bg-rose-50/30">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-rose-400/20 rounded-full blur-2xl group-hover:bg-rose-400/40 transition-all"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <span className="text-rose-700 text-xs font-black uppercase tracking-wider block mb-1">ذمم خارجية متأخرة</span>
                  <p className="text-[10px] text-rose-600/80 font-bold">ديون أقساط قيد السداد</p>
                </div>
                <div className="mt-6">
                  <span className="text-3xl font-black font-mono text-rose-800 tracking-tighter block">{formatIQD(installmentDebtsTotal)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Graphical summary representation */}
          <div className="glass-card p-6 sm:p-10 rounded-[2.5rem] shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-amber-500">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">تقسيم التدفق النقدي</h3>
                <p className="text-xs text-slate-400 font-medium">مبيعات مقيدة حسب نوع الدفع</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="p-6 bg-white/40 rounded-3xl border border-white shadow-sm transition-all hover:bg-white/60">
                <span className="text-slate-500 font-bold text-sm block mb-2">نقدي مباشر ومفرد:</span>
                <span className="font-black text-slate-800 font-mono text-3xl tracking-tighter">{formatIQD(cashSalesTotal)}</span>
                <div className="w-full bg-slate-200/50 h-3 rounded-full mt-6 overflow-hidden shadow-inner">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000" style={{ width: `${totalSales > 0 ? (cashSalesTotal / totalSales) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div className="p-6 bg-white/40 rounded-3xl border border-white shadow-sm transition-all hover:bg-white/60">
                <span className="text-slate-500 font-bold text-sm block mb-2">مبيعات التقسيط والماستركارد:</span>
                <span className="font-black text-slate-800 font-mono text-3xl tracking-tighter">{formatIQD(instSalesTotal)}</span>
                <div className="w-full bg-slate-200/50 h-3 rounded-full mt-6 overflow-hidden shadow-inner">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${totalSales > 0 ? (instSalesTotal / totalSales) * 100 : 0}%` }}></div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* SEGMENT 2: OFFLINE BACKUP & RESTORE MODULE */}
      {activeSegment === 'backups' && (
        <div className="glass-card rounded-[3rem] shadow-xl p-8 sm:p-12 space-y-8 animate-fade-in">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl liquid-icon-wrapper text-white">
              <Database className="w-10 h-10" />
            </div>
            <h3 className="font-black text-2xl text-slate-800 mb-3">حصانة السجلات والنسخ الاحتياطي</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">يتيح لك هذا القسم استصدار نسخة صلبة مشفرة لبيانات النظام بالكامل، واستعادتها في أي وقت لضمان استمرارية مبيعات وحسابات الشركة ضد أي طارئ.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Box 1: Export */}
            <div className="p-8 border border-white rounded-[2.5rem] bg-white/40 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl text-amber-400 flex items-center justify-center shadow-md">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg">تصدير (JSON)</h4>
                    <span className="text-xs text-slate-500 font-bold">تحميل قاعدة البيانات فورياً</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium mb-8">
                  التقاط الحالة الكاملة للمستودعات، الفواتير، طواقم العمل في ملف صلب مأمون للحفظ السحابي أو الفلاش الميموري.
                </p>
              </div>

              <button
                onClick={downloadBackupFile}
                disabled={loading || !permissions?.backups?.export}
                title={!permissions?.backups?.export ? 'ليس لديك صلاحية تحميل النسخ الاحتياطي' : ''}
                className={`w-full py-4 rounded-2xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${
                  !permissions?.backups?.export
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                    <span>جاري التجهيز...</span>
                  </>
                ) : (
                  <span>تحميل النسخة الاحتياطية المعتمدة</span>
                )}
              </button>
            </div>

            {/* Box 2: Restore */}
            <div className="p-8 border border-amber-200/50 rounded-[2.5rem] bg-amber-50/40 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl text-white flex items-center justify-center shadow-md shadow-orange-200">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg">استعادة النظام</h4>
                    <span className="text-xs text-amber-700/70 font-bold">دمج نسخة سابقة بالمنظومة</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium mb-8">
                  برجاء اختيار ملف النسخ الاحتياطي الصادر سابقاً، سيتم مراجعة هيكلة الجداول وحقنها بالسيرفر للرجوع السريع. <strong className="text-rose-600 font-black">تحذير: هذه العملية تستبدل البيانات الحالية.</strong>
                </p>
              </div>

              <div className="relative">
                <label className={`w-full py-4 rounded-2xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${
                  !permissions?.backups?.create
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-slate-900 shadow-amber-200 cursor-pointer'
                }`}
                title={!permissions?.backups?.create ? 'ليس لديك صلاحية استعادة النسخ الاحتياطي' : ''}>
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري الاستعادة...</span>
                    </>
                  ) : (
                    <span>تحميل ملف الاستعادة والدمج</span>
                  )}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFromFile}
                    disabled={loading || !permissions?.backups?.create}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SEGMENT 3: SECURITY AUDIT LOG */}
      {activeSegment === 'audit' && (
        <div className="glass-card rounded-[3rem] shadow-xl p-6 sm:p-10 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center liquid-icon-wrapper-fast">
                <ShieldCheck className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <h3 className="font-black text-xl text-slate-800">سجل عمليات النظام (Audit Log)</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">تتبع كافة الإجراءات الحساسة والتعديلات من قبل المستخدمين.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/80 bg-white/30 shadow-inner">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-slate-100/50 text-slate-500 border-b border-white">
                  <th className="p-5 font-bold text-right">المستخدم</th>
                  <th className="p-5 font-bold text-right">الحركة / الإجراء</th>
                  <th className="p-5 font-bold text-right">التاريخ والوقت</th>
                  <th className="p-5 font-bold text-right">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-slate-700 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/60 transition-colors">
                    <td className="p-5">
                      <span className="font-black text-blue-700 bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-100">{log.user}</span>
                    </td>
                    <td className="p-5">
                      <span className="font-bold text-slate-800 bg-white shadow-sm border border-slate-100 px-3 py-1.5 rounded-xl text-xs">{log.action}</span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 text-slate-500 font-mono text-xs bg-slate-50/80 px-3 py-1.5 rounded-xl w-fit">
                        <Clock className="w-3.5 h-3.5" />
                        {log.date} {log.time}
                      </div>
                    </td>
                    <td className="p-5 text-slate-600 text-xs max-w-md">
                      <p className="truncate font-semibold" title={log.affectedRecord}>{log.affectedRecord}</p>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400 font-bold">لا يوجد سجل عمليات متاح.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* -------------------- PRINT ONLY: STUNNING PDF REPORT (DARK MODE) -------------------- */}
      <div className="hidden print:block w-full bg-slate-950 text-slate-50 m-0 p-0 min-h-screen" dir="rtl">
        {/* CSS to ensure printing forces background graphics and exact layout */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4; margin: 0; }
            html, body, #root, main { 
              display: block !important;
              overflow: visible !important; 
              height: auto !important; 
              min-height: 100vh !important;
              background-color: #020617 !important; /* slate-950 to fill the whole paper */
              color: white !important;
            }
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .print-break-inside-avoid { page-break-inside: avoid; }
            
            /* Hide the sidebar, header, and liquid backgrounds from App.tsx */
            header, aside, .liquid-bg-1, .liquid-bg-2, .liquid-bg-3 { display: none !important; }
            
            /* Reset App.tsx flex layout wrappers */
            #root > div { display: block !important; min-height: 0 !important; }
            #root > div > div { display: block !important; min-height: 0 !important; }
            main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          }
        `}} />

        {/* Dynamic Curved Header SVG */}
        <div className="relative w-full h-48 overflow-hidden z-0 bg-slate-950" style={{ pageBreakInside: 'avoid' }}>
          <div className="absolute inset-0 z-10 flex justify-between items-center px-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">شركة أنوار الابداع</h1>
              <p className="text-emerald-400 font-bold text-lg bg-emerald-950/50 px-4 py-1.5 rounded-full inline-block backdrop-blur-sm border border-emerald-500/30">التقرير المالي التحليلي الشامل</p>
            </div>
            <div className="text-left bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">تاريخ التقرير</p>
              <p className="text-xl font-black text-white font-mono">{new Date().toLocaleDateString('ar-IQ')}</p>
            </div>
          </div>
          <svg viewBox="0 0 1440 320" className="absolute bottom-0 left-0 w-full object-cover" style={{ transform: 'translateY(50%)' }}>
            <path fill="#0f172a" fillOpacity="1" d="M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,192C672,213,768,203,864,181.3C960,160,1056,128,1152,112C1248,96,1344,96,1392,96L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>

        <div className="mt-8 relative z-10 px-8 pb-12 bg-slate-900">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="border-l-4 border-l-blue-500 rounded-2xl p-4 bg-slate-800 shadow-lg print-break-inside-avoid overflow-hidden">
              <span className="text-slate-400 font-bold block mb-2 text-xs">إجمالي المبيعات</span>
              <span className="text-xl font-black text-white block break-words" dir="ltr" style={{ fontSize: '1.25rem', lineHeight: '1.5' }}>{formatIQD(totalSales)}</span>
            </div>
            <div className="border-l-4 border-l-slate-400 rounded-2xl p-4 bg-slate-800 shadow-lg print-break-inside-avoid overflow-hidden">
              <span className="text-slate-400 font-bold block mb-2 text-xs">إجمالي التكلفة</span>
              <span className="text-xl font-black text-slate-300 block break-words" dir="ltr" style={{ fontSize: '1.25rem', lineHeight: '1.5' }}>{formatIQD(totalCost)}</span>
            </div>
            <div className="border-l-4 border-l-emerald-500 rounded-2xl p-4 bg-emerald-950/40 shadow-lg print-break-inside-avoid overflow-hidden border border-emerald-900">
              <span className="text-emerald-400 font-bold block mb-2 text-xs">الربح الصافي الموحد</span>
              <span className="text-xl font-black text-emerald-400 block break-words" dir="ltr" style={{ fontSize: '1.25rem', lineHeight: '1.5' }}>{formatIQD(marginProfit)}</span>
            </div>
          </div>

          <h3 className="text-2xl font-black text-slate-100 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-blue-400 border border-slate-700">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            التفاصيل المالية (الفواتير)
          </h3>
          
          <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <table className="w-full text-right border-collapse bg-slate-900">
              <thead>
                <tr className="bg-slate-950 text-slate-300 border-b border-slate-800">
                  <th className="p-4 font-bold text-sm">رقم الفاتورة</th>
                  <th className="p-4 font-bold text-sm">التاريخ</th>
                  <th className="p-4 font-bold text-sm">إجمالي الفاتورة</th>
                  <th className="p-4 font-bold text-sm text-slate-400">التكلفة</th>
                  <th className="p-4 font-bold text-sm text-emerald-400">الربح الصافي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {calculatedInvoices.map((i, index) => {
                  let items = [];
                  try { items = Array.isArray(i.items) ? i.items : (typeof i.items === 'string' ? JSON.parse(i.items) : []); } catch(e){}
                  const cost = items.reduce((s: number, item: any) => s + ((item.purchasePrice || 0) * item.quantity), 0);
                  const profit = i.finalAmount - cost;
                  return (
                    <tr key={i.id} className={`${index % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-900'} print-break-inside-avoid`}>
                      <td className="p-4 font-mono font-bold text-slate-300">#{i.id}</td>
                      <td className="p-4 text-sm font-bold text-slate-500">{new Date(i.date).toLocaleDateString('ar-IQ')}</td>
                      <td className="p-4 font-mono font-black text-white">{formatIQD(i.finalAmount)}</td>
                      <td className="p-4 font-mono font-bold text-slate-500">{formatIQD(cost)}</td>
                      <td className="p-4 font-mono font-black text-emerald-400 bg-emerald-950/20">{formatIQD(profit)}</td>
                    </tr>
                  );
                })}
                {calculatedInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">لا توجد فواتير لهذه الفترة.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-12 grid grid-cols-2 gap-8 print-break-inside-avoid">
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-lg">
              <h4 className="font-bold text-slate-300 mb-4 text-sm">نسبة الأرباح إلى المبيعات</h4>
              <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden border border-slate-700">
                <div className="bg-emerald-500 h-full" style={{ width: `${totalSales > 0 ? (marginProfit / totalSales) * 100 : 0}%` }}></div>
              </div>
              <div className="mt-2 text-xs font-bold text-slate-400">{totalSales > 0 ? Math.round((marginProfit / totalSales) * 100) : 0}% هامش ربح</div>
            </div>
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-lg">
               <h4 className="font-bold text-slate-300 mb-4 text-sm">تقسيم المبيعات (نقدي/أقساط)</h4>
               <div className="flex w-full h-4 rounded-full overflow-hidden border border-slate-700">
                 <div className="bg-blue-500 h-full" style={{ width: `${totalSales > 0 ? (cashSalesTotal / totalSales) * 100 : 0}%` }}></div>
                 <div className="bg-amber-500 h-full" style={{ width: `${totalSales > 0 ? (instSalesTotal / totalSales) * 100 : 0}%` }}></div>
               </div>
               <div className="mt-2 text-xs font-bold flex justify-between">
                 <span className="text-blue-400">نقدي: {totalSales > 0 ? Math.round((cashSalesTotal / totalSales) * 100) : 0}%</span>
                 <span className="text-amber-400">أقساط: {totalSales > 0 ? Math.round((instSalesTotal / totalSales) * 100) : 0}%</span>
               </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center pt-8 pb-12 bg-slate-900 border-t-2 border-dashed border-slate-800 print-break-inside-avoid">
          <p className="text-slate-500 text-xs font-bold mb-1">تم إنشاء وتوليد هذا التقرير آلياً وموثق من نظام الإدارة الذكي (إبداع).</p>
          <p className="text-slate-600 text-[10px] font-mono">{new Date().toISOString()}</p>
        </div>
      </div>
    </>
  );
}
