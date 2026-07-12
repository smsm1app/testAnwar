/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import {
  Calendar, Search, Phone, DollarSign, Eye, Clock,
  Trash2, Plus, MessageSquare, Landmark, X, Edit, Sliders, CheckSquare
} from 'lucide-react';

interface InstallmentsScreenProps {
  permissions: any;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-4 h-4"}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

export default function InstallmentsScreen({ permissions }: InstallmentsScreenProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Active Milestone scheduler edit
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [installmentsEditList, setInstallmentsEditList] = useState<any[]>([]);
  const [planNotes, setPlanNotes] = useState('');

  const loadInstallmentsData = async () => {
    try {
      setLoading(true);
      const res = await api.getInstallments().catch(() => []);
      const settingsRes = await api.getSettings().catch(() => null);
      setPlans(res);
      setSettings(settingsRes);
    } catch (err: any) {
      toast.error('فشل في جلب الأقساط والقوالب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstallmentsData();
  }, []);

  // Update payment or milestones list
  const handleOpenScheduler = (plan: any) => {
    setSelectedPlan(plan);
    setInstallmentsEditList(plan.installments || []);
    setPlanNotes(plan.notes || '');
  };

  const handleUpdatePaymentsList = async () => {
    if (!selectedPlan) return;
    try {
      setActionLoading(true);
      await api.updateInstallmentPayments(selectedPlan.id, installmentsEditList, planNotes);
      toast.success('تم تحديث مجدول الأقساط وتسوية المبالغ الحاضرة والمتبقية بنجاح!');
      setSelectedPlan(null);
      loadInstallmentsData();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ في عملية الحفظ');
    } finally {
      setActionLoading(false);
    }
  };

  // Set paid state for single milestone
  const toggleMilestonePaidState = (milestoneId: number, isPaid: boolean) => {
    setInstallmentsEditList(installmentsEditList.map(milestone => {
      if (milestone.id === milestoneId) {
        return {
          ...milestone,
          status: isPaid ? 'paid' : 'pending',
          paidAmount: isPaid ? milestone.amount : 0,
          paymentDate: isPaid ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return milestone;
    }));
  };

  // Add a brand new milestone row (Unlimited entries)
  const addNewMilestoneRow = () => {
    const nextId = installmentsEditList.length > 0 ? Math.max(...installmentsEditList.map(m => m.id)) + 1 : 1;
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + installmentsEditList.length + 1, today.getDate());
    const dateStr = nextMonth.toISOString().split('T')[0];

    setInstallmentsEditList([...installmentsEditList, {
      id: nextId,
      dueDate: dateStr,
      amount: 250000,
      paidAmount: 0,
      status: 'pending'
    }]);
  };

  const removeMilestoneRow = (milestoneId: number) => {
    setInstallmentsEditList(installmentsEditList.filter(m => m.id !== milestoneId));
  };

  // Reverse direct milestone payment completely based on strict permissions (Confirm trigger)
  const handleReverseMilestonePaymentDirectly = async (planId: number, scheduleId: number) => {
    if (!permissions.installments.delete) {
      toast.error('عذراً، رتبتك لا تملك الحق لنقض أو حذف مدفوعات الأقساط من الأرشيف');
      return;
    }

    toast('تنبيه أمان: هل ترغب حقاً بنقض مبالغ تسوية هذا القسط وتصفيرها بالكامل؟ يسجل هذا في أرشيف الحماية.', {
      action: {
        label: 'تأكيد',
        onClick: async () => {
          try {
            setActionLoading(true);
            await api.deleteInstallmentPayment(planId, scheduleId);
            toast.success('تم نقض وتصفير سداد القسط وخصم المعامَلات عائلياً بنجاح!');
            loadInstallmentsData();
          } catch (err: any) {
            toast.error(err.message || 'أخفقت عملية التصفير');
          } finally {
            setActionLoading(false);
          }
        },
      },
      cancel: {
        label: 'إلغاء',
        onClick: () => { },
      },
    });
  };

  // WhatsApp remind trigger 
  const triggerWhatsAppReminder = (plan: any, milestone: any) => {
    if (!settings) {
      toast.error('الرجاء الانتظار حتى اكتمال تحميل قوالب الإعدادات');
      return;
    }

    let template = settings.installmentReminderTemplate || `مرحباً {customer_name}،
نود تذكيركم بموعد سداد القسط المستحق:

رقم الفاتورة: {invoice_number}
تاريخ الاستحقاق: {due_date}
مبلغ القسط المطلوب: {remaining_amount}

يرجى تسديد المبلغ لتجنب أي تأخير.
شكراً لتعاملكم مع أنوار الإبداع!`;

    // Replace
    template = template.replace(/{customer_name}/g, plan.customerName)
      .replace(/{invoice_number}/g, plan.invoiceNumber)
      .replace(/{remaining_amount}/g, formatIQD(milestone.amount))
      .replace(/{due_date}/g, milestone.dueDate);

    const textEncoded = encodeURIComponent(template);
    let pNum = plan.customerPhone;
    if (pNum.startsWith('0')) {
      pNum = '964' + pNum.substring(1);
    }

    window.open(`https://api.whatsapp.com/send?phone=${pNum}&text=${textEncoded}`, '_blank');
  };

  const filteredPlans = plans.filter(p =>
    (p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerPhone.includes(searchQuery))
  );

  return (
    <div className="space-y-8 animate-fade-in relative z-10 max-w-7xl mx-auto pb-12">

      {/* Title */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex items-center gap-6">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-200/50 liquid-icon-wrapper shrink-0">
          <Calendar className="text-white w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">نظام ومتابعة الأقساط والمديونيات</h1>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">ضبط وجدولة ذمم العملاء المالية بالدينار العراقي (IQD). إرسال تذكيرات آلية.</p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="glass-card p-5 rounded-[2rem] shadow-lg flex items-center gap-4 border border-white/80">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-amber-500 pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl py-3 pr-12 pl-4 text-sm font-semibold focus:outline-none shadow-sm transition-all text-slate-800 placeholder-slate-400"
            placeholder="بحث باسم الزبون، رمز الفاتورة، أو رقم موبايل المشترك المرفق..."
          />
        </div>
        <button 
          onClick={loadInstallmentsData} 
          className="px-6 py-3 bg-white/60 hover:bg-white text-slate-700 font-bold rounded-xl shadow-sm border border-white transition-all whitespace-nowrap active:scale-95"
        >
          تحديث
        </button>
      </div>

      {/* INSTALLMENTS PLAN LIST */}
      <div className="space-y-6">
          {loading ? (
            <div className="text-center py-16 text-slate-500 text-sm font-bold flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <span>تحميل سجلات مجدولي الأقساط...</span>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="glass-card text-center py-16 rounded-[2.5rem] shadow-sm text-slate-400 font-bold text-lg border border-white/50">
              لا توجد مخططات تقسيط تقليدية تطابق بحثك حالياً.
            </div>
          ) : (
            filteredPlans.map((plan) => {
              const overdueCount = plan.installments.filter((i: any) => i.status !== 'paid' && new Date(i.dueDate) < new Date()).length;
              return (
                <div key={plan.id} className="glass-card rounded-[2.5rem] p-6 md:p-8 border border-white/80 shadow-lg space-y-6 hover:-translate-y-1 transition-transform duration-300">

                  {/* Metadata and top actions */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/60 pb-5 gap-4">
                    <div>
                      <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                        <div className="p-1.5 bg-white/80 rounded-lg shadow-sm border border-slate-100/50"><Calendar className="w-5 h-5 text-amber-500"/></div>
                        {plan.customerName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2 font-bold flex items-center gap-2">تجهيز الفاتورة: <span className="font-mono bg-white/50 px-2 py-0.5 rounded border border-slate-100">{plan.invoiceNumber}</span> | مبيعات الأقساط</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {overdueCount > 0 && (
                        <span className="px-4 py-1.5 bg-rose-50/90 text-rose-700 text-[11px] font-black rounded-xl border border-rose-200 shadow-sm animate-pulse-slow">
                          يوجد {overdueCount} قسط متأخر!
                        </span>
                      )}

                      <div className="text-right bg-white/60 px-4 py-2 rounded-xl border border-white shadow-sm">
                        <span className="text-slate-500 block text-[10px] font-bold">الدين وجدولة المستند:</span>
                        <span className="font-black text-rose-600 font-mono text-base tracking-tighter">{formatIQD(plan.remainingAmount)}</span>
                      </div>

                      <button
                        onClick={() => handleOpenScheduler(plan)}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-sm font-black shadow-md transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Sliders className="w-4 h-4" /> تعديل الجدولة
                      </button>
                    </div>
                  </div>

                  {/* Milestones schedule row preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {plan.installments.map((step: any, k: number) => {
                      const isOverdue = step.status !== 'paid' && new Date(step.dueDate) < new Date();
                      return (
                        <div key={k} className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between h-32 relative overflow-hidden transition-all hover:scale-105 ${
                          step.status === 'paid' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : isOverdue ? 'bg-rose-50/80 border-rose-200 text-rose-900' : 'bg-white/70 border-white text-slate-800'
                          }`}>
                          
                          <div className="flex justify-between items-start font-mono text-[10px] font-bold">
                            <span className="bg-white/50 px-2 py-0.5 rounded-md border border-slate-100/50 shadow-sm">قسط {step.id}</span>
                            <span className={`px-2 py-0.5 rounded-md bg-white/50 border border-slate-100/50 shadow-sm ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>{step.dueDate}</span>
                          </div>

                          <span className="font-black font-mono text-sm mt-3 tracking-wider">{formatIQD(step.amount)}</span>

                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200/50">
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${step.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                              {step.status === 'paid' ? 'مسدد سليم' : isOverdue ? 'متأخر ومتخلف' : 'معلق روتيني'}
                            </span>

                            {/* Actions container */}
                            <div className="flex gap-1.5 opacity-90 hover:opacity-100">
                              {/* WhatsApp alert button */}
                              {step.status !== 'paid' && (
                                <button
                                  onClick={() => triggerWhatsAppReminder(plan, step)}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-colors rounded-lg border border-emerald-100"
                                  title="إرسال إنذار/تذكير السداد عبر واتساب"
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Reverse Direct Paid record */}
                              {step.status === 'paid' && permissions.installments.delete && (
                                <button
                                  onClick={() => handleReverseMilestonePaymentDirectly(plan.id, step.id)}
                                  disabled={actionLoading}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg border border-rose-100 disabled:opacity-50 transition-colors"
                                  title="نقض وتصفير عملية التسوية"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })
          )}
        </div>

      {/* MILESTONES ADJUST SCHEDULER DRAW MODAL */}
      {selectedPlan !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-3xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col justify-between">

            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h3 className="font-black text-sm flex items-center gap-2"><Sliders className="w-4 h-4 text-amber-500"/> تعديل مجدول الأقساط: {selectedPlan.customerName}</h3>
              <button onClick={() => setSelectedPlan(null)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inner dynamic milestones fields scheduler (Unlimited Entries!) */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-sm bg-white/60 custom-scrollbar">

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/80 p-5 rounded-2xl border border-white shadow-sm">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block font-bold text-xs mb-1">الحجم الكلي للفاتورة:</span>
                  <span className="font-black text-slate-900 font-mono tracking-tighter">{formatIQD(selectedPlan.totalAmount)}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block font-bold text-xs mb-1">المقدمة المدفوعة:</span>
                  <span className="font-black text-emerald-700 font-mono tracking-tighter">{formatIQD(selectedPlan.downPayment)}</span>
                </div>
                <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-200">
                  <span className="text-rose-700 block font-bold text-xs mb-1">المتبقي للجدولة:</span>
                  <span className="font-black text-rose-800 font-mono tracking-tighter">{formatIQD(selectedPlan.totalAmount - selectedPlan.downPayment)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/50 pb-3 gap-3">
                <h4 className="font-black text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 bg-white/80 rounded border border-slate-200/50"><Clock className="w-4 h-4 text-slate-500"/></div>
                  تفصيل وجدولة القوائم ({installmentsEditList.length} مستحق)
                </h4>
                <button
                  onClick={addNewMilestoneRow}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> قسط فرعي جديد
                </button>
              </div>

              {/* Grid milestone items */}
              <div className="space-y-4">
                {installmentsEditList.length === 0 ? (
                  <div className="text-center py-12 bg-white/50 border border-white rounded-2xl shadow-inner text-slate-400 font-bold">
                    لا يوجد أقساط مجدولة، اضغط على قسط فرعي جديد لإدراج فترات السداد.
                  </div>
                ) : (
                  installmentsEditList.map((m, mIdx) => (
                    <div key={m.id} className="flex flex-col md:flex-row md:items-center bg-white p-4 rounded-2xl border border-white shadow-sm gap-4 transition-all hover:shadow-md hover:border-amber-200">
                      <span className="font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shrink-0 text-xs">قسط {mIdx + 1}</span>

                      {/* Amount input */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1.5">المستحق بالدينار:</label>
                          <input
                            type="number"
                            value={m.amount}
                            onChange={(e) => {
                              const list = [...installmentsEditList];
                              list[mIdx].amount = parseFloat(e.target.value) || 0;
                              setInstallmentsEditList(list);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-mono font-black focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                          />
                        </div>

                        {/* Due Date */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1.5">تاريخ الاستحقاق:</label>
                          <input
                            type="date"
                            value={m.dueDate}
                            onChange={(e) => {
                              const list = [...installmentsEditList];
                              list[mIdx].dueDate = e.target.value;
                              setInstallmentsEditList(list);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                          />
                        </div>
                      </div>

                      {/* State switch */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {m.status === 'paid' ? (
                          <button
                            type="button"
                            onClick={() => toggleMilestonePaidState(m.id, false)}
                            className="px-4 py-2 bg-emerald-50 font-black hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 text-xs shadow-sm transition-colors flex-1 md:flex-none text-center"
                          >
                            مؤكد السداد
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleMilestonePaidState(m.id, true)}
                            className="px-4 py-2 bg-rose-50 text-rose-700 font-bold hover:bg-rose-500 hover:text-white rounded-xl border border-rose-200 text-xs shadow-sm transition-colors flex-1 md:flex-none text-center"
                          >
                            تأشير التسديد
                          </button>
                        )}

                        {/* Delete milestone row helper */}
                        <button
                          type="button"
                          onClick={() => removeMilestoneRow(m.id)}
                          className="p-2 bg-slate-50 hover:bg-rose-500 text-slate-400 hover:text-white rounded-xl border border-slate-200 shadow-sm transition-colors"
                          title="حذف هذا الحقل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>

              {/* Plan notes */}
              <div className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm mt-6">
                <label className="block font-black text-slate-800 mb-2">تعقيب خطة الأقساط والملاحظات:</label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-inner custom-scrollbar h-20 text-sm"
                  placeholder="ملاحظات تظهر الفاتورة والتقسيط..."
                />
              </div>

            </div>

            <div className="p-5 bg-white/80 border-t border-slate-200 shrink-0 flex gap-3 justify-end backdrop-blur-md">
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={handleUpdatePaymentsList}
                disabled={actionLoading}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-950 text-white text-sm font-black rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                {actionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4"/>
                    <span>حفظ التعديلات وجدولة الذمم</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}



    </div>
  );
}

