/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import {
  Users, Plus, Search, MapPin, CheckSquare,
  Trash2, X, User, Eye, Briefcase, Calendar, Info,
  DollarSign, CreditCard, TrendingUp, RefreshCcw
} from 'lucide-react';

interface WorkersScreenProps {
  permissions: any;
  currentUser?: any;
}

const formatMoney = (val: number) => {
  if (!val && val !== 0) return '0';
  return val.toLocaleString('en-US');
};

export default function WorkersScreen({ permissions, currentUser }: WorkersScreenProps) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [workerSettlements, setWorkerSettlements] = useState<any[]>([]);
  const [workerPayments, setWorkerPayments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [workerLimit, setWorkerLimit] = useState(50);
  
  const [newWorkerName, setNewWorkerName] = useState('');
  const [viewingWorkerStats, setViewingWorkerStats] = useState<any>(null);
  const [settlementAmount, setSettlementAmount] = useState('');

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [wRes, wsRes, tRes, bRes, cRes, iRes, mntRes, faultRes, taRes, wpRes] = await Promise.all([
        api.getWorkers().catch(() => []),
        api.getWorkerSettlements().catch(() => []),
        api.getTeams().catch(() => []),
        api.getBookings().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getInvoices().catch(() => []),
        api.getMaintenance().catch(() => []),
        api.getFaults().catch(() => []),
        api.getTaskAssignments?.().catch(() => []) || [],
        api.getWorkerPayments().catch(() => [])
      ]);

      setWorkers(Array.isArray(wRes) ? wRes : []);
      setWorkerSettlements(Array.isArray(wsRes) ? wsRes : []);
      setTeams(Array.isArray(tRes) ? tRes : []);
      setBookings(Array.isArray(bRes) ? bRes : []);
      setCustomers(Array.isArray(cRes) ? cRes.filter((c: any) => !c.isDeleted) : []);
      setInvoices(Array.isArray(iRes) ? iRes : []);
      setMaintenance(Array.isArray(mntRes) ? mntRes : []);
      setFaults(Array.isArray(faultRes) ? faultRes : []);
      setTaskAssignments(Array.isArray(taRes) ? taRes : []);
      setWorkerPayments(Array.isArray(wpRes) ? wpRes : []);
    } catch (err) {
      toast.error('فشل في تحميل بيانات العمال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Calculate worker financial stats
  const workerFinancialData = React.useMemo(() => {
    if (!viewingWorkerStats) return { totalOwed: 0, totalPaid: 0, remaining: 0, payments: [] as any[] };
    
    // Get all payments for this worker
    const wPayments = workerPayments.filter(p => 
      p.worker_id === viewingWorkerStats.id || p.worker_name === viewingWorkerStats.name || p.workerId === viewingWorkerStats.id || p.workerName === viewingWorkerStats.name
    );
    
    const totalOwed = wPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    // Get all settlement payments (partial payments) for this worker
    const settlementPaymentsForWorker = workerSettlements.filter(s => 
      s.workerId === viewingWorkerStats.id && s.taskType === 'payment' && parseFloat(s.amount) > 0
    );
    const totalPaid = settlementPaymentsForWorker.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    
    return {
      totalOwed,
      totalPaid,
      remaining: totalOwed - totalPaid,
      payments: wPayments
    };
  }, [viewingWorkerStats, workerPayments, workerSettlements]);

  const workerStatsData = React.useMemo(() => {
    if (!viewingWorkerStats) return { completedInstallations: [], workerMnts: [], workerFaults: [], totalMaintenanceAndFaults: 0 };
    
    // Calculate the most recent reset date for this worker (set to start of the day to avoid timezone/time-of-day hiding issues)
    const resets = workerSettlements.filter(s => s.workerId === viewingWorkerStats.id && s.taskType === 'reset_marker');
    const lastResetDate = resets.length > 0 ? new Date(Math.max(...resets.map(r => new Date(r.settledAt || 0).getTime()))).setHours(0,0,0,0) : 0;

    const workerTeams = teams.filter(t => t.leader === viewingWorkerStats.name || (Array.isArray(t.members) ? t.members.includes(viewingWorkerStats.name) : t.members?.includes(viewingWorkerStats.name)));
    const teamIds = workerTeams.map(t => t.id);

    const isCustomTeamMatch = (teamName: string, workerName: string) => {
      if (!teamName || !teamName.startsWith('مخصص |')) return false;
      const parts = teamName.split('|').map(s => s.trim());
      if (parts.length < 3) return teamName.includes(workerName);
      const leader = parts[1];
      const members = parts[2].split('،').map(s => s.trim());
      return leader === workerName || members.includes(workerName);
    };

    const hasWorkerPayment = (taskId: number, taskType: string) => {
      return workerPayments.some(p => 
        (p.worker_id === viewingWorkerStats.id || p.worker_name === viewingWorkerStats.name || p.workerId === viewingWorkerStats.id || p.workerName === viewingWorkerStats.name) &&
        String(p.task_id || p.taskId) === String(taskId) && 
        (p.task_type === taskType || p.taskType === taskType)
      );
    };

    const completedInstallations = bookings.filter(b => {
      if (b.status !== 'completed') return false;
      const inPayments = hasWorkerPayment(b.id, 'booking');
      // Hide if the booking was made before the reset
      const taskDate = new Date(b.appointmentDate || 0).setHours(0,0,0,0);
      if (!inPayments && lastResetDate > 0 && taskDate < lastResetDate) return false;
      return teamIds.includes(b.assignedTeamId) || isCustomTeamMatch(b.assignedTeamName, viewingWorkerStats.name) || inPayments;
    });
    
    // For maintenance and faults, we check taskAssignments OR if the worker has a payment for this task OR if they are assigned manually
    const workerMnts = maintenance.filter((m: any) => {
      if (m.status !== 'repaired' && m.status !== 'closed') return false;
      const inPayments = hasWorkerPayment(m.id, 'maintenance');
      const taskDate = new Date(m.createdDate || 0).setHours(0,0,0,0);
      if (!inPayments && lastResetDate > 0 && taskDate < lastResetDate) return false;

      const inTaskAssignments = taskAssignments.some(ta => ta.taskType === 'maintenance' && ta.taskId === m.id && teamIds.includes(ta.teamId));
      const inAssignedEmployee = m.assignedEmployee && m.assignedEmployee.includes(viewingWorkerStats.name);
      return inTaskAssignments || inPayments || inAssignedEmployee;
    });

    const workerFaults = faults.filter((f: any) => {
      if (f.status !== 'repaired' && f.status !== 'closed') return false;
      const inPayments = hasWorkerPayment(f.id, 'fault');
      const taskDate = new Date(f.createdDate || 0).setHours(0,0,0,0);
      if (!inPayments && lastResetDate > 0 && taskDate < lastResetDate) return false;

      const inTaskAssignments = taskAssignments.some(ta => ta.taskType === 'fault' && ta.taskId === f.id && teamIds.includes(ta.teamId));
      const inAssignedEmployee = f.assignedEmployee && f.assignedEmployee.includes(viewingWorkerStats.name);
      return inTaskAssignments || inPayments || inAssignedEmployee;
    });
      
    return {
      completedInstallations,
      workerMnts,
      workerFaults,
      totalMaintenanceAndFaults: workerMnts.length + workerFaults.length
    };
  }, [viewingWorkerStats, teams, bookings, taskAssignments, maintenance, faults, workerPayments, workerSettlements]);

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;
    try {
      setActionLoading(true);
      const created = await api.createWorker({ name: newWorkerName.trim() });
      toast.success('تم إضافة العامل بنجاح');
      setWorkers([...workers, created]);
      setNewWorkerName('');
    } catch (err: any) {
      toast.error('فشل إضافة العامل');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWorker = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العامل؟ سيتم إزالته من السجلات.')) return;
    try {
      setActionLoading(true);
      await api.deleteWorker(id);
      toast.success('تم حذف العامل بنجاح');
      setWorkers(workers.filter(w => w.id !== id));
    } catch (err: any) {
      toast.error('فشل حذف العامل');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetWorker = async (id: number, name: string) => {
    if (!window.confirm(`تحذير خطير: هل أنت متأكد من تصفير بيانات العامل "${name}"؟\nسيتم مسح جميع سجلات الدفع والمستحقات السابقة بشكل نهائي لتخفيف الضغط.`)) return;
    try {
      setActionLoading(true);
      await api.resetWorker(id);
      toast.success('تم تصفير حساب العامل بنجاح وتخفيف الضغط');
      
      const [wsRes, wpRes] = await Promise.all([
        api.getWorkerSettlements().catch(() => []),
        api.getWorkerPayments().catch(() => [])
      ]);
      if (Array.isArray(wsRes)) setWorkerSettlements(wsRes);
      if (Array.isArray(wpRes)) setWorkerPayments(wpRes);
    } catch (err: any) {
      toast.error('فشل في تصفير الحساب');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaySettlement = async () => {
    if (!viewingWorkerStats || !settlementAmount || parseFloat(settlementAmount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    try {
      setActionLoading(true);
      await api.payWorkerSettlement(viewingWorkerStats.id, parseFloat(settlementAmount));
      toast.success(`تم تسجيل دفع ${formatMoney(parseFloat(settlementAmount))} د.ع بنجاح`);
      setSettlementAmount('');
      // Reload settlements
      const wsRes = await api.getWorkerSettlements().catch(() => []);
      if (Array.isArray(wsRes)) setWorkerSettlements(wsRes);
    } catch (err: any) {
      toast.error('فشل في تسجيل المحاسبة');
    } finally {
      setActionLoading(false);
    }
  };

  // Get quick summary for each worker in the cards
  const getWorkerQuickSummary = (worker: any) => {
    const wPay = workerPayments.filter(p => p.worker_id === worker.id || p.worker_name === worker.name || p.workerId === worker.id || p.workerName === worker.name);
    const totalOwed = wPay.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const settPay = workerSettlements.filter(s => s.workerId === worker.id && s.taskType === 'payment' && parseFloat(s.amount) > 0);
    const totalPaid = settPay.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    return { totalOwed, totalPaid, remaining: totalOwed - totalPaid, taskCount: wPay.length };
  };

  const filteredWorkers = workers.filter(w => 
    (w.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.id.toString().includes(searchQuery)
  );

  const displayedWorkers = filteredWorkers.slice(0, workerLimit);

  return (
    <div className="space-y-8 animate-fade-in relative z-10 max-w-7xl mx-auto pb-12">
      {/* Title Banner */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex items-center gap-6">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200/50 shrink-0">
          <Users className="text-white w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">إدارة العمال والفنيين</h1>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">سجل العمال الميدانيين، إدارة حساباتهم وإحصائيات العمل.</p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="glass-card p-5 rounded-[2rem] shadow-lg flex items-center gap-4 border border-white/80">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-indigo-500 pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-indigo-500/50 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-semibold focus:outline-none shadow-sm transition-all text-slate-800 placeholder-slate-400"
            placeholder="ابحث باسم العامل أو المعرف..."
          />
        </div>
      </div>

      {/* WORKERS DIRECTORY */}
      <div className="space-y-6">
        {permissions.workersManagement?.create && (
          <div className="glass-card p-6 rounded-[2rem] border border-white/80 shadow-sm flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block font-black text-slate-800 mb-2">إضافة عامل جديد للأسطول الفني</label>
              <input
                type="text"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm font-bold"
                placeholder="اسم العامل (مثال: محمد، علي، عباس...)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddWorker(e as any);
                }}
              />
            </div>
            <button
              onClick={handleAddWorker}
              disabled={actionLoading || !newWorkerName.trim()}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5"/> إضافة
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 font-bold bg-white/40 rounded-3xl border border-white border-dashed">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              جاري تحميل قائمة العمال...
            </div>
          ) : filteredWorkers.length === 0 ? (
             <div className="col-span-full text-center py-12 text-slate-400 font-bold bg-white/40 rounded-3xl border border-white border-dashed">
               {workers.length === 0 ? "لم يتم إضافة أي عمال حتى الآن. قم بإضافة أسماء العمال من الأعلى ليتم استخدامهم في تشكيل الطواقم." : "لا توجد نتائج مطابقة للبحث."}
             </div>
          ) : (
            <>
              {displayedWorkers.map(w => {
                const summary = getWorkerQuickSummary(w);
                return (
                  <div key={w.id} className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-black text-slate-800 text-base flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform"/> {w.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setViewingWorkerStats(w); setSettlementAmount(''); }} className="text-blue-500 hover:bg-blue-100 p-2 rounded-xl transition-all" title="إحصائيات الإنجاز والمشاركات">
                          <Eye className="w-4 h-4" />
                        </button>
                        {(permissions.workerSettlement?.approve || permissions.installationTeams?.delete) && (
                          <button onClick={() => handleResetWorker(w.id, w.name)} className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 p-2 rounded-xl transition-all" title="تصفير بيانات العامل (مسح الوصولات)">
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.workersManagement?.delete && (
                          <button onClick={() => handleDeleteWorker(w.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all" title="إزالة العامل نهائياً">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mr-7 mb-2">معرف النظام: {w.id}</div>
                    
                    {/* Quick financial summary */}
                    {summary.totalOwed > 0 && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 mt-1">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-500">المستحقات:</span>
                          <span className="text-amber-700 font-mono">{formatMoney(summary.totalOwed)} د.ع</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-500">المدفوع:</span>
                          <span className="text-emerald-700 font-mono">{formatMoney(summary.totalPaid)} د.ع</span>
                        </div>
                        {summary.remaining > 0 && (
                          <div className="flex justify-between items-center text-[10px] font-black pt-1 border-t border-slate-200">
                            <span className="text-rose-600">الباقي:</span>
                            <span className="text-rose-700 font-mono bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">{formatMoney(summary.remaining)} د.ع</span>
                          </div>
                        )}
                        {summary.remaining <= 0 && summary.totalOwed > 0 && (
                          <div className="text-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">✅ تم التسوية بالكامل</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {!loading && displayedWorkers.length > 0 && displayedWorkers.length < filteredWorkers.length && (
          <div className="flex justify-center pt-4">
            <button 
              onClick={() => setWorkerLimit(prev => prev + 50)}
              className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              عرض المزيد ({filteredWorkers.length - displayedWorkers.length} متبقي)
            </button>
          </div>
        )}
      </div>

      {/* WORKER STATS MODAL */}
      {viewingWorkerStats && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[80] p-4 animate-fade-in">
          <div className="w-full max-w-2xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <h4 className="font-black text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-emerald-400"/> سجل أعمال وحسابات العامل الميداني</h4>
              <button onClick={() => setViewingWorkerStats(null)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 text-sm flex-1 overflow-y-auto custom-scrollbar bg-white/60 space-y-6">
              {/* Worker info card */}
              <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50 shrink-0">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h5 className="font-black text-xl text-slate-800">{viewingWorkerStats.name}</h5>
                  <span className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> تاريخ الإضافة: {new Date(viewingWorkerStats.created_at || new Date()).toLocaleDateString('ar-IQ')}</span>
                </div>
              </div>

              {/* FINANCIAL SUMMARY */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="font-black text-white text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" /> الملخص المالي
                  </h5>
                  {(permissions.workerSettlement?.approve || permissions.installationTeams?.delete) && (
                    <button 
                      onClick={() => handleResetWorker(viewingWorkerStats.id, viewingWorkerStats.name)} 
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 text-xs font-bold rounded-lg border border-rose-500/20 transition-all flex items-center gap-1.5"
                    >
                      <RefreshCcw className="w-3 h-3" />
                      تصفير السجلات
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/10 p-4 rounded-xl text-center border border-white/5">
                    <div className="text-2xl font-black text-amber-400 font-mono">{formatMoney(workerFinancialData.totalOwed)}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1">المجموع الكلي (د.ع)</div>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl text-center border border-white/5">
                    <div className="text-2xl font-black text-emerald-400 font-mono">{formatMoney(workerFinancialData.totalPaid)}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1">المدفوع (د.ع)</div>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl text-center border border-white/5">
                    <div className={`text-2xl font-black font-mono ${workerFinancialData.remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatMoney(Math.max(0, workerFinancialData.remaining))}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1">الباقي (د.ع)</div>
                  </div>
                </div>

                {/* Settlement Payment Section */}
                {workerFinancialData.remaining > 0 && currentUser?.permissions?.workerSettlement?.approve && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-emerald-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="المبلغ المدفوع..."
                      value={settlementAmount ? parseInt(settlementAmount).toLocaleString('en-US') : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/,/g, '');
                        const num = parseInt(val);
                        setSettlementAmount(isNaN(num) ? '' : num.toString());
                      }}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white font-bold font-mono text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none placeholder-slate-500"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">د.ع</span>
                    <button
                      onClick={handlePaySettlement}
                      disabled={actionLoading || !settlementAmount || parseFloat(settlementAmount) <= 0}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2 shrink-0"
                    >
                      {actionLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CheckSquare className="w-4 h-4" />
                      )}
                      تأكيد الدفع
                    </button>
                  </div>
                )}

                {/* Settlement history */}
                {(() => {
                  const settPayHistory = workerSettlements.filter(s => s.workerId === viewingWorkerStats.id && s.taskType === 'payment' && parseFloat(s.amount) > 0);
                  if (settPayHistory.length === 0) return null;
                  return (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="text-[10px] font-bold text-slate-500 mb-2">سجل الدفعات:</p>
                      <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                        {settPayHistory.map((s, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg border border-white/5 text-[11px]">
                            <span className="text-slate-400 font-bold">{s.settledBy || 'النظام'} — {s.settledAt ? new Date(s.settledAt).toLocaleDateString('en-GB') : ''}</span>
                            <span className="font-mono font-black text-emerald-400">{formatMoney(parseFloat(s.amount))} د.ع</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const { completedInstallations, workerMnts, workerFaults, totalMaintenanceAndFaults } = workerStatsData;
                return (
                  <div className="space-y-6">
                    {/* INSTALLATIONS */}
                    <div>
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between mb-4">
                        <span className="font-bold text-white flex items-center gap-2"><CheckSquare className="w-4 h-4 text-emerald-400"/> منظومات شارك بتركيبها</span>
                        <span className="font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-400/20 text-lg shadow-sm">{completedInstallations.length}</span>
                      </div>
                      
                      {completedInstallations.length > 0 ? (
                        <div className="space-y-3">
                          {completedInstallations.map(b => {
                            const assignedTeam = teams.find(t => t.id === b.assignedTeamId);
                            const customer = customers.find(c => c.id === b.customerId);
                            const address = b.address || customer?.address || 'غير متوفر';
                            const inv = invoices.find(i => i.id === b.invoiceId);
                            // Get worker payment for this booking
                            const payment = workerPayments.find(p => 
                              (p.worker_id === viewingWorkerStats.id || p.worker_name === viewingWorkerStats.name || p.workerId === viewingWorkerStats.id || p.workerName === viewingWorkerStats.name) && 
                              String(p.task_id || p.taskId) === String(b.id) && (p.task_type === 'booking' || p.taskType === 'booking')
                            );
                            const paymentAmount = payment ? parseFloat(payment.amount) || 0 : 0;
                            
                            return (
                              <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                  <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <h6 className="font-black text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">{b.customerName}</h6>
                                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{b.appointmentDate}</span>
                                    </div>
                                    
                                    <div className="text-[11px] text-slate-600 space-y-1.5 font-bold">
                                      {inv && <p className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-slate-400"/> رقم الفاتورة: <span className="bg-slate-50 px-1 rounded border border-slate-100">{inv.invoiceNumber}</span></p>}
                                      <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-400"/> العنوان: {address}</p>
                                      {assignedTeam && <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-400"/> الطاقم المسؤول: {assignedTeam.name}</p>}
                                    </div>
                                  </div>
                                  
                                  {/* Payment amount */}
                                  <div className="shrink-0 flex flex-col items-center gap-1">
                                    {paymentAmount > 0 ? (
                                      <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl text-center">
                                        <div className="text-xs font-bold text-slate-500 mb-0.5">الأجر</div>
                                        <div className="font-black text-amber-700 font-mono text-sm">{formatMoney(paymentAmount)} د.ع</div>
                                      </div>
                                    ) : (
                                      <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-center">
                                        <div className="text-[10px] font-bold text-slate-400">لم يحدد أجر</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                          <p className="text-xs text-slate-400 font-bold">لم يشارك في تركيب منظومات بعد.</p>
                        </div>
                      )}
                    </div>

                    {/* MAINTENANCE AND FAULTS */}
                    <div>
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between mb-4">
                        <span className="font-bold text-white flex items-center gap-2"><Briefcase className="w-4 h-4 text-rose-400"/> صيانات وأعطال أتمها</span>
                        <span className="font-black text-rose-400 bg-rose-400/10 px-3 py-1 rounded-lg border border-rose-400/20 text-lg shadow-sm">{totalMaintenanceAndFaults}</span>
                      </div>
                      
                      {totalMaintenanceAndFaults > 0 ? (
                        <div className="space-y-3">
                          {[...workerMnts.map((m:any) => ({ ...m, _type: 'maintenance', _label: 'صيانة وقائية' })), ...workerFaults.map((f:any) => ({ ...f, _type: 'fault', _label: 'معالجة عطل' }))].map((t:any) => {
                            const customer = customers.find(c => c.id === t.customerId);
                            const address = customer?.address || 'غير متوفر';
                            const ta = taskAssignments.find(a => a.taskId === t.id && a.taskType === t._type);
                            const assignedTeam = teams.find(team => team.id === ta?.teamId);
                            // Get worker payment for this task
                            const payment = workerPayments.find(p => 
                              (p.worker_id === viewingWorkerStats.id || p.worker_name === viewingWorkerStats.name || p.workerId === viewingWorkerStats.id || p.workerName === viewingWorkerStats.name) && 
                              String(p.task_id || p.taskId) === String(t.id) && (p.task_type === t._type || p.taskType === t._type)
                            );
                            const paymentAmount = payment ? parseFloat(payment.amount) || 0 : 0;
                            
                            return (
                              <div key={`${t._type}-${t.id}`} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                  <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <h6 className="font-black text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{customer?.name || 'غير معروف'}</h6>
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${t._type === 'fault' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>{t._label}</span>
                                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{t.createdDate || (t.created_at ? new Date(t.created_at).toLocaleDateString('en-CA') : 'غير متوفر')}</span>
                                    </div>
                                    
                                    <div className="text-[11px] text-slate-600 space-y-1.5 font-bold">
                                      <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-400"/> العنوان: {address}</p>
                                      {assignedTeam && <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-400"/> الطاقم المسؤول: {assignedTeam.name}</p>}
                                      {t.description && <p className="flex items-start gap-1.5 text-slate-500"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5"/> التفاصيل: {t.description}</p>}
                                    </div>
                                  </div>
                                  
                                  {/* Payment amount */}
                                  <div className="shrink-0 flex flex-col items-center gap-1">
                                    {paymentAmount > 0 ? (
                                      <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl text-center">
                                        <div className="text-xs font-bold text-slate-500 mb-0.5">الأجر</div>
                                        <div className="font-black text-amber-700 font-mono text-sm">{formatMoney(paymentAmount)} د.ع</div>
                                      </div>
                                    ) : (
                                      <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-center">
                                        <div className="text-[10px] font-bold text-slate-400">لم يحدد أجر</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                          <p className="text-xs text-slate-400 font-bold">لم يشارك في عمليات صيانة أو أعطال بعد.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-[11px] text-slate-500 font-bold bg-blue-50/80 p-4 rounded-xl border border-blue-100 leading-relaxed flex gap-3 shadow-inner">
                      <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <span>يتم حساب الأعمال المكتملة بناءً على جميع الفرق التي ينتمي أو انتمى إليها هذا العامل والتي أنهت المهمة بنجاح. المبالغ المالية تُسجل عند إنشاء الحجز أو المهمة ويمكن محاسبة العامل جزئياً أو كلياً من خلال زر "تأكيد الدفع" أعلاه.</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
