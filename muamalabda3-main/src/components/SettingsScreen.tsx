/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import {
  Settings, Save, Globe, Phone, Mail, FileText, CheckCircle2, RotateCcw,
  Building, MapPin, MessageSquare, ShieldAlert
} from 'lucide-react';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<any>({
    companyName: 'أنوار الإبداع للطاقة المتجددة',
    companyPhone: '07712345678',
    companyAddress: 'بغداد، العراق',
    currency: 'IQD',
    invoiceTemplate: '',
    installmentReminderTemplate: ''
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      setSettings(res);
    } catch (err) {
      toast.error('فشل في تحميل إعدادات النظام');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.updateSettings(settings);
      toast.success('تم حفظ إعدادات الشركة وتوجيه رسائل معالجة واتساب بنجاح!');
      // Assuming api.updateSettings returns updated or doesn't change much
      // loadSettingsData(); // no need to refetch if not changing anything from server we don't know
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ في عملية الحفظ');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative z-10 max-w-5xl mx-auto pb-12">
      
      {/* Upper header */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl flex items-center justify-center shadow-lg shadow-slate-400/30 liquid-icon-wrapper shrink-0">
            <Settings className="text-white w-8 h-8 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">تهيئة الإعدادات العامة وقوالب الاتصال</h1>
            <p className="text-slate-500 text-sm mt-1.5 font-medium">تحديد المرجعيات اللوجستية للشركة، ضبط فئات العملة، وتخطيط رسائل المشتركين التلقائية.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm font-bold flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري تحميل إعدادات النظام...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Company Profile Info */}
          <div className="glass-card p-6 md:p-8 rounded-[2.5rem] shadow-lg border border-white/80 hover:shadow-xl transition-shadow">
            <h3 className="font-black text-base text-slate-800 border-b border-white/60 pb-4 mb-6 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-500" />
              الملف التعريفي والختم للمستندات والفواتير
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              
              <div>
                <label className="block text-slate-700 font-black mb-2 flex items-center gap-1.5">اسم الشركة الرسمي الشاخص *</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none shadow-sm transition-all"
                  placeholder="مثال: شركة أنوار الإبداع للطاقة البديلة"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-black mb-2 flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> رقم هاتف تجهيز الاتصال الموحد *</label>
                <input
                  type="text"
                  value={settings.companyPhone}
                  onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 font-mono font-bold text-left focus:ring-2 focus:ring-indigo-500/50 focus:outline-none shadow-sm transition-all"
                  dir="ltr"
                  placeholder="077XXXXXXXX"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-black mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> عنوان المقر أو الفرع الرئيسي بالتفصيل</label>
                <input
                  type="text"
                  value={settings.companyAddress}
                  onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none shadow-sm transition-all"
                  placeholder="بغداد - شارع الصناعة - عمارة الطاقة الشمسية..."
                />
              </div>

            </div>
          </div>

          {/* Section 2: WhatsApp Auto Template Configurations */}
          <div className="glass-card p-6 md:p-8 rounded-[2.5rem] shadow-lg border border-white/80 hover:shadow-xl transition-shadow">
            <h3 className="font-black text-base text-slate-800 border-b border-white/60 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-emerald-500" /> قوالب الرسائل والنصوص البرمجية التلقائية (WhatsApp)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200 shadow-sm flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> إرسال واصل كليا</span>
            </h3>

            <div className="space-y-8 text-sm">
              <div className="bg-white/40 p-5 rounded-2xl border border-white shadow-inner">
                <label className="block text-slate-800 font-black mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" /> صيغة قالب إرسال الفاتورة للعميل:
                </label>
                <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl mb-3 flex flex-wrap gap-2 text-xs">
                  <span className="font-bold text-slate-500 shrink-0">المتغيرات المتاحة:</span>
                  <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">{"{customer_name}"}</code>
                  <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">{"{invoice_number}"}</code>
                  <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">{"{invoice_amount}"}</code>
                  <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">{"{remaining_amount}"}</code>
                  <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">{"{invoice_date}"}</code>
                  <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">{"{items_details}"}</code>
                </div>
                <textarea
                  value={settings.invoiceTemplate}
                  onChange={(e) => setSettings({ ...settings, invoiceTemplate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-4 font-semibold h-32 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none shadow-sm transition-all resize-none"
                  placeholder="تخطيط رسالة الفواتير..."
                />
              </div>

              <div className="bg-white/40 p-5 rounded-2xl border border-white shadow-inner">
                <label className="block text-slate-800 font-black mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" /> قالب إشعارات الأقساط والإنذار بالحلول السداد:
                </label>
                <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl mb-3 flex flex-wrap gap-2 text-xs">
                  <span className="font-bold text-slate-500 shrink-0">المتغيرات المتاحة:</span>
                  <code className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-mono font-bold">{"{customer_name}"}</code>
                  <code className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-mono font-bold">{"{invoice_number}"}</code>
                  <code className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-mono font-bold">{"{remaining_amount}"}</code>
                  <code className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-mono font-bold">{"{due_date}"}</code>
                </div>
                <textarea
                  value={settings.installmentReminderTemplate}
                  onChange={(e) => setSettings({ ...settings, installmentReminderTemplate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-4 font-semibold h-32 focus:ring-2 focus:ring-amber-500/50 focus:outline-none shadow-sm transition-all resize-none"
                  placeholder="تخطيط رسائل التنبيه والإنذار بالدفع..."
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="glass-card p-6 rounded-[2rem] shadow-md border border-white/80 flex justify-end">
            <button
              type="submit"
              disabled={actionLoading}
              className="px-8 py-4 bg-slate-900 hover:bg-slate-950 text-white font-black text-sm rounded-2xl flex items-center gap-3 shadow-xl cursor-pointer transition-all disabled:opacity-50 active:scale-95 group"
            >
              {actionLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                  <span>جاري حفظ الإعدادات...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                  حفظ وتكامل إعدادات النظام الكلي
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
